import httpx
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime

from app.schemas.ais import (
    VesselIdentity, 
    GFWPresenceRecord, 
    GFWEvent, 
    GFWAISProvenance,
    FleetVessel,
    FleetResponse,
    VesselDetailResponse,
    AISProvenance
)
from app.services.ais_service import AISProvider
from app.core.config import settings

logger = logging.getLogger(__name__)


class GFWAISProvider(AISProvider):
    """
    Global Fishing Watch AIS Provider.
    
    IMPORTANT: GFW does NOT provide raw, high-frequency AIS tracks. 
    It provides AIS-derived aggregated vessel presence (~1 position per hour) 
    and vessel events (gaps, encounters, port visits).
    
    This provider implements the AISProvider interface structurally, but 
    raises NotImplementedError for high-frequency track retrieval to maintain 
    scientific honesty.
    """
    def __init__(self, token: Optional[str] = None):
        self.token = token if token is not None else settings.GFW_API_TOKEN
        self.base_url = "https://gateway.api.globalfishingwatch.org/v3"
        self.dataset = "public-global-presence:latest"

    @property
    def is_configured(self) -> bool:
        return bool(self.token and self.token.strip())

    def __repr__(self) -> str:
        return f"<GFWAISProvider configured={self.is_configured} base_url='{self.base_url}'>"
        
    async def fetch_raw_positions(self, min_lat: float, min_lon: float, max_lat: float, max_lon: float,
                                  start_time: datetime, end_time: datetime) -> List[Any]:
        """
        DO NOT USE. GFW does not provide raw AIS tracks.
        Use search_vessel_presence() instead for candidate filtering.
        """
        raise NotImplementedError(
            "GFW does not provide raw high-frequency AIS tracks. "
            "Use search_vessel_presence() for presence-based candidate filtering."
        )

    async def get_vessel_identities(self, mmsis: List[str]) -> List[VesselIdentity]:
        """
        Resolve MMSIs to GFW vessel identities.
        """
        if not self.token:
            raise RuntimeError("GFW_API_TOKEN is not configured. GFW services are unavailable.")
            
        identities = []
        headers = {"Authorization": f"Bearer {self.token}"}
        
        async with httpx.AsyncClient() as client:
            for mmsi in mmsis:
                try:
                    # GFW Search API requires querying by MMSI
                    # Example query: /vessels/search?query=mmsi:123456789
                    search_url = f"{self.base_url}/vessels/search"
                    params = {"query": f"mmsi:{mmsi}"}
                    
                    resp = await client.get(search_url, headers=headers, params=params, timeout=10.0)
                    resp.raise_for_status()
                    data = resp.json()
                    
                    entries = data.get("entries", [])
                    if entries:
                        # Take the best match
                        match = entries[0]
                        identities.append(VesselIdentity(
                            mmsi=mmsi,
                            imo=match.get("imo"),
                            name=match.get("shipname"),
                            vessel_type=match.get("vesselType"),
                            flag=match.get("flag")
                        ))
                except Exception as e:
                    logger.error("Failed to fetch GFW identity for MMSI %s: %s", mmsi, type(e).__name__)
                    
        return identities

    async def search_vessel_presence(
        self, 
        min_lon: float, 
        min_lat: float, 
        max_lon: float, 
        max_lat: float,
        start_time: datetime, 
        end_time: datetime
    ) -> Tuple[List[GFWPresenceRecord], GFWAISProvenance]:
        """
        Queries GFW 4Wings API for vessel presence in a bounding box.
        Resolution is approximately 1 position per hour per vessel.
        """
        provenance = GFWAISProvenance(
            api_endpoint=f"{self.base_url}/4wings",
            requested_bbox=f"{min_lon},{min_lat},{max_lon},{max_lat}",
            requested_time_range=f"{start_time.isoformat()}/{end_time.isoformat()}",
            retrieval_time=datetime.utcnow()
        )
        
        if not self.token:
            raise RuntimeError("GFW_API_TOKEN is not configured. GFW services are unavailable.")
            
        # In a real implementation, this would call the 4Wings reports API.
        # However, 4Wings requires setting up a report job and downloading CSV/JSON.
        # For Phase 16A feasibility, we mock the GFW response structure if token is valid but we aren't doing a real job loop.
        # We will assume a future implementation handles the async report polling.
        
        records: List[GFWPresenceRecord] = []
        # TODO: Implement actual 4Wings job creation and polling here
        logger.info("GFW 4Wings API implementation is a stub for Phase 16A.")
        
        return records, provenance

    async def get_vessel_events(
        self, 
        gfw_vessel_id: str, 
        start_time: datetime, 
        end_time: datetime
    ) -> List[GFWEvent]:
        """
        Queries GFW Events API for encounters, loitering, and AIS gaps.
        Preserves standard event types while attaching descriptive terminology in details.
        """
        if not self.token:
            raise RuntimeError("GFW_API_TOKEN is not configured. GFW services are unavailable.")
            
        events: List[GFWEvent] = []
        headers = {"Authorization": f"Bearer {self.token}"}
        
        url = f"{self.base_url}/events"
        params: Dict[str, Any] = {
            "datasets[0]": "public-global-gaps-events:latest",
            "datasets[1]": "public-global-encounters-events:latest",
            "datasets[2]": "public-global-loitering-events:latest",
            "vessels[0]": gfw_vessel_id,
            "start-date": start_time.strftime("%Y-%m-%d"),
            "end-date": end_time.strftime("%Y-%m-%d"),
            "limit": 50,
            "offset": 0
        }
        
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(url, headers=headers, params=params, timeout=12.0)
                if resp.status_code == 200:
                    data = resp.json()
                    for item in data.get("entries", []):
                        st = item.get("start")
                        et = item.get("end")
                        pos = item.get("position", {})
                        
                        raw_type = item.get("type", "unknown")
                        if raw_type == "gap":
                            descriptive_type = "AIS transmission interruption"
                        elif raw_type == "encounter":
                            descriptive_type = "reported spatiotemporal encounter"
                        elif raw_type == "loitering":
                            descriptive_type = "reported loitering event"
                        else:
                            descriptive_type = raw_type

                        event = GFWEvent(
                            event_id=item.get("id") or f"gfw_ev_{len(events)}",
                            event_type=raw_type,
                            start_time=datetime.fromisoformat(st.replace("Z", "+00:00")).replace(tzinfo=None) if st else datetime.utcnow(),
                            end_time=datetime.fromisoformat(et.replace("Z", "+00:00")).replace(tzinfo=None) if et else datetime.utcnow(),
                            start_lon=pos.get("lon"),
                            start_lat=pos.get("lat"),
                            end_lon=pos.get("lon"),
                            end_lat=pos.get("lat"),
                            vessel_id=gfw_vessel_id,
                            details={
                                "raw_type": raw_type,
                                "descriptive_type": descriptive_type,
                                "regions": item.get("regions"),
                                "distances": item.get("distances"),
                                "vessel": item.get("vessel")
                            }
                        )
                        events.append(event)
                else:
                    logger.warning("GFW events API returned HTTP %s for vessel %s", resp.status_code, gfw_vessel_id)
        except Exception as e:
            logger.warning("Failed to fetch GFW events for vessel %s: %s", gfw_vessel_id, type(e).__name__)
            
        return events

    def _map_entry_to_vessel(self, entry: Dict[str, Any], fallback_id: str = "") -> FleetVessel:
        self_reported = entry.get("selfReportedInfo", [{}])[0] if isinstance(entry.get("selfReportedInfo"), list) and entry.get("selfReportedInfo") else {}
        registry = entry.get("registryInfo", [{}])[0] if isinstance(entry.get("registryInfo"), list) and entry.get("registryInfo") else {}
        combined = entry.get("combinedSourcesInfo", [{}])[0] if isinstance(entry.get("combinedSourcesInfo"), list) and entry.get("combinedSourcesInfo") else {}

        v_id = str(self_reported.get("id") or combined.get("vesselId") or entry.get("id") or entry.get("mmsi") or fallback_id or "gfw-vessel")
        mmsi = str(self_reported.get("ssvid") or registry.get("ssvid") or registry.get("mmsi") or entry.get("mmsi") or "") or None
        imo = str(self_reported.get("imo") or registry.get("imo") or entry.get("imo") or "") or None
        name = self_reported.get("shipname") or registry.get("shipname") or entry.get("shipname") or entry.get("name") or "UNKNOWN VESSEL"

        vessel_type = None
        if combined.get("shiptypes"):
            vessel_type = combined["shiptypes"][0].get("name")
        if not vessel_type or vessel_type in ["NA", "OTHER"]:
            vessel_type = registry.get("vesselType") or entry.get("vesselType") or "Commercial Vessel"

        flag = self_reported.get("flag") or registry.get("flag") or entry.get("flag") or "UNKNOWN"

        last_pos = entry.get("lastPosition") or entry.get("position") or {}
        lat = last_pos.get("lat")
        lon = last_pos.get("lon")
        ts_str = self_reported.get("transmissionDateTo") or last_pos.get("timestamp") or entry.get("lastTimestamp")
        last_ts = None
        if ts_str:
            try:
                last_ts = datetime.fromisoformat(str(ts_str).replace("Z", "+00:00")).replace(tzinfo=None)
            except Exception:
                pass

        return FleetVessel(
            id=v_id,
            mmsi=mmsi,
            imo=imo,
            name=name,
            vessel_type=vessel_type,
            flag=flag,
            last_position_lat=lat,
            last_position_lon=lon,
            last_timestamp=last_ts,
            status="ACTIVE" if (lat is not None or last_ts is not None) else "UNKNOWN",
            risk_level="NOT_ASSESSED",
            provider="Global Fishing Watch",
            provenance=AISProvenance(
                source="Global Fishing Watch",
                mode="LIVE",
                retrieval_time=datetime.utcnow(),
                limitations="GFW vessel search registry record. Position reflects latest available presence report, not continuous real-time track."
            )
        )

    async def get_vessel_by_id(self, gfw_vessel_id: str) -> Optional[FleetVessel]:
        """
        Query real vessel details from Global Fishing Watch by internal GFW vessel ID.
        """
        if not self.token:
            return None

        headers = {"Authorization": f"Bearer {self.token}"}
        url = f"{self.base_url}/vessels/{gfw_vessel_id}"
        params = {"dataset": "public-global-vessel-identity:latest"}
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(url, headers=headers, params=params, timeout=12.0)
                if resp.status_code == 200:
                    return self._map_entry_to_vessel(resp.json(), fallback_id=gfw_vessel_id)
                elif resp.status_code == 404:
                    search_resp = await self.get_fleet(query=f"id:{gfw_vessel_id}", limit=1)
                    if search_resp.vessels:
                        return search_resp.vessels[0]
        except Exception as e:
            logger.warning("Failed to fetch vessel by GFW ID %s: %s", gfw_vessel_id, type(e).__name__)
        return None

    async def get_fleet(self, query: Optional[str] = None, limit: int = 50, offset: int = 0) -> FleetResponse:
        """
        Query real Global Fishing Watch vessels when configured.
        Returns UNAVAILABLE truthfully if GFW_API_TOKEN is missing or API call fails.
        """
        if not self.token:
            return FleetResponse(
                provider="Global Fishing Watch",
                status="UNAVAILABLE",
                reason="GFW_API_TOKEN is not configured in backend environment. Live global AIS fleet tracking is unavailable.",
                retrieved_at=datetime.utcnow(),
                total=0,
                vessels=[]
            )

        search_url = f"{self.base_url}/vessels/search"
        headers = {"Authorization": f"Bearer {self.token}"}
        params: Dict[str, Any] = {
            "query": query.strip() if query and query.strip() else "tanker",
            "datasets[0]": "public-global-vessel-identity:latest",
            "limit": min(max(limit, 1), 50)
        }
        if offset > 0:
            params["offset"] = offset

        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(search_url, headers=headers, params=params, timeout=12.0)
                resp.raise_for_status()
                data = resp.json()

                entries = data.get("entries", [])
                vessels: List[FleetVessel] = [
                    self._map_entry_to_vessel(entry, fallback_id=f"gfw-{i+1}")
                    for i, entry in enumerate(entries)
                ]

                return FleetResponse(
                    provider="Global Fishing Watch",
                    status="LIVE" if vessels else "EMPTY",
                    reason=None if vessels else "No vessels matched the specified query.",
                    retrieved_at=datetime.utcnow(),
                    total=data.get("total", len(vessels)),
                    vessels=vessels
                )
        except httpx.HTTPStatusError as e:
            code = e.response.status_code
            logger.warning("GFW API returned HTTP status error %s", code)
            if code == 401:
                reason = "Global Fishing Watch authentication failed: invalid or expired GFW_API_TOKEN"
            elif code == 403:
                reason = "Global Fishing Watch access forbidden: insufficient API permissions or terms unaccepted"
            elif code == 404:
                reason = "Global Fishing Watch endpoint or requested resource not found"
            elif code == 422:
                reason = "Global Fishing Watch query validation error: invalid search parameter"
            elif code == 429:
                reason = "Global Fishing Watch rate limit reached: too many requests, please retry later"
            elif code >= 500:
                reason = f"Global Fishing Watch upstream server error: HTTP {code}"
            else:
                reason = f"Global Fishing Watch API error: HTTP {code}"
            return FleetResponse(
                provider="Global Fishing Watch",
                status="UNAVAILABLE",
                reason=reason,
                retrieved_at=datetime.utcnow(),
                total=0,
                vessels=[]
            )
        except httpx.TimeoutException:
            logger.warning("GFW API query timed out")
            return FleetResponse(
                provider="Global Fishing Watch",
                status="UNAVAILABLE",
                reason="Global Fishing Watch connection timed out",
                retrieved_at=datetime.utcnow(),
                total=0,
                vessels=[]
            )
        except Exception as e:
            logger.warning("GFW API query failed: %s", type(e).__name__)
            return FleetResponse(
                provider="Global Fishing Watch",
                status="UNAVAILABLE",
                reason=f"Global Fishing Watch connection failed: {type(e).__name__}",
                retrieved_at=datetime.utcnow(),
                total=0,
                vessels=[]
            )

    async def get_vessel_by_mmsi(self, mmsi: str) -> VesselDetailResponse:
        """
        Query real vessel details from Global Fishing Watch by MMSI.
        """
        if not self.token:
            return VesselDetailResponse(
                mmsi=mmsi,
                provider="Global Fishing Watch",
                status="UNAVAILABLE",
                reason="GFW_API_TOKEN is not configured in backend environment. Live global AIS vessel lookup is unavailable.",
                vessel=None,
                historical_track_available=False,
                historical_track_message="Historical track unavailable from current provider."
            )

        fleet_resp = await self.get_fleet(query=f"mmsi:{mmsi}", limit=5)
        if fleet_resp.status != "LIVE":
            return VesselDetailResponse(
                mmsi=mmsi,
                provider="Global Fishing Watch",
                status=fleet_resp.status,
                reason=fleet_resp.reason,
                vessel=None,
                historical_track_available=False,
                historical_track_message="Historical track unavailable from current provider."
            )

        matched = next((v for v in fleet_resp.vessels if v.mmsi == mmsi), None)
        if not matched and fleet_resp.vessels:
            matched = fleet_resp.vessels[0]

        if not matched:
            return VesselDetailResponse(
                mmsi=mmsi,
                provider="Global Fishing Watch",
                status="NOT_FOUND",
                reason=f"No vessel with MMSI {mmsi} found in Global Fishing Watch registry.",
                vessel=None,
                historical_track_available=False,
                historical_track_message="Historical track unavailable from current provider."
            )

        return VesselDetailResponse(
            mmsi=mmsi,
            provider="Global Fishing Watch",
            status="LIVE",
            vessel=matched,
            historical_track_available=False,
            historical_track_message="Historical track unavailable from current provider. High-frequency continuous AIS tracks require raw terrestrial/satellite AIS feeds.",
            retrieved_at=datetime.utcnow()
        )




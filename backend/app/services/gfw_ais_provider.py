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
    def __init__(self, token: str = settings.GFW_API_TOKEN):
        self.token = token
        self.base_url = "https://gateway.api.globalfishingwatch.org/v3"
        self.dataset = "public-global-presence:latest"
        
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
                    logger.error(f"Failed to fetch GFW identity for MMSI {mmsi}: {str(e)}")
                    
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
        Queries GFW Events API for encounters, port visits, loitering, and AIS gaps.
        """
        if not self.token:
            raise RuntimeError("GFW_API_TOKEN is not configured. GFW services are unavailable.")
            
        events = []
        headers = {"Authorization": f"Bearer {self.token}"}
        
        url = f"{self.base_url}/events"
        params: Dict[str, str | int] = {
            "vessels": gfw_vessel_id,
            "start-date": start_time.strftime("%Y-%m-%d"),
            "end-date": end_time.strftime("%Y-%m-%d"),
            "limit": 50
        }
        
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(url, headers=headers, params=params, timeout=10.0)
                resp.raise_for_status()
                data = resp.json()
                
                for item in data.get("entries", []):
                    # GFW timestamps are ISO8601
                    st = item.get("start")
                    et = item.get("end")
                    pos = item.get("position", {})
                    
                    event = GFWEvent(
                        event_id=item.get("id"),
                        event_type=item.get("type"),
                        start_time=datetime.fromisoformat(st.replace("Z", "+00:00")).replace(tzinfo=None) if st else datetime.utcnow(),
                        end_time=datetime.fromisoformat(et.replace("Z", "+00:00")).replace(tzinfo=None) if et else datetime.utcnow(),
                        start_lon=pos.get("lon"),
                        start_lat=pos.get("lat"),
                        end_lon=pos.get("lon"),
                        end_lat=pos.get("lat"),
                        vessel_id=gfw_vessel_id,
                        details={
                            "regions": item.get("regions"),
                            "event_info": item.get("event_info")
                        }
                    )
                    events.append(event)
        except Exception as e:
            logger.error(f"Failed to fetch GFW events for vessel {gfw_vessel_id}: {str(e)}")
            
        return events

    async def get_fleet(self, query: Optional[str] = None, limit: int = 50) -> FleetResponse:
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
            "limit": min(limit, 100)
        }

        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(search_url, headers=headers, params=params, timeout=12.0)
                resp.raise_for_status()
                data = resp.json()

                entries = data.get("entries", [])
                vessels: List[FleetVessel] = []
                for entry in entries:
                    v_id = str(entry.get("id") or entry.get("mmsi") or f"gfw-{len(vessels)+1}")
                    mmsi = str(entry.get("mmsi")) if entry.get("mmsi") else None
                    imo = str(entry.get("imo")) if entry.get("imo") else None
                    name = entry.get("shipname") or entry.get("name")
                    vessel_type = entry.get("vesselType") or entry.get("geartype")
                    flag = entry.get("flag")

                    last_pos = entry.get("lastPosition") or entry.get("position") or {}
                    lat = last_pos.get("lat")
                    lon = last_pos.get("lon")
                    ts_str = last_pos.get("timestamp") or entry.get("lastTimestamp")
                    last_ts = None
                    if ts_str:
                        try:
                            last_ts = datetime.fromisoformat(str(ts_str).replace("Z", "+00:00")).replace(tzinfo=None)
                        except Exception:
                            pass

                    vessels.append(FleetVessel(
                        id=v_id,
                        mmsi=mmsi,
                        imo=imo,
                        name=name,
                        vessel_type=vessel_type,
                        flag=flag,
                        last_position_lat=lat,
                        last_position_lon=lon,
                        last_timestamp=last_ts,
                        status="ACTIVE" if lat is not None else "UNKNOWN",
                        risk_level="NOT_ASSESSED",
                        provider="Global Fishing Watch",
                        provenance=AISProvenance(
                            source="Global Fishing Watch",
                            mode="LIVE",
                            retrieval_time=datetime.utcnow(),
                            limitations="GFW vessel search registry record. Position reflects latest available presence report, not continuous real-time track."
                        )
                    ))

                return FleetResponse(
                    provider="Global Fishing Watch",
                    status="LIVE" if vessels else "EMPTY",
                    reason=None if vessels else "No vessels matched the specified query.",
                    retrieved_at=datetime.utcnow(),
                    total=len(vessels),
                    vessels=vessels
                )
        except httpx.HTTPStatusError as e:
            logger.warning("GFW API returned HTTP status error %s", e.response.status_code)
            return FleetResponse(
                provider="Global Fishing Watch",
                status="UNAVAILABLE",
                reason=f"Global Fishing Watch API error: HTTP {e.response.status_code}",
                retrieved_at=datetime.utcnow(),
                total=0,
                vessels=[]
            )
        except Exception as e:
            logger.warning("GFW API query failed: %s", type(e).__name__)
            return FleetResponse(
                provider="Global Fishing Watch",
                status="UNAVAILABLE",
                reason="Global Fishing Watch connection failed",
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




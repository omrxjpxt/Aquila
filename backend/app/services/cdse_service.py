import httpx
from datetime import datetime, timedelta
import logging
from typing import List, Optional, Tuple
from app.core.config import settings
from app.schemas.satellite import SatelliteSearchResult

logger = logging.getLogger(__name__)

class CDSEService:
    def __init__(self):
        self.client_id = settings.CDSE_CLIENT_ID
        self.client_secret = settings.CDSE_CLIENT_SECRET
        self.token_url = settings.CDSE_TOKEN_URL
        self.catalog_url = "https://sh.dataspace.copernicus.eu/catalog/v1/search"
        
        self._access_token: Optional[str] = None
        self._token_expiry: Optional[datetime] = None

    async def _get_access_token(self) -> str:
        """Gets a valid OAuth access token, reusing the cached one if still valid."""
        if self._access_token and self._token_expiry and datetime.utcnow() < self._token_expiry:
            return self._access_token

        if not self.client_id or not self.client_secret:
            raise ValueError("CDSE credentials are not configured.")

        data = {
            "grant_type": "client_credentials",
            "client_id": self.client_id,
            "client_secret": self.client_secret
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(self.token_url, data=data)
            
            if response.status_code != 200:
                logger.error(f"CDSE authentication failed: {response.status_code}")
                raise RuntimeError("Failed to authenticate with CDSE")
                
            json_resp = response.json()
            self._access_token = json_resp["access_token"]
            expires_in = json_resp.get("expires_in", 600)
            # Subtract 60 seconds for safety margin
            self._token_expiry = datetime.utcnow() + timedelta(seconds=expires_in - 60)
            
            return self._access_token

    def _parse_iso_date(self, dt_str: str) -> datetime:
        # Python's fromisoformat in 3.10+ handles 'Z', but for compatibility:
        if dt_str.endswith("Z"):
            dt_str = dt_str[:-1] + "+00:00"
        return datetime.fromisoformat(dt_str)

    async def search_scenes(
        self,
        bbox: Tuple[float, float, float, float],
        start_datetime: datetime,
        end_datetime: datetime,
        limit: int = 10
    ) -> List[SatelliteSearchResult]:
        """Searches CDSE Sentinel Hub Catalog API for Sentinel-1 scenes."""
        token = await self._get_access_token()
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # STAC API requires datetime as string: YYYY-MM-DDThh:mm:ssZ/YYYY-MM-DDThh:mm:ssZ
        start_str = start_datetime.strftime("%Y-%m-%dT%H:%M:%SZ")
        end_str = end_datetime.strftime("%Y-%m-%dT%H:%M:%SZ")
        
        payload = {
            "collections": ["sentinel-1-grd"],
            "bbox": list(bbox),
            "datetime": f"{start_str}/{end_str}",
            "limit": limit
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(self.catalog_url, headers=headers, json=payload)
            
            if response.status_code != 200:
                logger.error(f"CDSE search failed: {response.status_code}")
                raise RuntimeError(f"CDSE Catalog API error: HTTP {response.status_code}")
                
            data = response.json()
            features = data.get("features", [])
            
            results = []
            for item in features:
                props = item.get("properties", {})
                
                # Try to find a thumbnail link
                thumbnail_url = None
                for asset_key, asset in item.get("assets", {}).items():
                    if not asset:
                        continue
                    # sometimes the key is 'thumbnail' or roles contains 'thumbnail'
                    if "thumbnail" in asset_key.lower() or "thumbnail" in asset.get("roles", []):
                        thumbnail_url = asset.get("href")
                        break
                
                dt_str = props.get("datetime")
                dt = self._parse_iso_date(dt_str) if dt_str else datetime.utcnow()
                
                # handle polarization list or string
                pol = props.get("s1:polarization", props.get("polarization"))
                if isinstance(pol, list):
                    pol = ",".join(pol)
                    
                result = SatelliteSearchResult(
                    id=item.get("id", "unknown"),
                    source="CDSE",
                    provenance="LIVE",
                    collection="sentinel-1-grd",
                    acquisition_time=dt,
                    bbox=tuple(item.get("bbox", [0, 0, 0, 0])),
                    geometry=item.get("geometry", {}),
                    platform=props.get("platform", props.get("eo:platform")),
                    orbit_direction=props.get("sat:orbit_state", props.get("orbit_direction")),
                    polarization=str(pol) if pol else None,
                    instrument_mode=props.get("s1:instrument_mode", props.get("instrument_mode")),
                    thumbnail_url=thumbnail_url
                )
                results.append(result)
                
            return results

    async def retrieve_raster(
        self,
        bbox: Tuple[float, float, float, float],
        scene: SatelliteSearchResult,
        width: Optional[int] = None,
        height: Optional[int] = None
    ) -> str:
        """
        Retrieves a float32 GeoTIFF from CDSE Sentinel Hub Process API.
        The Process API selects imagery by collection, time interval, and AOI rather than directly by STAC scene ID.
        """
        token = await self._get_access_token()
        
        process_url = "https://sh.dataspace.copernicus.eu/process/v1"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "image/tiff"
        }
        
        req_width = width or 1000
        req_height = height or 1000
        
        if req_width * req_height > 2500 * 2500:
            raise ValueError(f"Requested AOI is too large: {req_width}x{req_height}. Maximum allowed is 6,250,000 pixels.")
            
        pol = "VV"
        if scene.polarization:
            pol_upper = scene.polarization.upper()
            if "VV" in pol_upper or "DV" in pol_upper or "SV" in pol_upper:
                pol = "VV"
            elif "HH" in pol_upper or "DH" in pol_upper or "SH" in pol_upper:
                pol = "HH"
            else:
                raise ValueError(f"Unsupported polarization: {scene.polarization}")

        evalscript = f"""//VERSION=3
function setup() {{
  return {{
    input: ["{pol}", "dataMask"],
    output: {{ bands: 1, sampleType: "FLOAT32" }}
  }};
}}
function evaluatePixel(sample) {{
  if (sample.dataMask === 0) return [NaN];
  return [sample.{pol}];
}}
"""
        
        t_start = (scene.acquisition_time - timedelta(minutes=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
        t_end = (scene.acquisition_time + timedelta(minutes=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
        
        payload = {
            "input": {
                "bounds": {
                    "bbox": list(bbox),
                    "properties": {"crs": "http://www.opengis.net/def/crs/EPSG/0/4326"}
                },
                "data": [
                    {
                        "type": "sentinel-1-grd",
                        "dataFilter": {
                            "timeRange": {
                                "from": t_start,
                                "to": t_end
                            }
                        },
                        "processing": {
                            "backCoeff": "SIGMA0_ELLIPSOID",
                            "orthorectify": True
                        }
                    }
                ]
            },
            "output": {
                "width": req_width,
                "height": req_height,
                "responses": [
                    {
                        "identifier": "default",
                        "format": {
                            "type": "image/tiff"
                        }
                    }
                ]
            },
            "evalscript": evalscript
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(process_url, headers=headers, json=payload)
            
            if response.status_code != 200:
                logger.error(f"CDSE process failed: {response.status_code} - {response.text}")
                if response.status_code == 400:
                    raise ValueError(f"Process API validation error: {response.text}")
                elif response.status_code in (401, 403):
                    raise PermissionError(f"Process API authorization error: {response.status_code}")
                elif response.status_code == 429:
                    raise RuntimeError("Process API rate limit exceeded")
                else:
                    raise RuntimeError(f"Process API error: HTTP {response.status_code}")
                    
            import os
            os.makedirs("data/scenes", exist_ok=True)
            file_name = f"cdse_retrieval_{scene.id}_{int(datetime.utcnow().timestamp())}.tif"
            file_path = os.path.join("data/scenes", file_name)
            
            with open(file_path, "wb") as f:
                f.write(response.content)
                
            return file_path


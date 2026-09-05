import json
import csv
import os
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime, timezone
from pathlib import Path

from app.schemas.ais import AISPosition, VesselIdentity
from app.services.ais_service import AISProvider

class BYODAISProvider(AISProvider):
    """
    Provider that loads historical AIS data from a local JSON/CSV file.
    Used for investigator-supplied (BYOD) datasets.
    """
    
    def __init__(self, investigation_id: str):
        self.investigation_id = investigation_id
        # Define storage path
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.storage_path = os.path.join(base_dir, "data", "ais_imports", f"{investigation_id}_ais.json")
        self.provenance_mode = "USER_PROVIDED_AIS"

    async def fetch_raw_positions(self, min_lat: float, min_lon: float, max_lat: float, max_lon: float,
                                  start_time: datetime, end_time: datetime) -> List[AISPosition]:
        if not os.path.exists(self.storage_path):
            raise FileNotFoundError(f"No imported AIS data found for investigation {self.investigation_id}")
            
        with open(self.storage_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        positions = []
        for p_dict in data.get("positions", []):
            try:
                dt = datetime.fromisoformat(p_dict["timestamp"])
                lon = p_dict["longitude"]
                lat = p_dict["latitude"]
                
                # Spatial and temporal filter
                if not (min_lon <= lon <= max_lon and min_lat <= lat <= max_lat):
                    continue
                if not (start_time <= dt <= end_time):
                    continue
                    
                pos = AISPosition(
                    timestamp=dt,
                    lon=lon,
                    lat=lat,
                    speed_knots=p_dict.get("speed_knots", 0.0),
                    heading=p_dict.get("heading", 0.0),
                    quality="OBSERVED"
                )
                setattr(pos, 'mmsi', str(p_dict["mmsi"]))
                positions.append(pos)
            except (KeyError, ValueError):
                continue
                
        # Sort chronologically to ensure tracks are built correctly later
        positions.sort(key=lambda p: p.timestamp)
        return positions

    async def get_vessel_identities(self, mmsis: List[str]) -> List[VesselIdentity]:
        if not os.path.exists(self.storage_path):
            return []
            
        with open(self.storage_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        identities = []
        for v_dict in data.get("vessels", []):
            mmsi = str(v_dict["mmsi"])
            if mmsi in mmsis:
                identities.append(VesselIdentity(
                    mmsi=mmsi,
                    imo=v_dict.get("imo"),
                    name=v_dict.get("name"),
                    vessel_type=v_dict.get("vessel_type"),
                    flag=v_dict.get("flag")
                ))
        return identities

    @classmethod
    def import_dataset(cls, investigation_id: str, content: bytes, is_csv: bool, declared_source: Optional[str] = None) -> Dict[str, Any]:
        """
        Parses raw CSV or JSON bytes, normalizes, validates, and saves to local storage.
        """
        raw_records = []
        
        if is_csv:
            decoded = content.decode("utf-8")
            reader = csv.DictReader(decoded.splitlines())
            raw_records = list(reader)
        else:
            decoded = content.decode("utf-8")
            raw_records = json.loads(decoded)
            if isinstance(raw_records, dict) and "data" in raw_records:
                raw_records = raw_records["data"]
            elif not isinstance(raw_records, list):
                raw_records = [raw_records]

        positions_by_mmsi: Dict[str, Dict[str, Any]] = {}
        vessels_by_mmsi: Dict[str, Dict[str, Any]] = {}
        warnings = []
        errors = []
        
        # Alias mapping
        alias_map = {
            "lat": "latitude",
            "lon": "longitude",
            "time": "timestamp",
            "sog": "speed_knots",
            "speed": "speed_knots",
            "cog": "heading",
            "type": "vessel_type",
            "ship_type": "vessel_type"
        }
        
        for idx, row in enumerate(raw_records):
            # Normalize keys
            norm_row = {}
            for k, v in row.items():
                if k is None:
                    continue
                kl = k.lower().strip()
                kl = alias_map.get(kl, kl)
                norm_row[kl] = v
                
            # Validation
            if "mmsi" not in norm_row or not norm_row["mmsi"]:
                errors.append(f"Row {idx}: missing mmsi")
                continue
                
            mmsi = str(norm_row["mmsi"]).strip()
            if not mmsi.isdigit() or len(mmsi) != 9:
                errors.append(f"Row {idx}: invalid mmsi '{mmsi}'")
                continue
                
            try:
                lat = float(norm_row["latitude"])
                lon = float(norm_row["longitude"])
                if not (-90 <= lat <= 90):
                    raise ValueError("Latitude out of range")
                if not (-180 <= lon <= 180):
                    raise ValueError("Longitude out of range")
            except (KeyError, ValueError, TypeError) as e:
                errors.append(f"Row {idx}: invalid/missing coordinates. {e}")
                continue
                
            try:
                ts_str = str(norm_row["timestamp"]).strip().replace("Z", "+00:00")
                dt = datetime.fromisoformat(ts_str)
                # Normalize to UTC
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                else:
                    dt = dt.astimezone(timezone.utc)
            except (KeyError, ValueError, TypeError) as e:
                errors.append(f"Row {idx}: invalid/missing timestamp. {e}")
                continue
                
            # Parse optional
            speed = 0.0
            heading = 0.0
            try:
                if "speed_knots" in norm_row and norm_row["speed_knots"]:
                    speed = float(norm_row["speed_knots"])
                if "heading" in norm_row and norm_row["heading"]:
                    heading = float(norm_row["heading"])
            except ValueError:
                warnings.append(f"Row {idx}: non-numeric speed/heading ignored.")

            # Create position dict
            # Use timestamp ISO string as key to handle duplicates deterministically (keep first seen)
            ts_iso = dt.isoformat()
            if mmsi not in positions_by_mmsi:
                positions_by_mmsi[mmsi] = {}
                
            if ts_iso not in positions_by_mmsi[mmsi]:
                positions_by_mmsi[mmsi][ts_iso] = {
                    "mmsi": mmsi,
                    "timestamp": ts_iso,
                    "latitude": lat,
                    "longitude": lon,
                    "speed_knots": speed,
                    "heading": heading
                }
            
            # Identity
            if mmsi not in vessels_by_mmsi:
                vessels_by_mmsi[mmsi] = {
                    "mmsi": mmsi,
                    "imo": str(norm_row.get("imo", "")),
                    "name": str(norm_row.get("vessel_name", norm_row.get("name", ""))),
                    "vessel_type": str(norm_row.get("vessel_type", "")),
                    "flag": str(norm_row.get("flag", ""))
                }

        # Flatten and calculate coverage
        flat_positions: List[Dict[str, Any]] = []
        for m_dict in positions_by_mmsi.values():
            flat_positions.extend(m_dict.values())
            
        flat_vessels = list(vessels_by_mmsi.values())
        
        flat_positions.sort(key=lambda x: x["timestamp"])
        
        coverage_start = flat_positions[0]["timestamp"] if flat_positions else None
        coverage_end = flat_positions[-1]["timestamp"] if flat_positions else None
        
        # Save to file
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        storage_dir = os.path.join(base_dir, "data", "ais_imports")
        os.makedirs(storage_dir, exist_ok=True)
        storage_path = os.path.join(storage_dir, f"{investigation_id}_ais.json")
        
        out_data = {
            "investigation_id": investigation_id,
            "provenance": "USER_PROVIDED_AIS",
            "declared_source": declared_source,
            "import_timestamp": datetime.now(timezone.utc).isoformat(),
            "positions": flat_positions,
            "vessels": flat_vessels
        }
        
        with open(storage_path, "w", encoding="utf-8") as f:
            json.dump(out_data, f)
            
        return {
            "investigation_id": investigation_id,
            "provenance": "USER_PROVIDED_AIS",
            "declared_source": declared_source,
            "record_count": len(flat_positions),
            "vessel_count": len(flat_vessels),
            "coverage_start": coverage_start,
            "coverage_end": coverage_end,
            "validation_status": "SUCCESS" if not errors else ("PARTIAL" if flat_positions else "FAILED"),
            "warnings": warnings[:50],  # cap list
            "errors": errors[:50]
        }

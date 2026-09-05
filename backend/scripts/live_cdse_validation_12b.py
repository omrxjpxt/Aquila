import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.services.open_meteo_service import OpenMeteoEnvironmentalService

async def run_live_validation():
    print("--- Phase 12B Live Environmental Provider Validation ---")

    # Corsica test point from Phase 11F
    lat, lon = 42.25, 9.5
    target_time = datetime(2024, 5, 27, 17, 22, 35, tzinfo=timezone.utc)
    
    print(f"\nTarget Scene: 2024-05-27 17:22:35Z at [{lat}, {lon}]")
    print("\nInitializing Open-Meteo Environmental Service...")
    env_service = OpenMeteoEnvironmentalService()
    
    print("\n1. Retrieving Wind...")
    wind = await env_service.get_wind(lat, lon, target_time)
    
    print("\n2. Retrieving Current...")
    current = await env_service.get_current(lat, lon, target_time)
    
    print("\n===============================")
    print("LIVE VALIDATION RESULTS")
    print("===============================\n")
    
    print("WIND OBSERVATION:")
    print(f"  Status:       {wind.availability_status}")
    print(f"  Provider:     {wind.provider}")
    print(f"  Dataset:      {wind.dataset}")
    print(f"  Target Time:  {wind.requested_timestamp.isoformat() if wind.requested_timestamp else None}")
    print(f"  Obs Time:     {wind.timestamp.isoformat()}")
    print(f"  Time Offset:  {wind.time_offset_hours:.2f} hours" if wind.time_offset_hours is not None else "  Time Offset:  N/A")
    print(f"  Coordinates:  [{wind.returned_lat}, {wind.returned_lon}]")
    print(f"  Speed:        {wind.speed_m_s:.2f} m/s" if wind.speed_m_s is not None else "  Speed:        N/A")
    print(f"  Direction:    {wind.direction_deg:.1f}°" if wind.direction_deg is not None else "  Direction:    N/A")

    print("\nCURRENT OBSERVATION:")
    print(f"  Status:       {current.availability_status}")
    print(f"  Provider:     {current.provider}")
    print(f"  Dataset:      {current.dataset}")
    print(f"  Target Time:  {current.requested_timestamp.isoformat() if current.requested_timestamp else None}")
    print(f"  Obs Time:     {current.timestamp.isoformat()}")
    print(f"  Time Offset:  {current.time_offset_hours:.2f} hours" if current.time_offset_hours is not None else "  Time Offset:  N/A")
    print(f"  Coordinates:  [{current.returned_lat}, {current.returned_lon}]")
    print(f"  Speed:        {current.speed_m_s:.2f} m/s" if current.speed_m_s is not None else "  Speed:        N/A")
    print(f"  Direction:    {current.direction_deg:.1f}°" if current.direction_deg is not None else "  Direction:    N/A")

if __name__ == "__main__":
    asyncio.run(run_live_validation())

from datetime import datetime
from app.schemas.environment import (
    WindObservation,
    CurrentObservation,
    OpticalAvailability,
    OpticalAvailabilityStatus
)


class EnvironmentalDataService:
    """
    Interface for fetching environmental metocean data.
    """

    async def get_wind(self, lat: float, lon: float, time: datetime) -> WindObservation:
        raise NotImplementedError

    async def get_current(self, lat: float, lon: float, time: datetime) -> CurrentObservation:
        raise NotImplementedError

    async def get_optical_availability(self, lat: float, lon: float, time: datetime) -> OpticalAvailability:
        raise NotImplementedError


class MockEnvironmentalDataService(EnvironmentalDataService):
    """
    Deterministic mock provider for Phase 4D.
    Does not pretend to be real data.
    """

    def __init__(self, force_wind_speed: float = None):
        # Allow tests to inject a specific wind speed for edge case testing
        self.force_wind_speed = force_wind_speed

    async def get_wind(self, lat: float, lon: float, time: datetime) -> WindObservation:
        """
        Returns a deterministic mock wind observation.
        """
        speed = self.force_wind_speed if self.force_wind_speed is not None else 6.5

        return WindObservation(
            source="DEMO / MOCK Wind Provider",
            timestamp=time,
            resolution="0.25 deg, Mock",
            is_mock=True,
            speed_m_s=speed,
            direction_deg=275.0  # Coming from the West
        )

    async def get_current(self, lat: float, lon: float, time: datetime) -> CurrentObservation:
        """
        Returns a deterministic mock current observation.
        """
        return CurrentObservation(
            source="DEMO / MOCK Current Provider",
            timestamp=time,
            resolution="0.08 deg, Mock",
            is_mock=True,
            speed_m_s=0.35,
            direction_deg=120.0  # Going towards South-East
        )

    async def get_optical_availability(self, lat: float, lon: float, time: datetime) -> OpticalAvailability:
        """
        Returns a deterministic mock optical availability status (e.g., cloud obscured).
        """
        return OpticalAvailability(
            source="DEMO / MOCK Optical Provider",
            timestamp=time,
            resolution="10m, Mock",
            is_mock=True,
            status=OpticalAvailabilityStatus.CLOUD_OBSCURED
        )

import pytest
from datetime import datetime, timedelta
import httpx

from app.schemas.monitoring import MonitoringZone, NewSceneEvent, SceneDiscoveryCheckpoint
from app.services.cdse_discovery_service import CDSEDiscoveryService
from app.schemas.ais import VesselIdentity, GFWAISProvenance, GFWPresenceRecord, GFWEvent, GFWCandidateEvidence
from app.services.gfw_ais_provider import GFWAISProvider
from app.services.ais_service import MockAISProvider
from app.schemas.drift import OriginEstimate

# Dummy coordinates for Corsica
MOCK_ZONE_BBOX = [9.0, 42.0, 10.0, 43.0]


@pytest.fixture
def monitoring_zone():
    return MonitoringZone(
        name="Corsica Test Zone",
        bbox=MOCK_ZONE_BBOX
    )


@pytest.fixture
def cdse_discovery():
    return CDSEDiscoveryService()


@pytest.fixture
def origin_estimate():
    return OriginEstimate(
        id="est_1",
        investigation_id="inv_1",
        slick_id="slick_1",
        scenario_id="scenario_1",
        geometry={"type": "Polygon", "coordinates": [[[9.5, 42.25], [9.6, 42.25], [9.6, 42.35], [9.5, 42.35], [9.5, 42.25]]]},
        estimated_time=datetime(2024, 5, 27, 12, 0, 0),
        confidence=0.9
    )


def test_new_scene_event_validation():
    """Test that NewSceneEvent schema validates properly."""
    event = NewSceneEvent(
        product_id="some-uuid",
        product_name="S1A_IW_GRDH_...",
        acquisition_time=datetime.utcnow(),
        publication_time=datetime.utcnow(),
        geometry={"type": "Polygon", "coordinates": [[[0,0], [1,0], [1,1], [0,1], [0,0]]]},
        bbox=[0.0, 0.0, 1.0, 1.0],
        discovery_source="CDSE_SUBSCRIPTION"
    )
    assert event.product_id == "some-uuid"
    assert event.discovery_source == "CDSE_SUBSCRIPTION"
    assert event.collection == "sentinel-1-grd"


def test_scene_discovery_checkpoint_idempotency():
    """Test checkpoint idempotency logic."""
    chkpt = SceneDiscoveryCheckpoint(
        last_publication_date=datetime(2024, 5, 27, 10, 0, 0),
        known_product_ids=["id1", "id2"]
    )
    assert "id1" in chkpt.known_product_ids


@pytest.mark.asyncio
async def test_cdse_reconcile_mocked(monkeypatch, cdse_discovery, monitoring_zone):
    """Test OData product parsing, deduplication, and publication-date filtering."""
    
    class MockResponse:
        def __init__(self, json_data, status_code=200):
            self._json = json_data
            self.status_code = status_code
            
        def raise_for_status(self):
            pass
            
        def json(self):
            return self._json

    async def mock_get(*args, **kwargs):
        return MockResponse({
            "value": [
                {
                    "Id": "uuid-1",
                    "Name": "S1_TEST_1",
                    "PublicationDate": "2024-05-27T10:30:00.000Z",
                    "OriginDate": "2024-05-27T08:00:00Z",
                    "GeoFootprint": {"type": "Polygon", "coordinates": [[[9.2, 42.1], [9.8, 42.1], [9.8, 42.9], [9.2, 42.9], [9.2, 42.1]]]}
                },
                {
                    "Id": "uuid-2",
                    "Name": "S1_TEST_2",
                    "PublicationDate": "2024-05-27T11:00:00.000Z",
                    "OriginDate": "2024-05-27T08:00:00Z",
                    "GeoFootprint": {"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]} # Outside bbox
                },
                {
                    "Id": "uuid-1", # Duplicate
                    "Name": "S1_TEST_1",
                    "PublicationDate": "2024-05-27T10:30:00.000Z",
                    "OriginDate": "2024-05-27T08:00:00Z",
                    "GeoFootprint": {"type": "Polygon", "coordinates": [[[9.2, 42.1], [9.8, 42.1], [9.8, 42.9], [9.2, 42.9], [9.2, 42.1]]]}
                }
            ]
        })

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    chkpt = SceneDiscoveryCheckpoint(last_publication_date=datetime(2024, 5, 27, 10, 0, 0))
    events, new_chkpt = await cdse_discovery.reconcile(chkpt, monitoring_zone)
    
    # Should only find uuid-1 (uuid-2 is outside, duplicate uuid-1 is ignored)
    assert len(events) == 1
    assert events[0].product_id == "uuid-1"
    assert "uuid-1" in new_chkpt.known_product_ids
    assert new_chkpt.last_publication_date == datetime(2024, 5, 27, 11, 0, 0) # Updates to highest


def test_process_subscription_notification(cdse_discovery, monitoring_zone):
    """Test mocked subscription notifications and AOI intersection."""
    notification = {
        "value": {
            "Id": "uuid-sub-1",
            "Name": "S1_SUB_TEST",
            "PublicationDate": "2024-05-27T12:00:00.000Z",
            "OriginDate": "2024-05-27T10:00:00Z",
            "GeoFootprint": {"type": "Polygon", "coordinates": [[[9.2, 42.1], [9.8, 42.1], [9.8, 42.9], [9.2, 42.9], [9.2, 42.1]]]}
        }
    }
    
    event = cdse_discovery.process_subscription_notification(notification, monitoring_zone)
    assert event is not None
    assert event.product_id == "uuid-sub-1"
    assert event.discovery_source == "CDSE_SUBSCRIPTION"
    
    # Test non-intersecting notification
    notification_out = {
        "value": {
            "Id": "uuid-sub-2",
            "Name": "S1_SUB_TEST_OUT",
            "PublicationDate": "2024-05-27T12:00:00.000Z",
            "OriginDate": "2024-05-27T10:00:00Z",
            "GeoFootprint": {"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]}
        }
    }
    event_out = cdse_discovery.process_subscription_notification(notification_out, monitoring_zone)
    assert event_out is None


@pytest.mark.asyncio
async def test_gfw_ais_provider_raw_positions_raises():
    """Test that GFWAISProvider explicitly refuses to act as a raw track provider."""
    provider = GFWAISProvider(token="mock")
    with pytest.raises(NotImplementedError) as exc_info:
        await provider.fetch_raw_positions(0, 0, 1, 1, datetime.utcnow(), datetime.utcnow())
    assert "raw high-frequency AIS tracks" in str(exc_info.value)


@pytest.mark.asyncio
async def test_gfw_ais_provider_missing_token():
    """Test missing token behavior for GFWAISProvider."""
    provider = GFWAISProvider(token="")
    with pytest.raises(RuntimeError) as exc_info:
        await provider.get_vessel_identities(["123456789"])
    assert "GFW_API_TOKEN is not configured" in str(exc_info.value)
    
    with pytest.raises(RuntimeError):
        await provider.get_vessel_events("some_id", datetime.utcnow(), datetime.utcnow())

    with pytest.raises(RuntimeError):
        await provider.search_vessel_presence(0, 0, 1, 1, datetime.utcnow(), datetime.utcnow())


@pytest.mark.asyncio
async def test_gfw_ais_provider_vessel_identity_mocked(monkeypatch):
    """Test vessel identity parsing."""
    class MockResponse:
        def __init__(self, json_data, status_code=200):
            self._json = json_data
            self.status_code = status_code
        def raise_for_status(self):
            pass
        def json(self):
            return self._json

    async def mock_get(*args, **kwargs):
        return MockResponse({
            "entries": [
                {
                    "id": "vessel-123",
                    "mmsi": "123456789",
                    "imo": "9876543",
                    "shipname": "TEST SHIP",
                    "vesselType": "TANKER",
                    "flag": "PAN"
                }
            ]
        })

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    provider = GFWAISProvider(token="valid-mock-token")
    identities = await provider.get_vessel_identities(["123456789"])
    assert len(identities) == 1
    assert identities[0].mmsi == "123456789"
    assert identities[0].name == "TEST SHIP"


@pytest.mark.asyncio
async def test_gfw_ais_provider_events_mocked(monkeypatch):
    """Test event parsing."""
    class MockResponse:
        def __init__(self, json_data, status_code=200):
            self._json = json_data
            self.status_code = status_code
        def raise_for_status(self):
            pass
        def json(self):
            return self._json

    async def mock_get(*args, **kwargs):
        return MockResponse({
            "entries": [
                {
                    "id": "event-1",
                    "type": "gap",
                    "start": "2024-05-27T10:00:00Z",
                    "end": "2024-05-27T12:00:00Z",
                    "position": {"lon": 9.5, "lat": 42.25}
                }
            ]
        })

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    provider = GFWAISProvider(token="valid-mock-token")
    events = await provider.get_vessel_events("vessel-123", datetime(2024, 5, 27), datetime(2024, 5, 28))
    assert len(events) == 1
    assert events[0].event_type == "gap"
    assert events[0].start_lon == 9.5
    assert events[0].end_lat == 42.25


def test_gfw_candidate_evidence_schema():
    """Test that GFWAISProvenance carries the required disclaimers."""
    evidence = GFWCandidateEvidence(
        id="c1",
        investigation_id="inv1",
        identity=VesselIdentity(mmsi="123456789"),
        spatially_relevant=True,
        temporally_relevant=True
    )
    assert evidence.provenance.source == "GFW"
    assert "not raw high-frequency AIS tracks" in evidence.provenance.limitations
    assert evidence.provenance.spatial_resolution == "AIS-derived, ~vessel-level"


@pytest.mark.asyncio
async def test_mock_ais_provider_still_works(origin_estimate):
    """Test existing providers were not broken."""
    provider = MockAISProvider(origin_est=origin_estimate)
    positions = await provider.fetch_raw_positions(
        0, 0, 10, 10, datetime(2024, 5, 27, 10, 0, 0), datetime(2024, 5, 27, 14, 0, 0)
    )
    assert len(positions) > 0
    assert hasattr(positions[0], 'mmsi')

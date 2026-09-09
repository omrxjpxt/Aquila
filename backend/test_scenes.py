from fastapi.testclient import TestClient
from app.main import app
from app.api.deps import get_current_user

# Bypass Auth
app.dependency_overrides[get_current_user] = lambda: {"uid": "test_user_123", "email": "test@example.com"}

client = TestClient(app)

response = client.get("/api/v1/satellite/scenes")
print(f"URL: /api/v1/satellite/scenes")
print(f"STATUS: {response.status_code}")
print(f"RESPONSE JSON: {response.text}")

scenes = response.json()
if len(scenes) > 0:
    scene = scenes[0]
    print(f"\nREAL SCENE AVAILABLE: YES")
    print(f"ID: {scene['id']}")
    print(f"BBOX: {scene['bbox']}")
    print(f"METADATA: {scene['provider']} {scene['product_type']}")
    
    preview_url = f"/api/v1/satellite/scenes/{scene['id']}/preview"
    print(f"PREVIEW URL: {preview_url}")
    
    prev_resp = client.get(preview_url)
    print(f"PREVIEW STATUS: {prev_resp.status_code}")
    print(f"PREVIEW CONTENT-TYPE: {prev_resp.headers.get('content-type')}")
    print(f"PREVIEW SIZE: {len(prev_resp.content)} bytes")
else:
    print(f"\nREAL SCENE AVAILABLE: NO")
    print("No satellite scenes are currently available from the configured backend.")

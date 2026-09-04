import sys
import httpx
from app.core.config import settings

def test_cdse_auth():
    print("--- CDSE OAuth Smoke Test ---")
    
    client_id = settings.CDSE_CLIENT_ID
    client_secret = settings.CDSE_CLIENT_SECRET
    token_url = settings.CDSE_TOKEN_URL
    
    if not client_id or not client_secret:
        print("Error: CDSE_CLIENT_ID or CDSE_CLIENT_SECRET is missing or empty.")
        print("Please set them in backend/.env")
        sys.exit(1)
        
    print(f"Token URL: {token_url}")
    print(f"Client ID: {client_id}")
    print("Sending OAuth2 client_credentials request...")
    
    data = {
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret
    }
    
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.post(token_url, data=data)
            
        print(f"HTTP Status: {response.status_code}")
        
        if response.status_code == 200:
            json_response = response.json()
            if "access_token" in json_response:
                print("Success: Access token successfully received.")
            else:
                print("Warning: Received 200 OK, but no access_token found in response.")
            
            if "expires_in" in json_response:
                print(f"Token expires in: {json_response['expires_in']} seconds")
        else:
            print("Failed to obtain access token.")
            print(f"Error Message: {response.text}")
            sys.exit(1)
            
    except httpx.RequestError as exc:
        print(f"An error occurred while requesting the token URL.")
        print(f"Error details: {exc}")
        sys.exit(1)

if __name__ == "__main__":
    test_cdse_auth()

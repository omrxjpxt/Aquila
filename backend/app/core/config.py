from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "AQUILA Scientific Engine"
    API_V1_STR: str = "/api/v1"

    # Sentinel / Copernicus Credentials
    SENTINEL_API_USER: str = ""
    SENTINEL_API_PASSWORD: str = ""

    # Global Fishing Watch
    GFW_API_KEY: str = ""

    # Environmental Data API
    COPERNICUS_API_KEY: str = ""

    # Copernicus Data Space Ecosystem (CDSE) Credentials
    CDSE_CLIENT_ID: str = ""
    CDSE_CLIENT_SECRET: str = ""
    CDSE_TOKEN_URL: str = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=True)


settings = Settings()

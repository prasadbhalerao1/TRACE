from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    cors_allowed_origins: str = "http://localhost:3000"

    clerk_secret_key: str
    clerk_jwks_url: str
    clerk_issuer: str


@lru_cache
def get_settings() -> Settings:
    return Settings()

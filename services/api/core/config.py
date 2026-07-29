from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    # True for managed/pooled Postgres (e.g. Neon) — enables TLS and disables asyncpg's
    # server-side prepared-statement caching, which breaks against PgBouncer-style
    # transaction poolers. False (default) for local docker-compose Postgres.
    database_ssl_required: bool = False
    cors_allowed_origins: str = "http://localhost:3000"
    frontend_url: str = "http://localhost:3000"
    backend_url: str = "http://localhost:8000"

    clerk_secret_key: str
    clerk_jwks_url: str
    clerk_issuer: str

    # Module 1 (Candidate Intelligence) integrations — see doc/SRS/01 §9.
    anthropic_api_key: str = ""
    llm_model_fast: str = "claude-haiku-4-5-20251001"
    llm_model_judgment: str = "claude-sonnet-4-6"
    github_client_id: str = ""
    github_client_secret: str = ""
    github_oauth_redirect_uri: str = ""
    cloudinary_url: str = ""
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str = ""
    embedding_model: str = "BAAI/bge-large-en-v1.5"

    # Module 4 (PPT Analyzer) — see doc/SRS/04 §9.
    presentation_max_file_size_mb: int = 50
    # LibreOffice headless binary for legacy .ppt -> .pptx conversion (doc 04 §4). Not
    # bundled with this repo's Python venv — degrades gracefully (LegacyPptConversionUnavailable)
    # if not found on PATH, same "typed error, never fabricate" pattern as Anthropic/Cloudinary.
    libreoffice_binary: str = "soffice"


@lru_cache
def get_settings() -> Settings:
    return Settings()

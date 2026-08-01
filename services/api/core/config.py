from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    # True for managed/pooled Postgres (e.g. Neon) — enables TLS and disables asyncpg's
    # server-side prepared-statement caching, which breaks against PgBouncer-style
    # transaction poolers. False (default) for local docker-compose Postgres.
    database_ssl_required: bool = False
    # SQLAlchemy async engine pool — defaults (5 + 10 overflow) were too small once
    # matching/copilot/dashboard requests run concurrently against a remote pooled
    # Postgres (Neon); each round-trip pays real network latency, so starving the pool
    # queues requests behind each other instead of running them in parallel.
    db_pool_size: int = 20
    db_max_overflow: int = 20
    db_pool_timeout_seconds: int = 30
    db_pool_recycle_seconds: int = 1800
    # Langfuse `environment` attribute (services/api/core/tracing.py) — keeps test/dev
    # traces separate from production in dashboards and evaluations.
    environment: str = "development"
    cors_allowed_origins: str = "http://localhost:3000"
    frontend_url: str = "http://localhost:3000"
    backend_url: str = "http://localhost:8000"

    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_expiry_seconds: int = 604800

    # Module 1 (Candidate Intelligence) & Multi-Provider LLM Gateway — see doc/SRS/01 §9.
    llm_provider: str = "anthropic"  # "anthropic" | "openai" | "grok" | "gemini" | "openai_compatible"
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    grok_api_key: str = ""
    gemini_api_key: str = ""
    llm_base_url: str = ""
    llm_model_fast: str = "claude-haiku-4-5-20251001"
    llm_model_judgment: str = "claude-sonnet-4-6"
    github_client_id: str = ""
    github_client_secret: str = ""
    github_oauth_redirect_uri: str = ""
    cloudinary_url: str = ""
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str = ""
    embedding_model: str = "BAAI/bge-large-en-v1.5"

    # FR-4.4 salary regression — see tools/train_salary_model.py for how this artifact
    # gets produced (offline, from a downloaded Stack Overflow Developer Survey CSV).
    salary_model_path: str = "data/models/salary_regressor.joblib"

    # Module 4 (PPT Analyzer) — see doc/SRS/04 §9.
    presentation_max_file_size_mb: int = 50
    # LibreOffice headless binary for legacy .ppt -> .pptx conversion (doc 04 §4). Not
    # bundled with this repo's Python venv — degrades gracefully (LegacyPptConversionUnavailable)
    # if not found on PATH, same "typed error, never fabricate" pattern as Anthropic/Cloudinary.
    libreoffice_binary: str = "soffice"

    # Platform Hardening & Observability track (2026-07-30) — see .agents/decisions.md's
    # dated entry for what's wired vs. still gated on real credentials.
    # Langfuse tracing (services/api/core/tracing.py) — empty/placeholder keys mean a
    # clean no-op (langfuse_trace_id stays None on every AgentRun, same as before this
    # track), never a crash. Same "typed empty default, fails closed" pattern as
    # anthropic_api_key/cloudinary_url above.
    langfuse_public_key: str = ""
    langfuse_secret_key: str = ""
    langfuse_host: str = "https://cloud.langfuse.com"

    # Sentry error reporting (services/api/main.py startup) — empty DSN means
    # sentry_sdk.init() is never called at all.
    sentry_dsn: str = ""

    # In-memory rate-limit middleware (services/api/core/rate_limit.py). Hackathon-demo
    # scale (<=20 users) — no Redis dependency added for this; see .agents/decisions.md.
    rate_limit_per_minute: int = 60



@lru_cache
def get_settings() -> Settings:
    return Settings()

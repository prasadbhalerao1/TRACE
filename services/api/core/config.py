from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    # True for a TLS/pooled Postgres endpoint — enables TLS and disables asyncpg's
    # server-side prepared-statement caching, which breaks against PgBouncer-style
    # transaction poolers. False (the default, and what this project runs) for the
    # local docker-compose Postgres.
    database_ssl_required: bool = False
    # SQLAlchemy async engine pool — defaults (5 + 10 overflow) were too small once
    # matching/copilot/dashboard requests run concurrently: starving the pool queues
    # requests behind each other instead of running them in parallel.
    #
    # 20 + 20 overflow is ample now that no request holds a connection across a slow AI
    # call: handlers that invoke a LangGraph/LLM pipeline wrap it in
    # `db.without_db_connection()`, returning the connection to the pool for the seconds
    # or minutes that call takes. Before that, twenty concurrent AI interviews pinned all
    # twenty connections and every other endpoint — including trivial reads — blocked for
    # up to `db_pool_timeout_seconds`. Raise these only in response to observed
    # QueuePool timeout errors; a bigger pool is not a substitute for releasing
    # connections, it just delays the same exhaustion.
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

    # Shared secret for POST /hackathons/{id}/webhook, which registers teams from an
    # external platform (Devfolio/Unstop) and so cannot authenticate as a user. Callers
    # present it as `X-Webhook-Secret`. Empty means the endpoint is disabled: it performs
    # unauthenticated writes, so defaulting to open would silently expose every
    # deployment that has not configured it.
    hackathon_webhook_secret: str = ""

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

    # Candidate ingestion uploads (POST /candidates/me/ingest/resume, .../certificate).
    # Both routes used to call `await file.read()` with no ceiling and no type check,
    # then hand the bytes straight to pdfplumber/python-docx/Tesseract. An oversized or
    # wrong-typed upload was therefore read fully into memory, copied again into the
    # queue payload, and only rejected (if at all) deep inside a parser. The deck route
    # next door has enforced both since it was written — this is the same guard.
    resume_max_file_size_mb: int = 10
    certificate_max_file_size_mb: int = 10

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

    # Rate-limit middleware (services/api/core/rate_limit.py), Redis-backed with an
    # in-process fallback.
    #
    # Was 60/min, which a single user could exhaust just by using the app normally: one
    # dashboard load issues ~6 requests, and the limit is per *user*, not per endpoint,
    # so a handful of navigations inside one minute returned 429s that surfaced as raw
    # errors in the UI. This is an abuse ceiling, not a usage budget — it needs to sit
    # far above what an engaged human generates while still stopping a runaway client.
    rate_limit_per_minute: int = 600

    # Durable background-job queue (services/api/core/queue.py, services/workers/runner.py).
    # Long AI pipelines (candidate ingestion, job matching, assessment grading, deck
    # analysis, hackathon ranking) used to run as FastAPI BackgroundTasks inside the API
    # process: they shared its event loop and were lost silently on restart/deploy,
    # leaving rows stuck in "processing" forever with no retry.
    #
    # When `queue_enabled` is false, or Redis is simply unreachable, every enqueue falls
    # back to the in-process BackgroundTasks path so local development and the demo work
    # with no extra moving parts — the queue is an upgrade, never a hard requirement.
    redis_url: str = "redis://localhost:6379"
    queue_enabled: bool = True
    # Per-job ceiling. Must exceed the slowest pipeline (a large GitHub crawl or a
    # multi-team hackathon finalization), or arq cancels work that would have succeeded.
    queue_job_timeout_seconds: int = 900
    # Total attempts per job, including the first. Note that arq only retries a job when
    # the task raises `arq.worker.Retry` (or is cancelled) — an ordinary exception is
    # recorded as failed and never re-run. `services/workers/tasks.py` translates the
    # transient infrastructure failures worth retrying into `Retry`; permanent ones
    # (bad input, missing row) deliberately stay non-retryable.
    queue_max_tries: int = 3
    # Base delay for the retry backoff in `services/workers/tasks.py` (doubled per try).
    queue_retry_base_delay_seconds: int = 5
    # How long completed job results stay in Redis for status inspection.
    queue_result_ttl_seconds: int = 3600



@lru_cache
def get_settings() -> Settings:
    return Settings()

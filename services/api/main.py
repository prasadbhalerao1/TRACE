import asyncio
import logging

import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from services.api.common.exceptions import APIException
from services.api.core.config import get_settings
from services.api.core.event_consumer import run_polling_loop
from services.api.core.rate_limit import RateLimitMiddleware
from services.api.modules import (
    admin,
    assessments,
    candidates,
    fraud,
    hackathons,
    presentations,
    public,
    recruitment,
    supervisor,
    users,
)

logger = logging.getLogger(__name__)

settings = get_settings()

# Sentry — Platform Hardening & Observability track (2026-07-30). Gated on a non-empty
# DSN so local dev (the current real state — SENTRY_DSN is empty in .env) never errors
# or sends anything. Pairs with the exception handler below: an unhandled exception is
# both logged locally and reported to Sentry when configured. See .agents/decisions.md's
# dated entry for exactly what a future session needs to supply to verify this live.
if settings.sentry_dsn and settings.sentry_dsn.strip().lower() not in {"", "changeme", "placeholder"}:
    sentry_sdk.init(dsn=settings.sentry_dsn, traces_sample_rate=0.1, send_default_pii=False)
    logger.info("Sentry error reporting enabled")
else:
    logger.info("SENTRY_DSN not configured — Sentry error reporting disabled")

app = FastAPI(title="AI Talent Platform API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_allowed_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Rate limiting — Platform Hardening & Observability track (2026-07-30). Simple in-memory
# fixed-window limiter (services/api/core/rate_limit.py); see that module's docstring for
# why no Redis/slowapi dependency was added for this hackathon-demo-scale need. Added
# after CORSMiddleware so a 429 response still gets CORS headers (Starlette applies
# middleware in reverse of add order, so CORS — added first — ends up outermost).
app.add_middleware(RateLimitMiddleware)

app.include_router(users.router)
app.include_router(candidates.router)
app.include_router(presentations.router)
app.include_router(public.router)
app.include_router(recruitment.router)
app.include_router(assessments.router)
app.include_router(hackathons.router)
app.include_router(fraud.router)
app.include_router(supervisor.router)
app.include_router(admin.router)


from services.api.core.llm import LLMUnavailable


@app.exception_handler(LLMUnavailable)
async def llm_unavailable_handler(request: Request, exc: LLMUnavailable) -> JSONResponse:
    logger.warning("LLM Unavailable on %s %s: %s", request.method, request.url.path, str(exc))
    return JSONResponse(
        status_code=503,
        content={
            "detail": f"AI Engine Temporarily Unavailable: {str(exc)}",
            "code": "LLM_UNAVAILABLE",
        },
    )


@app.exception_handler(APIException)
async def api_exception_handler(request: Request, exc: APIException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "message": exc.message, "detail": exc.detail},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    sentry_sdk.capture_exception(exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error occurred. Please try again or check server logs."},
    )


@app.on_event("startup")
async def _start_event_consumer() -> None:
    # Fixed-interval polling background task — see services/api/core/event_consumer.py's
    # module docstring and .agents/decisions.md's 2026-07-30 entry for why a plain
    # asyncio loop was chosen over adding a Celery/Arq dependency for this one job.
    asyncio.create_task(run_polling_loop())


@app.get("/health")
def health():
    return {"status": "ok"}

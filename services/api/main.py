import asyncio
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from services.api.core.config import get_settings
from services.api.core.event_consumer import run_polling_loop
from services.api.routers import (
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

app = FastAPI(title="AI Talent Platform API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_allowed_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(candidates.router)
app.include_router(presentations.router)
app.include_router(public.router)
app.include_router(recruitment.router)
app.include_router(assessments.router)
app.include_router(hackathons.router)
app.include_router(fraud.router)
app.include_router(supervisor.router)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    # Registering a handler for the base Exception keeps this inside Starlette's
    # ExceptionMiddleware (which runs under CORSMiddleware), instead of letting it
    # propagate to ServerErrorMiddleware (which runs outside CORSMiddleware and so
    # sends back a response with no CORS headers — the browser then misreports a
    # real 500 as a CORS failure, as happened with the Module 01 dashboard bug).
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "internal_server_error"})


@app.on_event("startup")
async def _start_event_consumer() -> None:
    # Fixed-interval polling background task — see services/api/core/event_consumer.py's
    # module docstring and .agents/decisions.md's 2026-07-30 entry for why a plain
    # asyncio loop was chosen over adding a Celery/Arq dependency for this one job.
    asyncio.create_task(run_polling_loop())


@app.get("/health")
def health():
    return {"status": "ok"}

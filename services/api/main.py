import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from services.api.core.config import get_settings
from services.api.core.event_consumer import run_polling_loop
from services.api.routers import assessments, candidates, hackathons, presentations, public, recruitment, supervisor, users

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
app.include_router(supervisor.router)


@app.on_event("startup")
async def _start_event_consumer() -> None:
    # Fixed-interval polling background task — see services/api/core/event_consumer.py's
    # module docstring and .agents/decisions.md's 2026-07-30 entry for why a plain
    # asyncio loop was chosen over adding a Celery/Arq dependency for this one job.
    asyncio.create_task(run_polling_loop())


@app.get("/health")
def health():
    return {"status": "ok"}

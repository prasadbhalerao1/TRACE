from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from services.api.core.config import get_settings
from services.api.routers import assessments, candidates, fraud, hackathons, presentations, public, recruitment, users

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


@app.get("/health")
def health():
    return {"status": "ok"}

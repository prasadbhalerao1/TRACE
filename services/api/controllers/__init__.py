"""
Services API Controllers Package.
Domain-driven controller modules separating HTTP request handling from core business logic.
"""
from services.api.controllers.user_controller import router as user_router
from services.api.controllers.candidate_controller import router as candidate_router
from services.api.controllers.recruitment_controller import router as recruitment_router

__all__ = ["user_router", "candidate_router", "recruitment_router"]

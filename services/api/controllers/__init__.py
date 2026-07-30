"""
Services API Controllers Package.
Domain-driven controller modules separating HTTP request handling from core business logic.
"""
from services.api.controllers.user_controller import router as user_router
from services.api.controllers.candidate_controller import router as candidate_router
from services.api.controllers.recruitment_controller import router as recruitment_router
from services.api.controllers.hackathon_controller import router as hackathon_router
from services.api.controllers.assessment_controller import router as assessment_router
from services.api.controllers.presentation_controller import router as presentation_router
from services.api.controllers.fraud_controller import router as fraud_router
from services.api.controllers.supervisor_controller import router as supervisor_router
from services.api.controllers.admin_controller import router as admin_router
from services.api.controllers.public_controller import router as public_router

__all__ = [
    "user_router",
    "candidate_router",
    "recruitment_router",
    "hackathon_router",
    "assessment_router",
    "presentation_router",
    "fraud_router",
    "supervisor_router",
    "admin_router",
    "public_router",
]

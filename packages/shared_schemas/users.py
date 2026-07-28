from enum import Enum
from uuid import UUID

from pydantic import BaseModel


class Role(str, Enum):
    candidate = "candidate"
    recruiter = "recruiter"
    organizer = "organizer"
    judge = "judge"
    admin = "admin"


class UserProfile(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    email: str
    full_name: str | None
    role: Role
    organization_id: UUID | None
    is_active: bool


class MeResponse(BaseModel):
    onboarding_required: bool
    profile: UserProfile | None = None


class OnboardingRequest(BaseModel):
    role: Role
    full_name: str | None = None

from datetime import datetime
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


# --- Admin: user management + audit log (added alongside the admin routes in
# services/api/routers/admin.py; see .agents/decisions.md for scope notes) ---


class AdminUserOut(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    email: str
    full_name: str | None
    role: Role
    organization_id: UUID | None
    is_active: bool


class RoleUpdateRequest(BaseModel):
    role: Role


class AuditLogOut(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    actor_user_id: UUID | None
    action: str
    target_type: str | None
    target_id: UUID | None
    created_at: datetime

"""
Admin Controller.
Handles Admin User Management, Role/Org Assignment, and Audit Logs.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from packages.db.models import AuditLog, User
from packages.shared_schemas.users import AdminUserOut, AuditLogOut, RoleUpdateRequest
from services.api.core.audit import log_action
from services.api.core.db import get_db
from services.api.core.rbac import require_role

router = APIRouter(prefix="/admin", tags=["Admin Operations"])


@router.get("/users", response_model=list[AdminUserOut])
async def list_users(
    admin: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> list[User]:
    result = await db.execute(select(User).order_by(User.email))
    return list(result.scalars().all())


@router.patch("/users/{user_id}/role", response_model=AdminUserOut)
async def update_user_role(
    user_id: uuid.UUID,
    payload: RoleUpdateRequest,
    admin: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> User:
    target = await db.get(User, user_id)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user_not_found")

    target.role = payload.role.value
    await log_action(
        db,
        actor_user_id=admin.id,
        action="user_role_updated",
        target_type="user",
        target_id=target.id,
    )
    await db.commit()
    await db.refresh(target)
    return target


@router.patch("/users/{user_id}/organization", response_model=AdminUserOut)
async def assign_user_organization(
    user_id: uuid.UUID,
    org_id: uuid.UUID | None = None,
    admin: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> User:
    target = await db.get(User, user_id)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user_not_found")

    target.organization_id = org_id
    await log_action(
        db,
        actor_user_id=admin.id,
        action="user_organization_updated",
        target_type="user",
        target_id=target.id,
    )
    await db.commit()
    await db.refresh(target)
    return target


@router.get("/audit-log", response_model=list[AuditLogOut])
async def get_audit_log(
    limit: int = 100,
    admin: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> list[AuditLog]:
    capped_limit = max(1, min(limit, 500))
    result = await db.execute(
        select(AuditLog).order_by(AuditLog.created_at.desc()).limit(capped_limit)
    )
    return list(result.scalars().all())

"""
Clerk Authentication & Session Integration Adapter.
"""
from services.api.core.rbac import get_current_user, require_role

__all__ = ["get_current_user", "require_role"]

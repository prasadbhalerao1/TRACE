import httpx

from services.api.core.config import get_settings

_CLERK_API_BASE = "https://api.clerk.com/v1"


async def fetch_clerk_user(clerk_user_id: str) -> dict:
    """Look up a Clerk user's profile via the Backend API.

    Session JWTs only carry the "sub" claim by default (no email/name) unless custom
    claims are configured in the Clerk dashboard — rather than depending on that, we
    fetch the profile directly with the secret key when we need it (onboarding only).
    """
    settings = get_settings()
    async with httpx.AsyncClient(timeout=5.0) as client:
        response = await client.get(
            f"{_CLERK_API_BASE}/users/{clerk_user_id}",
            headers={"Authorization": f"Bearer {settings.clerk_secret_key}"},
        )
        response.raise_for_status()
        return response.json()


def primary_email(clerk_user: dict) -> str | None:
    primary_id = clerk_user.get("primary_email_address_id")
    for entry in clerk_user.get("email_addresses", []):
        if entry.get("id") == primary_id:
            return entry.get("email_address")
    return None


def full_name(clerk_user: dict) -> str | None:
    parts = [clerk_user.get("first_name"), clerk_user.get("last_name")]
    name = " ".join(p for p in parts if p)
    return name or None

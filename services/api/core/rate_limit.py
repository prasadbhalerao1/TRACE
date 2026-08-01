"""In-memory fixed-window rate-limit middleware — Platform Hardening track (2026-07-30).

Hackathon-demo scale (<=20 users, single API process, no horizontal scaling) — a plain
in-process counter is sufficient. `config.py`'s `redis_url` doesn't exist anywhere in this
repo yet (checked before writing this — see `.agents/decisions.md`'s dated entry), so no
Redis dependency is added just for this; `services/api/core/event_consumer.py` already
established the precedent of preferring a plain in-process mechanism over a new
infrastructure dependency for a single hackathon-scoped job.

Keyed by authenticated user id when a valid Clerk bearer token is present (best-effort,
never raises — this middleware must not become a second, competing auth gate; `rbac.py`'s
`get_current_user` dependency remains the single source of truth for actual
authorization), falling back to client IP for unauthenticated requests. Fixed 60-second
window, resets on rollover. `/health` is exempt so uptime checks never 429.
"""

from __future__ import annotations

import time
from collections import defaultdict

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.types import ASGIApp

from services.api.core.config import get_settings

_EXEMPT_PATHS = {"/health"}


def _decode_user_id_best_effort(authorization: str | None) -> str | None:
    """Pull the subject claim out of a custom bearer JWT without verifying it.

    This is a rate-limit *bucket key*, not an authorization decision — using the
    unverified subject claim just means two different rate-limit buckets in the
    pathological case of a forged token, never a security gap, since `rbac.py`'s real
    verified `get_current_user` dependency still runs afterwards and still rejects a
    forged/expired token as normal. Avoids re-running full JWT verification twice per
    request purely to pick a bucket key.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1]
    parts = token.split(".")
    if len(parts) != 3:
        return None
    try:
        import base64
        import json

        payload_b64 = parts[1] + "=" * (-len(parts[1]) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))
        sub = payload.get("sub")
        return str(sub) if sub else None
    except Exception:
        return None


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Fixed-window in-memory rate limiter: `RATE_LIMIT_PER_MINUTE` requests per 60s
    window per bucket key (user id, else client IP). Returns 429 with
    `{"detail": "rate_limit_exceeded"}` on overflow — never raises, never blocks
    `/health`.
    """

    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)
        self._settings = get_settings()
        # bucket_key -> (window_start_epoch_seconds, count_in_window)
        self._buckets: dict[str, tuple[float, int]] = defaultdict(lambda: (0.0, 0))
        self._window_seconds = 60.0

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint):
        if request.url.path in _EXEMPT_PATHS:
            return await call_next(request)

        limit = self._settings.rate_limit_per_minute
        if limit <= 0:
            # 0 or negative means "no limit" — an explicit opt-out, not a footgun.
            return await call_next(request)

        bucket_key = _decode_user_id_best_effort(request.headers.get("authorization"))
        if bucket_key is None:
            client = request.client
            bucket_key = client.host if client else "unknown"

        now = time.monotonic()
        window_start, count = self._buckets[bucket_key]
        if now - window_start >= self._window_seconds:
            window_start, count = now, 0
        count += 1
        self._buckets[bucket_key] = (window_start, count)

        if count > limit:
            return JSONResponse(status_code=429, content={"detail": "rate_limit_exceeded"})

        return await call_next(request)

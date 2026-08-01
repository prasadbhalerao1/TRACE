# Authentication & Role-Based Access Control

## What it does

Two-layer auth model:
1. **Identity** (Clerk): who is this person? (JWT verification, session management)
2. **Authorization** (our DB): what can they do? (role-based access via `users.role`)

## How authentication works

```
Frontend: User signs in with Clerk
    ↓
    ├─→ Clerk returns JWT (RS256 signed)
    │   - Subject: clerk user ID
    │   - Expires: 10 minutes
    │   - Contains: user_id, email, org_id
    │
    └─→ Frontend sends JWT as Bearer token
        ↓
        ├─→ Backend receives Authorization: Bearer <JWT>
        │
        ├─→ services/api/core/rbac.py::get_auth_context():
        │   ├─ Fetch JWKS from Clerk (cached, TTL 1hr)
        │   ├─ Verify signature (RS256)
        │   ├─ Check expiry
        │   ├─ Extract Clerk subject claim
        │   └─ Look up users.clerk_id → User model
        │
        ├─→ If user doesn't exist yet:
        │   └─ State = "onboarding_required" (valid token, no app row)
        │
        └─→ Return User object OR raise 401
```

**Key Code**:
- JWT verification: `services/api/core/rbac.py::get_auth_context()`
- Route protection: `require_role("recruiter")` dependency injection
- Frontend session: `useAuth()` from Clerk SDK

## How authorization (RBAC) works

```
API Layer (Backend) - THE REAL ENFORCEMENT
    ├─→ Route decorator: @router.get(..., dependencies=[require_role("recruiter")])
    │   - Router refuses request if user.role != "recruiter"
    │   - 403 Forbidden if unauthorized
    │
    ├─→ Query scoping: "show only this user's data"
    │   Example: `WHERE candidate_id = current_user_id`
    │
    └─→ Action scoping: "only admins can delete fraud flags"
    │   Example: if not current_user.role == "admin": raise Unauthorized

UI Layer (Frontend) - UX ONLY, NOT ENFORCEMENT
    ├─→ Client-side role check: if (!user.role.includes("admin")) hide button
    │   - For UX smoothness (no "you can't click this" frustration)
    │   - NOT SECURITY (backend is the only gate)
    │
    └─→ Layout-based routing:
        - (admin)/layout.tsx: if role != admin, redirect to /
        - (recruiter)/layout.tsx: if role != recruiter, redirect to /
        - (candidate)/layout.tsx: if role != candidate, redirect to /
```

## How Onboarding works

```
New User (valid Clerk JWT, but no users row yet)
    ↓
    ├─→ Redirect to /onboarding
    │   - Form: pick role (candidate/recruiter/admin/etc)
    │
    ├─→ Submit role selection
    │   ├─ Create users row: clerk_id, email, role
    │   ├─ Redirect to role-specific dashboard
    │   └─ Now onboarding_required = False
    │
    └─→ Role-specific setup
        - Candidate: upload resume
        - Recruiter: create first job
        - Admin: view audit log
```

## Rate Limiting

```
In-Memory Fixed-Window Limiter (services/api/core/rate_limit.py)
    ├─ Key: user_id (if auth'd) OR IP (if anon)
    ├─ Window: 60 seconds
    ├─ Limit: 100 requests per window
    │
    └─ Why in-memory, not Redis?
        - Hackathon scale: <100 concurrent users
        - Redis adds infrastructure complexity
        - Single-process limitation: doesn't work across multiple servers
        - Production would need Redis or dedicated rate-limit service
```

## Key design decisions

1. **Clerk for identity, custom RBAC for authorization**:
   - Clerk = fast, SaaS (no ops overhead)
   - Custom DB role = fine-grained control (org-specific roles)
   - Separation: don't couple identity provider to app permissions

2. **Client-side role checks are UX, not security**:
   - Server is the only security boundary
   - UI hides "you can't" to avoid frustration
   - But server ALWAYS checks, even if UI hid the button

3. **In-memory rate limiting for hackathon scale**:
   - Sufficient for <100 users
   - Acknowledged limitation: doesn't scale to production
   - Replacement: add Redis when deployed

4. **JWKS caching with TTL**:
   - Cache Clerk's JWKS for 1 hour (avoids per-request HTTPS call)
   - Re-fetch on unknown key ID (Clerk rotates keys periodically)
   - Tradeoff: 1-hour window where revoked key could be accepted (acceptable)

## Limitations

- Rate limiter is single-process (doesn't work across multiple API servers)
- Onboarding flow assumes 1:1 user:role (can't be both recruiter and candidate)
- JWKS caching means key rotation takes up to 1 hour to propagate
- No per-endpoint rate limiting (all requests share global limit)

## Where this lives

| Component | File |
|---|---|
| JWT verification | `services/api/core/rbac.py::get_auth_context()` |
| Role enforcement | `services/api/core/rbac.py::require_role()` |
| User model | `packages/db/models/user.py` |
| Rate limiter | `services/api/core/rate_limit.py` |
| Frontend auth provider | `apps/web/src/components/CurrentUserProvider.tsx` |
| Frontend role gate | `apps/web/src/app/(admin)/layout.tsx` (all role layouts follow pattern) |
| Onboarding page | `apps/web/src/app/(public)/onboarding/page.tsx` |
| Clerk setup | `services/api/core/config.py::CLERK_JWT_KEY` |

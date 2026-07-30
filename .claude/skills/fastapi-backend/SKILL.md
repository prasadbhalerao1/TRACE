---
name: fastapi-backend
description: Conventions for adding endpoints, models, and services to the services/api FastAPI backend — folder layout, the uv-managed Python 3.12 venv, shared schemas, Alembic migrations, and which docs govern backend decisions in this repo.
---

# FastAPI Backend Conventions (`services/api`)

## Structure
- `services/api/main.py` — app entrypoint, mounts each domain module's router and wires global exception handlers/middleware. No business logic here.
- `services/api/modules/<domain>/` — one package per domain (`recruitment`, `assessments`, `presentations`, `candidates`, `fraud`, `hackathons`, `users`, `admin`, `supervisor`, `public`). Each has `router.py` (the `APIRouter`, route handlers, and the domain's private helper functions) and an `__init__.py` that re-exports `router`. Route handlers call into services/agents, not the other way around. Cross-domain helper reuse (e.g. `assessments/router.py` importing `_require_consent` from `candidates/router.py`) is fine and already happens — don't duplicate a helper across modules.
- `services/api/core/` — cross-cutting infrastructure: config, DB session, LLM client, storage, tracing, notifications, rate limiting, audit, RBAC/JWT verification.
- `services/api/common/` — domain-agnostic building blocks: `exceptions.py` (`APIException` and subclasses — raise these instead of a bare `HTTPException` where a structured `{success, message, detail}` error body is wanted; caught by a global handler in `main.py`) and `responses.py` (generic `APIResponse`/`ErrorResponse` envelopes).
- `services/api/integrations/` — thin facade modules (`clerk/`, `storage/`) that re-export the real third-party wiring from `core/` (e.g. `core/rbac.py`, `core/storage.py`). Domain modules should import auth/storage helpers through `integrations/`, not reach into `core/` directly, so the third-party boundary stays swappable.
- `packages/shared_schemas/` — the **only** place Pydantic models get defined if they're used by both `services/api` and `services/agents`. Never duplicate a schema across the two — import from here.
- `packages/db/migrations/` — Alembic. All schema changes go through a migration; no manual DDL, no `Base.metadata.create_all()` in application code.

## Python environment
- Managed with `uv`, pinned to Python 3.12 at `services/api/.venv` (the system's default Python was too new for some ML wheels at scaffold time — don't assume `python`/`pip` on PATH point at this venv).
- Run commands as `uv run --python services/api/.venv <cmd>` or `uv pip install --python services/api/.venv <pkg>` rather than activating in a persistent shell — each new shell session won't have the venv activated.

## Naming (per `.agents/constraints.md` §2)
- `snake_case` for files/functions/variables, `PascalCase` for Pydantic/SQLAlchemy models and exceptions.
- Database tables: plural `snake_case` (`candidate_profiles`, `match_scores`, `agent_runs`).

## Security & consent (per `.agents/constraints.md` §3-4)
- Verify an active `consents` record (`status = 'granted'`) before resume parsing, GitHub ingestion, photo perceptual hashing, or interview recording.
- Every AI score/verdict written to the DB must log to `agent_runs` (inputs, model string, rationale, `langfuse_trace_id`) — no silent scoring.
- Fraud flags with `raised` status must never alter a Talent Score or hide a candidate from search until a human moves it to `upheld`.

## Model routing (per `.agents/constraints.md` §5)
Haiku/Groq-Llama for extraction, tagging, MCQ generation, NL filter parsing. Claude Sonnet for interview turns, pitch deck rubric scoring, fraud forensics, re-ranking.

## Before implementing an endpoint or table
Both doc sets are current and complementary — check both:
- `doc/SRS/00` §5 for the shared core schema (`organizations`, `users`, `files`, `consents`, `events`, `agent_runs`, `audit_logs`) and each module's `doc/SRS/01-06` §5-6 for module tables/endpoints.
- `doc/multi-agent-architecture/08-algorithms-and-formulas.md` for the exact scoring math before implementing any formula.
- `doc/multi-agent-architecture/00` §2.1 for the frontend/backend integration boundary (Next.js never touches the DB directly — this API is the only door in).
- If the two sets disagree on a specific point, see `.agents/DOCUMENTATION_MAP.md` § "Known Differences" — don't silently pick one.

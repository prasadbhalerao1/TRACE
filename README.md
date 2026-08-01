# DataAxle — AI Talent Intelligence & Hiring Platform

An AI-native hiring and hackathon platform. Candidates build a verified profile from real
evidence (GitHub activity, resume, certificates), get scored on a multi-dimensional Talent
Score, get matched to jobs by a recruiter copilot, get assessed via coding tests, project
review, and live AI interviews — and everything is cross-checked by a fraud-detection layer
that never auto-penalizes anyone without a human in the loop. A parallel hackathon track lets
organizers run events whose top performers feed directly into recruiter pipelines.

**Full technical documentation lives in [`Documentation/`](Documentation/README.md)** — start
there for architecture, module deep-dives, and setup instructions. This README is a
high-level orientation.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Framer Motion |
| Backend | FastAPI (Python, async), Pydantic v2 |
| ORM / migrations | SQLAlchemy 2.0 (async, asyncpg) + Alembic |
| Relational database | PostgreSQL (Neon Cloud Postgres) |
| Vector database | Qdrant (Qdrant Cloud) — semantic skill/plagiarism/novelty search |
| Cache | Redis |
| AI orchestration | LangGraph — 7 domain modules, 12 state graphs |
| LLM provider | Multi-provider gateway (Anthropic default, plus OpenAI/Groq/Gemini) |
| Embeddings | `sentence-transformers` (`BAAI/bge-large-en-v1.5`), self-hosted |
| Auth | Custom email + password, JWT (no third-party identity provider) |
| File storage | Cloudinary |
| Code execution (assessments) | Pyodide — client-side, in-browser Python |

See [`Documentation/00-architecture-overview.md`](Documentation/00-architecture-overview.md)
for the full stack table, system diagram, and an honest note on current deployment status.

## Repository structure

```
apps/web/               Next.js frontend (App Router, role-based route groups)
services/api/           FastAPI backend — core/ (auth, db, llm gateway), modules/ (routers)
services/agents/        LangGraph agents — candidate_intelligence, recruitment, assessment,
                         fraud, hackathon, ppt_analyzer, supervisor
services/workers/        Background task definitions
packages/db/             SQLAlchemy models + Alembic migrations
packages/prompts/        Prompt templates (see Documentation/14-prompts-architecture.md)
packages/shared_schemas/ Pydantic schemas shared between api/ and agents/
infra/                   docker-compose.yml (local dev infrastructure)
scripts/                 Dev startup and DB seed scripts
Documentation/           Full technical documentation (start at README.md)
```

## Core modules

| Module | What it does |
|---|---|
| Candidate Intelligence | Ingests GitHub + resume + certificates into a 9-dimensional Talent Score |
| Resume, Portfolio & Career Guidance | Resume/cover-letter generation, public portfolios, skill-gap and salary guidance |
| Recruitment Matching & Copilot | Job matching formula + natural-language candidate search |
| Skill Verification & Assessments | Coding tests, project analysis, hackathon team contribution attribution |
| AI Interview Agent | Turn-based, adaptively-routed technical interviews |
| PPT / Pitch Deck Analyzer | Rubric scoring, plagiarism and AI-content detection for hackathon decks |
| Hackathon-to-Hiring Pipeline | Team ranking and live-matched recruiter watchlists |
| Trust & Fraud Prevention | Certificate verification, plagiarism, duplicate-profile, and AI-content detection — flags are always evidence, never auto-penalties |

Each module has its own deep-dive doc in [`Documentation/`](Documentation/README.md).

## Roles

Candidate, Recruiter, Organizer, Judge, Admin — each with its own route group and dashboard.
See [`Documentation/13-role-flows-and-use-cases.md`](Documentation/13-role-flows-and-use-cases.md)
for plain-English walkthroughs of each role's flow.

---

## Running locally

Full instructions, including secrets setup for every integration (Anthropic, GitHub OAuth,
Cloudinary, Qdrant, Langfuse, Sentry), are in
[`Documentation/15-local-development-setup.md`](Documentation/15-local-development-setup.md).

Quick version:

```bash
# Backend
python -m alembic upgrade head
uvicorn services.api.main:app --reload --port 8000

# Frontend
cd apps/web
npm install
npm run dev
```

- Frontend: http://localhost:3000
- API: http://localhost:8000 (interactive docs at `/docs`)

Copy `.env.example` to `.env` and fill in real values before starting either server —
`services/api/core/config.py` is the source of truth for every environment variable.

## Verification

```bash
# Frontend typecheck
cd apps/web && npx tsc --noEmit

# Frontend production build
npm run build

# Backend import check
python -c "import services.api.main"
```

---

**Documentation**: [`Documentation/README.md`](Documentation/README.md) — 16 module and
architecture docs, all verified against the current codebase.

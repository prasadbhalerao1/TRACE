# TRACE — Talent Reliability & Assessment through Credential Evidence

AI talent intelligence and recruitment platform.

A high-performance, multi-agent AI talent intelligence, recruitment matching, hackathon evaluation, and trust/fraud prevention platform.

---

## 1. Project Architecture & Modular Structure

The codebase is organized into clean, maintainable, decoupled packages and services:

```
TRACE/
├── apps/
│   └── web/                             # Next.js 16 (React 19, Tailwind CSS, Turbopack)
│       ├── e2e/                         # Playwright E2E test suite & setup
│       └── src/
│           ├── app/                     # Route groups: (candidate), (recruiter), (organizer), (judge), (admin), (public)
│           ├── components/              # Shadcn UI, Base UI, & custom control-plane components
│           └── lib/                     # API client functions (api.ts) & utilities
│
├── packages/
│   ├── db/                              # Database layer
│   │   ├── models/                      # SQLAlchemy async ORM models (User, Candidate, Job, Hackathon, Fraud, etc.)
│   │   └── migrations/                  # Alembic database migrations & revision versions
│   ├── shared_schemas/                  # Pydantic schemas shared across FastAPI and frontend API calls
│   └── prompts/                         # Centralized System Prompt Registry & Jinja2 templates
│       ├── registry.py                  # PromptRegistry engine
│       └── templates/                   # Versioned prompt templates per module
│
├── services/
│   ├── api/                             # FastAPI application & REST endpoints
│   │   ├── core/                        # DB session, auth, rate limiting, Sentry, tracing, audit logging, notifications
│   │   └── routers/                     # Endpoint routers (users, candidates, recruitment, assessments, hackathons, etc.)
│   └── agents/                          # 16 LangGraph AI Agent Subgraphs
│       ├── candidate_intelligence/      # Talent Profile Engine, Talent Score™, Career Guidance
│       ├── recruitment/                 # Flow B Matching, Recruiter Copilot Query Understanding
│       ├── assessment/                  # Code Verification, AI Interview Agent, Contribution Scan
│       ├── ppt_analyzer/                # Pitch Deck 4-subagent domain analyzer & Sonnet synthesis
│       ├── hackathon/                   # Hackathon Evaluation Pipeline & Leaderboard rollup
│       ├── fraud/                       # Certificate OCR, Code Plagiarism, Duplicate Profile, AI Content
│       └── supervisor/                  # Master Supervisor intent classifier & router
│
└── doc/                                 # Architectural specifications & SRS documentation
    ├── multi-agent-architecture/        # 12 Master Architecture docs (00 to 11)
    └── SRS/                             # 8 Module SRS specs (00 to 07)
```

---

## 2. Platform Modules & Roles

### Roles & Access Flow
* **Candidate**: Profile ingestion, Talent Score™, AI career guidance, Pyodide code sandbox assessments, AI audio interviews, job browse/apply, hackathon submission, dispute flags.
* **Recruiter**: Job posting, AI Copilot search assistant, Flow B match reranking with fit explanations, drag-and-drop pipeline kanban, top performers feed.
* **Organizer**: Create hackathons, SheetJS CSV/XLSX team import, manage rosters, custom judge weight sliders, leaderboard finalization.
* **Judge**: Evaluation queue, submission review, rubric scoring & feedback entry.
* **Admin**: User directory, RBAC role updates, multi-tenant organization assignment, system audit log viewer, trust/fraud review queue.

---

## 3. Quick Start & Setup

### Prerequisites
* Python 3.12+
* Node.js 20+
* Docker (for Postgres, Qdrant, and Redis)

### 1. Infrastructure — all local, no cloud accounts

Postgres, Qdrant, and Redis all run as local containers. Nothing here needs an API key.

```bash
docker compose -f infra/docker-compose.yml up -d
```

### 2. Environment configuration

Copy `.env.example` to `.env`. Its defaults already point at the containers above:

```bash
DATABASE_URL=postgresql+asyncpg://dev:dev@localhost:5432/talent_platform
DATABASE_SSL_REQUIRED=false
QDRANT_URL=http://localhost:6333
REDIS_URL=redis://localhost:6379

# External services — only an LLM provider is needed to exercise the AI features.
# Agents degrade gracefully to deterministic fallbacks when these are unset.
LLM_PROVIDER=anthropic          # or: openai | grok | groq | gemini
ANTHROPIC_API_KEY=""
CLOUDINARY_URL=""               # optional: file uploads
SENTRY_DSN=""                   # optional: error reporting
```

See [Documentation/15-local-development-setup.md](Documentation/15-local-development-setup.md)
for how to obtain each optional key.

### 3. Backend (FastAPI)

```bash
# Create the schema, then load demo data
python -m alembic upgrade head
python scripts/seed_db.py
python scripts/seed_candidates_hardcoded.py   # optional: richer candidate set

uvicorn services.api.main:app --reload --port 8000
```

Seed logins: `alice@example.com` … `evan@example.com`, password `password123`.

### 4. Frontend (Next.js)

```bash
cd apps/web
npm install
npm run dev
```

---

## 4. Verification & Testing

```bash
# TypeScript Typecheck (0 errors)
cd apps/web
npx tsc --noEmit

# Production Build Test
npm run build

# Python Import Test
python -c "import services.api.main; import packages.prompts"
```

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

Each module below has its own deep-dive doc in [`Documentation/`](Documentation/README.md) — this
section is the detailed feature list, not just a one-line summary.

### 1. Candidate Intelligence & Talent Score
Connects GitHub (OAuth), resume, and certificates into one merged profile, cross-checking claims
against each other (e.g. resume says "5 years Python," GitHub shows one active year → flagged as
`experience_mismatch`, not silently accepted). Computes a 9-dimensional **Talent Score** — coding
ability, problem solving, project quality, innovation, technical consistency, community
participation, leadership, open-source contributions, hackathon performance — mostly from evidence
a candidate can't just assert (commit history, cyclomatic complexity of sampled code, assessment
results, PR review counts), with only two sub-scores partly LLM-judged. Ships an **Evidence
Confidence Score** (`available_signals / expected_signals`) so a low score can be told apart from an
under-profiled one, percentile normalization against the live candidate pool (harder to game than a
fixed formula), skill badges that require corroboration across two independent sources, and a
**job-contextual score adjustment** that reweights technical sub-scores by actual skill overlap with
a specific job rather than showing one undifferentiated number for every req.
→ [`02-candidate-intelligence-and-talent-score.md`](Documentation/02-candidate-intelligence-and-talent-score.md)

### 2. Resume, Portfolio & Career Guidance
Generates ATS-optimized resumes and cover letters tailored to a target job, gated by a deterministic
**fact-check guardrail** that rejects generation outright if a claim doesn't match the candidate's
verified profile (no silent fabrication). Publishes a public, shareable portfolio page
(`platform.com/{username}`, no auth required, visibility candidate-controlled) built from resume +
GitHub data. Career Guidance does embedding-based skill-gap analysis against a target role, salary
prediction from an offline-trained ML model (fast, consistent, auditable — not a live LLM guess per
request), and ranked learning-path recommendations with time/cost estimates.
→ [`03-resume-portfolio-and-career-guidance.md`](Documentation/03-resume-portfolio-and-career-guidance.md)

### 3. Recruitment Matching & Copilot
**Job Matching** ranks candidates against a posting with a transparent 4-term weighted formula
(skill overlap, semantic similarity, experience alignment, Talent Score) using embedding-based skill
matching, not bare string equality — "Vue.js" gets partial credit against a "React" requirement,
"Photoshop" gets none. **Recruiter Copilot** takes natural-language queries ("Python engineers in SF
with 5+ years, Talent Score 70+") through query understanding → hybrid (filter + semantic) search →
LLM reranking → plain-English explanation of why each top candidate fits. Matching itself stays rules
+ embeddings (fast, auditable, no hallucination risk); only the copilot's reranking step uses an LLM,
for nuance the formula can't express.
→ [`04-recruitment-matching-and-copilot.md`](Documentation/04-recruitment-matching-and-copilot.md)

### 4. Skill Verification & Assessments
In-browser coding assessments (signature + tests provided, auto-graded on unit-test pass rate +
static analysis + optional LLM code review) and MCQ tests with instant feedback. **Project analysis**
clones a submitted repo and runs static analysis (complexity, maintainability, test coverage),
AST-based clone detection for plagiarism, and an LLM architecture review. **Team contribution
analytics** attributes hackathon team output per member from git commit history (weighted by
lines changed, commit frequency, and recency — resistant to "100 one-line commits" gaming), with the
methodology fully disclosed rather than a black-box percentage.
→ [`05-skill-verification-and-assessments.md`](Documentation/05-skill-verification-and-assessments.md)

### 5. AI Interview Agent
Multi-turn technical interviews conducted by voice in-browser. A topic plan is generated from the job
description; each turn is evaluated live by an LLM (clarity, depth, correctness), and a conditional
graph decides in real time whether to ask a follow-up, escalate difficulty, or move topics — built
turn-based specifically because a single hour-long interview can't fit in one LLM call without
blowing the token budget or losing adaptive depth. Produces a structured report: technical rating,
communication rating (hedging-language and structure analysis — never voice/emotion analysis), and a
hiring recommendation.
→ [`06-ai-interview-agent.md`](Documentation/06-ai-interview-agent.md)

### 6. PPT / Pitch Deck Analyzer
Scores hackathon pitch decks on problem clarity, solution innovation, business viability, and
technical feasibility via temperature-0 LLM rubric scoring (reproducible, auditable). Runs plagiarism
detection (structural MinHash fingerprinting + semantic embedding comparison against a growing corpus
of past pitches) and a statistical AI-generated-content heuristic — the latter is a signal fed into
the fraud engine, never an auto-flag. Analysis takes 15–40 seconds, so it always runs as a background
task with the frontend polling status, rather than holding the upload request open.
→ [`07-ppt-pitch-deck-analyzer.md`](Documentation/07-ppt-pitch-deck-analyzer.md)

### 7. Hackathon-to-Hiring Pipeline
Combines judge scores, pitch-deck score, repo quality score, and a cross-event novelty score (via
Qdrant — penalizes cookie-cutter solutions) into one configurable-weight team ranking. Once an
organizer finalizes rankings, an event-driven consumer live-matches top performers against recruiter
**watchlists** (skills/level/location criteria) and notifies matching recruiters — computed live at
poll time rather than pre-computed, specifically so a recruiter who creates a watchlist *after* the
event still gets caught by a later match.
→ [`08-hackathon-to-hiring-pipeline.md`](Documentation/08-hackathon-to-hiring-pipeline.md)

### 8. Trust & Fraud Prevention
Runs four independent detection subgraphs — certificate verification (registry lookup + automated
issuer-page check, falling back to rules + optional vision-model visual forensics), code/submission
plagiarism (AST-level structural clone detection, robust to variable renaming, plus a public-GitHub
cross-check), duplicate-profile detection (text MinHash + perceptual photo hashing — deliberately not
facial recognition), and an AI-generated-content statistical signal. Every check, flagged or not, is
logged to an immutable evidence table. **The core design principle: a flag never auto-affects
anything.** Only a human reviewer moving a flag to `upheld`, with mandatory written notes enforced at
the database level, counts against a candidate's Authenticity Score — a `raised` flag alone changes
nothing. Candidates can see every flag against them and dispute it, with an LLM producing a neutral
summary of the dispute for the reviewer (explicitly barred from recommending a verdict).
→ [`09-trust-and-fraud-prevention.md`](Documentation/09-trust-and-fraud-prevention.md)

## Roles

Candidate, Recruiter, Organizer, Judge, Admin — each with its own route group and dashboard. Short
version of what each role can do:

- **Candidate** — connect GitHub + resume + certificates to build a verified profile and Talent
  Score with full evidence breakdown; get skill-gap/salary guidance; generate a resume and public
  portfolio; take assessments and AI interviews in-browser; see and dispute any fraud flag raised
  against them; submit hackathon projects directly.
- **Recruiter** — post a job and get an auto-ranked, explained match list; search candidates in
  plain language via Copilot; run candidates through a pipeline kanban; assign assessments or AI
  interviews; read full (not black-box) interview reports; track hiring funnel analytics; get
  notified when a watchlisted skill/hackathon produces a top performer; see trust flags as
  information only — never a silent pre-filter.
- **Organizer** — stand up a hackathon event, assign judges, let teams submit repo + deck directly;
  get an automatic ranking blending judge scores with AI-scored code and pitch quality; publish a
  leaderboard; finalized rankings automatically notify matching recruiter watchlists.
- **Judge** — see only the submissions assigned to them, with an AI-generated summary of each so
  they aren't reading a full deck cold; score against one fixed rubric shared by every judge.
- **Admin** — work the fraud review queue with full evidence attached; uphold or dismiss flags with
  a mandatory written reason; review a candidate's dispute alongside the original evidence; manage
  platform roles; audit any action taken by any role.

See [`Documentation/13-role-flows-and-use-cases.md`](Documentation/13-role-flows-and-use-cases.md)
for the full step-by-step walkthrough of each role's flow.

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

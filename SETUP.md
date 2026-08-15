# TRACE — Setup & Run Guide

Local development setup, from a clean machine to a running app.

Everything here was verified against this repo on Windows 11 with PowerShell. Where a
value is environment-specific it is called out rather than assumed.

---

## 1. Prerequisites

Install these first. Versions listed are what the project is currently verified against.

| Tool | Version used | Purpose | Install |
| :--- | :--- | :--- | :--- |
| **uv** | 0.11.25 | Python env + dependency manager | `winget install astral-sh.uv` or see [astral.sh/uv](https://docs.astral.sh/uv/getting-started/installation/) |
| **Node.js** | 22.17.1 | Frontend runtime | [nodejs.org](https://nodejs.org/) (LTS) |
| **Docker Desktop** | 29.1.2 | Runs Postgres, Qdrant, Redis | [docker.com](https://www.docker.com/products/docker-desktop/) |

Python itself is **not** a prerequisite — uv downloads the correct interpreter
(CPython 3.12) automatically.

### Optional

- **Tesseract OCR** — only needed for certificate OCR. Without it, certificate
  uploads fail but everything else works. [Windows installer](https://github.com/UB-Mannheim/tesseract/wiki).

Verify your prerequisites:

```powershell
uv --version
node --version
docker --version
```

---

## 2. Get the code

```powershell
git clone <your-repo-url> TRACE
cd TRACE
```

---

## 3. Python environment

One command. It reads `pyproject.toml`, creates `.venv/` in the repo root, and installs
every pinned dependency from `uv.lock`:

```powershell
uv sync
```

**This downloads ~2.5 GB** (PyTorch and the sentence-transformers stack) and takes
several minutes on a first run. Later runs are near-instant.

You do **not** need to activate the venv. Either prefix commands with `uv run`, or call
`.venv\Scripts\python.exe` directly — both forms appear below.

Verify:

```powershell
uv run python -c "from services.api.main import app; print(len(app.routes), 'routes')"
```

Expect `15 routes`.

---

## 4. Frontend dependencies

```powershell
cd apps\web
npm install
cd ..\..
```

---

## 5. Environment variables

```powershell
copy .env.example .env
```

Then open `.env` and set the values below.

### Required — the app will not start without these

**`DATABASE_URL`** and **`JWT_SECRET_KEY`** are the only two settings with no default
(`services/api/core/config.py`).

```ini
DATABASE_URL=postgresql+asyncpg://dev:dev@localhost:5432/talent_platform
JWT_SECRET_KEY=<generate this>
```

Generate a secret:

```powershell
uv run python -c "import secrets; print(secrets.token_urlsafe(48))"
```

> **Auth is self-hosted.** bcrypt password hashing plus HS256 JWTs issued by this API.
> There is no external identity provider.

### Recommended — local infrastructure

These match the Docker Compose defaults, so leave them as-is unless you changed ports:

```ini
REDIS_URL=redis://localhost:6379
QDRANT_URL=http://localhost:6333
NEXT_PUBLIC_API_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
```

### Optional — degrade gracefully when absent

| Variable | Without it |
| :--- | :--- |
| `ANTHROPIC_API_KEY` (or `OPENAI_API_KEY`, `GEMINI_API_KEY`, `GROK_API_KEY`) | Agents fall back to deterministic rules; LLM-scored features return `None` instead of a fabricated score |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | "Connect GitHub" cannot complete |
| `CLOUDINARY_URL` | File uploads have nowhere to go |
| `LANGFUSE_*` | No tracing (no-op, not an error) |
| `SENTRY_DSN` | No error reporting |

Set `LLM_PROVIDER` to match whichever key you supplied: `anthropic`, `openai`, `grok`,
`gemini`, or `openai_compatible`.

The frontend also needs its own copy of the API URL — `apps/web/.env.local`:

```ini
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 6. Start the databases

```powershell
docker compose -f infra\docker-compose.yml up -d
```

Starts three containers: `trace_postgres` (5432), `trace_qdrant` (6333/6334),
`trace_redis` (6379).

Wait for health before continuing:

```powershell
docker ps
```

Postgres and Redis should read `(healthy)`. Qdrant has no healthcheck configured, so it
only shows `Up`.

---

## 7. Create the schema

```powershell
uv run alembic upgrade head
```

Applies the schema. Safe to re-run — it no-ops when already current.

> The 33-revision chain was squashed to a **single baseline** on 2026-08-16. Alembic is
> still in use; there is just one revision to replay instead of thirty-three. Verified by
> building a fresh database from the baseline and diffing `pg_dump --schema-only` against
> the live schema — identical.

Verify:

```powershell
uv run alembic current
```

---

## 8. Seed demo data

```powershell
uv run python scripts\seed_db.py
uv run python scripts\seed_candidates_hardcoded.py
```

> **These two seed scripts are not idempotent.** Running them against an already-seeded
> database raises `UniqueViolationError` on a duplicate key. That is harmless — it means
> the data is already there — but it is not a clean re-run. To start over, see
> [Reset the database](#reset-the-database).

### Populate the scoring population and vector DB

```powershell
uv run python scripts\seed_realistic_population.py
```

Generates 60 correlated, archetype-based candidates and writes real embeddings to
Qdrant. Unlike the two scripts above this one **is** idempotent — it skips candidates
whose email already exists, and vector point ids are deterministic — so re-running is
safe.

Two features are dark without it:

| Without it | Why |
| :--- | :--- |
| Every sub-score is a fixed constant | `percentile_normalize` needs 30+ scored candidates before it ranks anything; below that it returns a flat fallback |
| Job matching / Copilot search return "no evidence" | The Qdrant collections are empty, so project relevance is `None` for everyone |

The data is deliberately correlated rather than random: candidates are drawn from six
real stacks (backend, frontend, ML, infra, mobile, data), and seniority moves scores,
repo count, stars and commit volume together. Uniformly random data would make every
percentile ~50 and make semantic search look broken while working correctly.

| Flag | Effect |
| :--- | :--- |
| `-n 100` | Generate a different number of candidates |
| `--seed 42` | Change the RNG seed (default `20260816`, so runs are reproducible) |
| `--no-vectors` | Skip Qdrant — Postgres rows only |

Generated accounts use `<name>.<nnn>@synthetic.trace.dev` with the same
`password123`, so they are easy to tell apart from the demo accounts above.

### Demo accounts

All use the password `password123`:

| Role | Email |
| :--- | :--- |
| Candidate | `demo_candidate@trace.dev` |
| Recruiter | `demo_recruiter@trace.dev` |
| Organizer | `demo_organizer@trace.dev` |
| Judge | `demo_judge@trace.dev` |
| Admin | `demo_admin@trace.dev` |

---

## 9. Run everything

### The easy way

```powershell
powershell -ExecutionPolicy Bypass -File scripts\dev-up.ps1
```

Starts Docker infra if needed, then opens three windows: API, worker, frontend. It also
force-frees ports 3000 and 8000 first, so anything already listening there is killed.

### Restart when things get stuck

```powershell
powershell -ExecutionPolicy Bypass -File scripts\dev-restart.ps1
```

Kills everything TRACE-related and starts fresh. Unlike `dev-up.ps1`, this also stops the
**background worker** — which binds no port, so port-based cleanup never finds it — and
any orphaned uvicorn/Next process that lost its port but kept running. Process matching is
scoped to this repo, so Python from other projects is never touched.

| Flag | Effect |
| :--- | :--- |
| *(none)* | Kill everything, then start fresh |
| `-NoStart` | Only stop; don't restart |
| `-Clean` | Also delete `apps\web\.next` (fixes a corrupt build cache) |
| `-RestartDocker` | Also restart the Postgres/Qdrant/Redis containers |

### Manually — three terminals

```powershell
# Terminal 1 — API
uv run uvicorn services.api.main:app --reload --port 8000

# Terminal 2 — background worker
uv run python -m services.workers.runner

# Terminal 3 — frontend
cd apps\web
npm run dev
```

The **worker is not optional** for AI features. Ingestion, job matching, assessment
grading, deck analysis and ranking all run there. Without it those jobs sit queued and
the UI polls until it times out.

### URLs

| Service | URL |
| :--- | :--- |
| Frontend | http://localhost:3000 |
| API | http://localhost:8000 |
| API docs | http://localhost:8000/docs |
| Qdrant dashboard | http://localhost:6333/dashboard |

---

## 10. First run

1. Open http://localhost:3000
2. Sign in as `demo_candidate@trace.dev` / `password123`
3. You land on `/home` — the role-based hub listing every feature available to you

> **The API takes ~10–30s to become ready on first boot.** It pre-warms a 1.3 GB
> embedding model at startup. Signing in before that finishes shows a "Failed to fetch"
> error; wait for `Application startup complete` in the API terminal and retry.

---

## Common tasks

### Run the tests

```powershell
uv run pytest
```

82 tests, all passing as of this writing. They cover the pure scoring functions and need
no database.

### Run the browser tests

Needs the full stack running and the database seeded.

```powershell
cd apps\web
npm run e2e
```

Run these against a **production build** — the webpack dev server compiles each route on
first request (3–15s), which overruns the specs' navigation timeouts. See
`apps/web/e2e/README.md` for the exact commands.

### Typecheck and lint the frontend

```powershell
cd apps\web
npx tsc --noEmit
npx eslint src
npm run build
```

### Add a Python dependency

```powershell
uv add <package>
```

Updates `pyproject.toml` and `uv.lock` together. Commit both.

### Add a database column

1. Edit the model in `packages/db/models/`
2. `uv run alembic revision --autogenerate -m "description"`
3. **Read the generated migration.** Autogenerate misses CHECK constraint changes and
   server defaults, and this schema relies heavily on CHECK constraints.
4. `uv run alembic upgrade head`

### Reset the database

Destroys all data:

```powershell
docker compose -f infra\docker-compose.yml down -v
docker compose -f infra\docker-compose.yml up -d
# wait for healthy, then
uv run alembic upgrade head
uv run python scripts\seed_db.py
uv run python scripts\seed_candidates_hardcoded.py
uv run python scripts\seed_realistic_population.py
```

`docker compose down -v` drops the Qdrant volume too, so the vector collections come
back empty — `seed_realistic_population.py` repopulates them.

---

## Troubleshooting

| Symptom | Cause | Fix |
| :--- | :--- | :--- |
| `Failed to fetch` right after sign-in | API still pre-warming the embedding model | Wait for `Application startup complete`, then retry |
| `ModuleNotFoundError` | Env out of sync with the manifest | `uv sync` |
| `connection refused` on 5432 | Containers not running | `docker compose -f infra\docker-compose.yml up -d` |
| Alembic: `Can't locate revision` | DB predates current migrations | Reset the database (above) |
| `UniqueViolationError` while seeding | Already seeded | Harmless, or reset first |
| Port 3000/8000 in use | Previous run still alive | `dev-up.ps1` frees them, or kill the PID from `netstat -ano` |
| Jobs stuck at "processing" | Worker not running | Start `uv run python -m services.workers.runner` |
| Certificate OCR fails | Tesseract not installed | Install it, or skip certificate uploads |

### Known gaps

- **The interview lobby's permission branches are untested in a browser.** Grant both,
  deny camera only, deny both, and no-devices are handled in code but have not been
  exercised. `playwright.config.ts` already passes `--use-fake-device-for-media-capture`,
  so testing this needs no webcam.
- **The live LLM loop is only partly verified.** Question generation was observed working
  end-to-end once; a full interview run (turn evaluation → follow-up → report) has not
  been exercised against a real model.

---

## Project layout

```
TRACE/
├── pyproject.toml         Python dependencies (uv)
├── uv.lock                Pinned versions — commit this
├── .venv/                 Created by `uv sync`
├── alembic.ini
├── infra/                 docker-compose.yml
├── scripts/               dev-up.ps1, seeders
├── packages/
│   ├── db/                SQLAlchemy models + Alembic migrations
│   ├── shared_schemas/    Pydantic contracts
│   └── prompts/
├── services/
│   ├── api/               FastAPI app
│   ├── agents/            LangGraph subgraphs
│   └── workers/           arq worker
└── apps/web/              Next.js frontend
```

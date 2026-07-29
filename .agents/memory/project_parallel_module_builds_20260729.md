---
name: parallel-module-builds-20260729
description: "COMPLETED 2026-07-29: All 3 parallel worktree builds (Module 01 FR-4, FR-5, Module 04 PPT Analyzer) merged into main. Worktrees cleaned up. Next: Module 02 Recruitment Platform."
metadata:
  node_type: memory
  type: project
  originSessionId: 0f392849-bc56-42a0-9b8b-f5ba099635df
  modified: 2026-07-29T17:26:00.000Z
---

## STATUS: FULLY COMPLETE — read this before touching anything

All three parallel worktree agent builds are **merged into `main`** and worktrees are removed.
`main` HEAD is `8f6327a`. Working tree is clean. No conflicts anywhere.

---

## What was built (all on `main` as of 2026-07-29 17:26 IST)

Per `doc/multi-agent-architecture/00-master-architecture.md §7 Build Order`, **Module 01 (Candidate
Intelligence)** is now fully implemented across all FRs, and **Module 04 (PPT Analyzer)** is done.

### Module 01 FR-1/2/3 — Talent Profile Engine (done before this session)
Base commit `fc707f8`. Tables, LangGraph Flow A (ingest → score → innovate → badge), GitHub OAuth,
PDF/cert ingest, conflict resolution, scoring endpoints. See `project_module01_candidate_core_loop.md`.
Migration head at time of branching: `44fd41ed1de0`.

### Module 01 FR-5 — AI Resume & Portfolio Builder (commit `202245d`, merge tag)
- **Migration**: `a76c622e4c08` (`down_revision = '44fd41ed1de0'`)
  → `packages/db/migrations/versions/a76c622e4c08_resume_portfolio_builder_tables.py`
  → Adds: `generated_documents` table, `username` + `portfolio_published` columns on `candidate_profiles`
- **LangGraph**: Flow B subgraph — `resume_graph.py` (generate → fact-check → retry-or-end)
  → `services/agents/candidate_intelligence/resume_graph.py`
  → Nodes: `nodes/document_generator.py`, `nodes/fact_check.py`
  → Tools: `tools/document_generation.py` (Claude Sonnet), `tools/fact_check.py` (Claude Haiku),
           `tools/resume_pdf.py` (WeasyPrint HTML→PDF)
  → State: `document_state.py`
- **API endpoints** (all in `services/api/routers/candidates.py`):
  - `POST /candidates/me/resume/generate` — generate + fact-check + PDF upload
  - `POST /candidates/me/cover-letter/generate`
  - `GET  /candidates/me/documents`
  - `POST /candidates/me/portfolio/publish`
  - `POST /candidates/me/portfolio/unpublish`
  - `GET  /public/candidates/{username}` (via `services/api/routers/public.py`)
- **Frontend**: `apps/web/src/app/(candidate)/resume-builder/page.tsx`
  - `apps/web/src/app/(public)/[username]/page.tsx` (SSR public portfolio)
- **API client**: `apps/web/src/lib/api.ts` — `generateResume`, `generateCoverLetter`,
  `fetchMyDocuments`, `publishPortfolio`, `unpublishPortfolio`, `fetchPublicPortfolio`
- **Schema**: `packages/shared_schemas/candidates.py` adds FR-5 Pydantic models

### Module 01 FR-4 — AI Career Guidance System (commit `e76c86a`, merge tag)
- **Migration**: `a333d4c53bd0` (`down_revision = 'a76c622e4c08'`) — linearized to chain after FR-5
  → `packages/db/migrations/versions/a333d4c53bd0_career_guidance_tables.py`
  → Adds: `career_recommendations` table, `course_catalog` table (seeded), `CourseCatalogEntry` +
           `CareerRecommendation` ORM models in `packages/db/models.py`
- **LangGraph**: `services/agents/candidate_intelligence/career_guidance_graph.py`
  → Parallel fan-out: `skill_gap_analysis` ‖ `salary_prediction` ‖ `certification_mapping`
    → `career_roadmap` (sequential after skill-gap)
  → Nodes: `nodes/skill_gap_analysis.py`, `nodes/career_roadmap.py`,
           `nodes/salary_prediction.py`, `nodes/certification_mapping.py`
  → Tools: `tools/skill_gap.py` (Qdrant embed cosine), `tools/roadmap.py` (Anthropic),
           `tools/salary_model.py` (joblib regressor), `tools/role_taxonomy.py` (ROLE_SKILL_TAXONOMY),
           `tools/course_catalog.py`, `tools/train_salary_model.py` (offline training script)
  → State: `CareerGuidanceState` added to `services/agents/candidate_intelligence/state.py`
- **API endpoint**: `GET /candidates/me/career-guidance?target_role=&refresh=` (cached, 24h TTL)
  → `services/api/routers/candidates.py`
- **Frontend**: `apps/web/src/app/(candidate)/career/page.tsx`
  → Components: `CareerGuidance.tsx`, `RoadmapTimeline.tsx`, `SalaryRangeChart.tsx`
- **API client**: `apps/web/src/lib/api.ts` — `fetchCareerGuidance`, `CAREER_GUIDANCE_ROLES`,
  `SkillGap`, `CourseRecommendation`, `RoadmapStage`, `CareerGuidanceResponse` interfaces
- **Config**: `salary_model_path` added to `services/api/core/config.py`
- **Dashboard**: Career card deliberately NOT added to `CandidateDashboard.tsx` (user's explicit choice)
  — the `/career` page is navigable directly; add a dashboard card later if desired.

### Module 04 — PPT Pitch Deck Analyzer (commit `8f6327a`, merge tag)
- **Migration**: `e8a55dc975da` (`down_revision = 'a333d4c53bd0'`) — linearized to chain after FR-4
  → `packages/db/migrations/versions/e8a55dc975da_ppt_analyzer_tables.py`
  → Adds: `presentations` + `presentation_slide_embeddings` tables
- **LangGraph**: `services/agents/ppt_analyzer/graph.py`
  → Parallel rubric branches: format_normalization → content_extraction → [5 parallel AI agents]
    → aggregation → summary_suggestions
- **API endpoints** (all in `services/api/routers/presentations.py`):
  - `POST /presentations/upload` — upload .pptx/.ppt, run pipeline, return report
  - `GET  /presentations/{id}/status`
  - `GET  /presentations/{id}/report`
  - `GET  /presentations/{id}/plagiarism-matches`
- **Frontend**:
  - `apps/web/src/app/(candidate)/pitch-deck/page.tsx` (upload — candidate-only)
  - `apps/web/src/app/pitch-deck/[id]/page.tsx` (report — no role restriction, judges/recruiters too)
  - Components: `AIContentSignalBadge.tsx`, `PitchScoreRadarChart.tsx`,
                `PlagiarismMatchList.tsx`, `SlideViewer.tsx`
- **Config**: `presentation_max_file_size_mb`, `libreoffice_binary` added to `config.py`
- **`services/api/main.py`**: registers `presentations.router` + `public.router`

---

## DB Migration chain (linear, single head)

```
44fd41ed1de0 (base: candidate_intelligence_tables)
  -> a76c622e4c08 (FR-5: resume/portfolio tables)
  -> a333d4c53bd0 (FR-4: career guidance + course catalog tables)
  -> e8a55dc975da (Module 04: presentations + slide embeddings tables)
```

Run `alembic upgrade head` (from `services/api/`) against the Neon dev DB to apply all 3 migrations.
The migrations have NOT yet been applied against the live Neon DB — this must happen before running
any of the new endpoints end-to-end (even the non-LLM paths will fail with "relation does not exist").

---

## Keys blocking live end-to-end testing (per `services/api/core/config.py`)

| Key | Status | Blocks |
|-----|--------|--------|
| `ANTHROPIC_API_KEY` | **MISSING** — not purchased yet | FR-4 roadmap, FR-5 generate/fact-check, Module 04 rubric scoring |
| `CLOUDINARY_URL` | **MISSING** | FR-5 resume PDF storage, Module 04 deck storage |
| `DATABASE_URL` | present (Neon) | — |
| `CLERK_SECRET_KEY` / `CLERK_JWKS_URL` / `CLERK_ISSUER` | present | — |
| `QDRANT_URL` / `QDRANT_API_KEY` | present (Qdrant Cloud) | FR-4 skill-gap cosine, Module 04 plagiarism |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | present | — |

All missing-key paths degrade to typed errors (never fabricated data). No endpoint will 500 — they
return structured `503 SERVICE_UNAVAILABLE` with a clear `"unavailable: ANTHROPIC_API_KEY not set"`.

---

## What's next per `doc/multi-agent-architecture/00-master-architecture.md §7`

Build Order step 3: **Module 02 — AI Recruitment Platform** (`doc/SRS/02-SRS-AI-Recruitment-Platform.md`,
`doc/multi-agent-architecture/02-recruitment-platform.md`).

Module 02 depends on Module 01's `candidate_profiles`, `talent_scores`, and `badges` tables — all present.
It does NOT depend on any FR-4/FR-5/Module 04 output, so it can be built independently.

Key scope (read doc 02 for full spec):
- Three-stage matching: SQL pre-filter → Qdrant vector search → Claude Sonnet re-ranking
- Recruiter Copilot: conversational NL candidate search (`POST /recruiter/copilot`)
- Job posting CRUD + ATS status Kanban
- Match score explanations (per-candidate reasoning)

---

## Worktree status
All 3 worktrees (`agent-a5bb5f7bdf864e68e`, `agent-a8ffa119f4ae8a6d9`, `agent-a65b3f366de8e6465`)
are **removed**. Only `D:/Programming/DataAxle [main]` exists. Do NOT attempt `git worktree list`
expecting any other entries — they are gone.

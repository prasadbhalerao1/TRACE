---
name: module01-candidate-core-loop
description: "COMPLETE 2026-07-29: ALL FRs (1/2/3/4/5) for Module 01 (Candidate Intelligence) are merged into main. Module 04 PPT Analyzer also done. Next: Module 02 Recruitment."
metadata:
  node_type: memory
  type: project
  originSessionId: 16352565-6648-4267-adde-3cdec207f5a5
  modified: 2026-07-29T17:26:00.000Z
---

## Module 01 (Candidate Intelligence) — FULLY COMPLETE on `main`

All 5 Functional Requirements from `doc/SRS/01-SRS-Candidate-Intelligence-Platform.md` are built and
merged. See `project_parallel_module_builds_20260729.md` for the full file inventory and migration chain.

| FR | Name | Status | Key files |
|----|------|--------|-----------|
| FR-1 | GitHub / Resume / Certificate Ingestion | ✅ Done | `services/agents/candidate_intelligence/graph.py` (Flow A) |
| FR-2 | Talent Score (7 sub-scores) | ✅ Done | `services/agents/candidate_intelligence/nodes/` |
| FR-3 | Dashboard (Evidence Receipt, charts, badges) | ✅ Done | `apps/web/src/app/dashboard/page.tsx` |
| FR-4 | AI Career Guidance (skill gaps, roadmap, salary) | ✅ Done | `career_guidance_graph.py`, `GET /candidates/me/career-guidance` |
| FR-5 | AI Resume & Portfolio Builder (fact-check, PDF, SSR) | ✅ Done | `resume_graph.py`, `POST /candidates/me/resume/generate` |

**Module 04 PPT Analyzer** also done — see `project_parallel_module_builds_20260729.md`.

## DB Migration chain (applied order, all on main)
```
44fd41ed1de0 → a76c622e4c08 (FR-5) → a333d4c53bd0 (FR-4) → e8a55dc975da (Module 04)
```
**Run `alembic upgrade head` from `services/api/` before testing any FR-4/5/Module04 endpoint.**

## Still blocking live end-to-end testing
- `ANTHROPIC_API_KEY` — not yet purchased. Needed for FR-4 roadmap generation, FR-5
  resume/fact-check, Module 04 rubric scoring. All paths degrade gracefully (503, no fabrication).
- `CLOUDINARY_URL` — needed for FR-5 resume PDF storage + Module 04 deck storage. Same graceful degrade.
- GitHub OAuth `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — configured; real end-to-end test not done.
- Qdrant — configured (cloud); FR-4 skill-gap cosine + Module 04 plagiarism need real collection data.
- Salary model — `data/models/salary_regressor.joblib` does not exist yet; run
  `services/agents/candidate_intelligence/tools/train_salary_model.py` to produce it.

## What's next
Per `doc/multi-agent-architecture/00-master-architecture.md §7 Build Order`:
**Module 02 — AI Recruitment Platform** (`doc/SRS/02-SRS-AI-Recruitment-Platform.md`,
`doc/multi-agent-architecture/02-recruitment-platform.md`).
Depends on Module 01's `candidate_profiles`, `talent_scores`, `badges` — all present.

---
name: project-module02-recruitment-platform-prep
description: "PREPARATION: Architecture blueprint for Module 02 (AI Recruitment Platform). Outlines 3-stage candidate matching pipeline, Recruiter Copilot, job CRUD, ATS Kanban, and required DB schemas."
metadata:
  node_type: memory
  type: project
  originSessionId: 540f899a-95df-4bba-a0c6-f4d22579da39
  modified: 2026-07-29T17:50:00.000Z
---

## Module 02 — AI Recruitment Platform Architecture Blueprint

Per `doc/SRS/02-SRS-AI-Recruitment-Platform.md`, `doc/multi-agent-architecture/02-recruitment-platform.md`, and `doc/multi-agent-architecture/00-master-architecture.md §7`, **Module 02** is the second core module in the build sequence.

### 1. Prerequisites (All Satisfied)
Module 02 consumes candidate data produced by Module 01:
- `candidate_profiles` table (skills, experience, location, headline, username)
- `talent_scores` table (overall talent score & 7 sub-scores)
- `badges` table (verified skill corroborations)

### 2. Core Functional Requirements
- **FR-1: Job Posting CRUD & Management**
  - Schema: `jobs` table (`title`, `department`, `location`, `employment_type`, `required_skills`, `min_experience_years`, `salary_range`, `status`, `organization_id`, `created_by`)
- **FR-2: 3-Stage Candidate Matching Pipeline**
  - **Stage 1 (SQL Pre-Filter)**: Structured query on location, minimum experience, and required skill overlaps.
  - **Stage 2 (Qdrant Vector Search)**: Cosine similarity matching between job description embeddings and candidate profile embeddings.
  - **Stage 3 (Claude Sonnet Re-Ranking & Rationale)**: Top K candidates re-ranked by LLM with per-candidate match score breakdown and explanatory rationale.
- **FR-3: Recruiter Copilot (`POST /recruiter/copilot`)**
  - Conversational natural language interface for candidate discovery (e.g., *"Find senior backend engineers with Python and Go who built high-complexity projects"*).
  - Graph: `services/agents/recruitment/recruiter_copilot_graph.py`.
- **FR-4: ATS Status & Kanban Pipeline**
  - Schema: `job_applications` table (`job_id`, `candidate_id`, `stage` enum: `applied`, `screening`, `interview`, `offer`, `rejected`, `hired`, `notes`, `match_score`).

### 3. Implementation Step Sequence
1. **DB Migration**: Create `jobs`, `job_applications`, `recruiter_conversations` tables in `packages/db/models.py` and generate Alembic migration.
2. **Deterministic Tools**: SQL filter tool, Qdrant profile vector search tool, match score scoring formulas.
3. **LangGraph Subgraph**: `services/agents/recruitment/` (matching agent + copilot agent).
4. **FastAPI Router**: `services/api/routers/recruitment.py` (job CRUD, matching endpoint, copilot endpoint, application stage updates).
5. **Frontend Pages**: `apps/web/src/app/(recruiter)/jobs/` (job list + creation), `(recruiter)/jobs/[id]/candidates/` (candidate match list + copilot chat), `(recruiter)/applications/` (Kanban board).

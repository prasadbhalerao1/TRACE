---
name: project-candidate-workflow-ui-completed
description: "COMPLETED 2026-07-29: Candidate Dashboard 4-action grid wired to all Module 01 & Module 04 features (/profile/edit, /resume-builder, /career, /pitch-deck). API client types aligned with shared schemas. DB verified at head (e8a55dc975da)."
metadata:
  node_type: memory
  type: project
  originSessionId: 540f899a-95df-4bba-a0c6-f4d22579da39
  modified: 2026-07-29T17:50:00.000Z
---

## Candidate Workflow UI & Dashboard Integration — COMPLETED

All candidate-facing features across **Module 01 (Candidate Intelligence)** and **Module 04 (PPT Pitch Deck Analyzer)** are fully integrated and accessible directly from the candidate dashboard.

### 1. Dashboard Launchpad (`apps/web/src/components/CandidateDashboard.tsx`)
The candidate dashboard layout was updated with a responsive 4-action grid giving immediate access to:
- **Connect / Update Evidence**: `[Link to /profile/edit]` (GitHub OAuth, Resume upload & parsing, Certificate upload & OCR)
- **Build Resume & Portfolio**: `[Link to /resume-builder]` (Fact-checked AI resumes, cover letters, WeasyPrint PDF, public SSR portfolio)
- **AI Career Guidance**: `[Link to /career]` (Skill gap analysis, roadmap timeline, salary range estimation, course recommendations)
- **Pitch Deck Analyzer**: `[Link to /pitch-deck]` (PowerPoint deck upload, 5-agent rubric scoring, AI content signal, Qdrant plagiarism detection)

The dashboard container in `apps/web/src/app/dashboard/page.tsx` was expanded from `max-w-2xl` to `max-w-4xl` for proper display of radar charts, score history, evidence receipts, badges, and action buttons.

### 2. Module 04 API Schema Alignment (`apps/web/src/lib/api.ts`)
Client-side helper functions and TypeScript interfaces in `apps/web/src/lib/api.ts` were updated to match `packages/shared_schemas/presentations.py` exactly:
- `PITCH_SCORE_LABELS`: Maps `innovation`, `technical_feasibility`, `presentation_quality`, `business_potential`
- `AIContentSignal`: `{ score: number | null, confidence_label: string, flagged_sections: string[], rationale: string }`
- `RubricScore`: `{ value: number | null, rationale: string | null, gaps: string[] }`
- `PlagiarismMatchOut`: `{ id: string, presentation_id: string, matched_presentation_id: string, slide_index: number, similarity: number, flagged_at: string }`
- `SlideOut`: `{ slide_index: number, title: string | null, body: string | null, notes: string | null, has_image: boolean, ocr_text: string | null }`
- `PresentationReportResponse` & `PresentationUploadResponse` models
- `uploadPresentation()` and `fetchPresentationReport()` API client functions

### 3. Database Migration Status
- Verified database head using `alembic current` against the Neon dev DB.
- Current DB head: `e8a55dc975da (head)` (includes all base tables, FR-5 resume tables, FR-4 career tables, and Module 04 presentation tables).

### 4. Build & Type Verification
- Ran `npx tsc --noEmit` in `apps/web` — **0 errors**.
- Working tree committed cleanly on `main` at `767a66c`.

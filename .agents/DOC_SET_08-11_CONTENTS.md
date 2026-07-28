# Contents of `doc/multi-agent-architecture/08-11`
**Purpose:** These four docs have no counterpart in `doc/SRS/` — they're permanent, current reference material, not a migration staging area.
**Status:** Current. Read directly from `doc/multi-agent-architecture/`; there is no plan to copy or delete them.

---

## Summary

| Doc | File | Contains |
|---|---|---|
| 08 | `08-algorithms-and-formulas.md` | Mathematical specs for every scoring system: Talent Score™, Job Matching, code plagiarism/structural similarity |
| 09 | `09-ui-design-system.md` | Design tokens, typography, component library, landing page structure, Evidence Receipt component spec |
| 10 | `10-folder-structure-and-accessibility.md` | Complete repo folder structure, page routes per role, component inventory, accessibility specs |
| 11 | `11-role-flows-and-use-cases.md` | Step-by-step flows for all 5 roles + plain-English use cases |

---

## Detailed Content Breakdown

### Doc 08: Algorithms & Formulas

**Contains:** Mathematical specs for all scoring systems
**Critical for:** Implementation of Talent Score, Job Matching, Code Plagiarism detection, etc.

**Key sections:**
1. Talent Score™ formula (weighted 7 sub-scores)
   - Dynamic weight renormalization for cold start
   - Practical notes on complexity penalties
   - What NOT to include (fraud stays separate)
2. Job Matching Score (4-term formula)
   - Semantic similarity blending
   - Skill overlap weighting
3. Code Plagiarism / Structural Similarity (Modules 3 & 6)
   - Detection logic for duplicate/near-duplicate submissions

**When implementing scoring logic:** read this doc fully before writing the formula in code. Mark constants as "tunable default" vs "validated" as you go.

---

### Doc 09: UI Design System

**Contains:** Visual identity, component specs, landing page structure
**Critical for:** Frontend dev, designer onboarding, landing page build

**Key sections:**
1. Design Concept — "Proof over paperwork" thesis
   - The Evidence Receipt component (signature element, used everywhere: dashboards, reports, fraud flags)
2. Design Tokens (6 colors, 3 fonts)
   - `ink` (#12161C), `paper` (#F3F4F1)
   - `teal-verified`, `amber-pending`, `rose-flagged`, `slate`
   - Space Grotesk, IBM Plex Sans, IBM Plex Mono
3. Frontend Libraries
   - Next.js 14+, Tailwind, shadcn/ui
   - Recharts, dnd-kit, Monaco, Framer Motion
4. Landing Page Section Plan
   - Nav, Hero (live Evidence Receipt animation)
   - Problem/solution section, How it works (01–04)
   - For Candidates / For Recruiters splits
   - Trust section linking to fraud/review flow

These tokens are already wired into `apps/web/src/app/globals.css` (Tailwind v4 `@theme` block) and `layout.tsx` (fonts) — see [nextjs-frontend skill](.claude/skills/nextjs-frontend/SKILL.md).

---

### Doc 10: Folder Structure & Accessibility

**Contains:** Complete repo layout with all routes, components, role-based page structure
**Critical for:** Project setup, navigation, component inventory

**Key sections:**
1. Complete Repository Structure
   - `/apps/web/(public)` — landing, sign-in/up, candidate portfolio, hackathon leaderboard
   - `/apps/web/(candidate)` — dashboard, profile, career, resume builder, assessments, interview, disputes
   - `/apps/web/(recruiter)` — dashboard, jobs, matches, copilot, pipeline, analytics, top performers, reports
   - `/apps/web/(organizer)` — hackathon mgmt, rankings
   - `/apps/web/(judge)` — evaluation queue, rubric scoring
   - `/apps/web/(admin)` — fraud review, user mgmt, audit log
   - `/components` — 25+ component specs (EvidenceReceipt, KanbanBoard, CodeEditor, etc.)
2. Role-Based Accessibility
   - Each route has implied RBAC middleware
   - Component reuse across roles

The route-group tree from this doc is already scaffolded under `apps/web/src/app/`.

---

### Doc 11: Role Flows & Use Cases

**Contains:** Step-by-step walkthroughs for all 5 user types + 40+ plain-English use cases
**Critical for:** UX design, acceptance testing, user stories

**Key sections:**
1. Candidate Flow (14 steps) — sign up → connect GitHub → upload resume → conflicts → career guidance → generate portfolio → assessments → interview → dispute flags → hackathon submission
2. Recruiter Flow (10 steps + 8 use cases) — post job → see matches → use Copilot → move through pipeline → assign work → review reports → check analytics → watch hackathons → see fraud flags (never auto-filtered)
3. Organizer Flow (6 steps) — create event → assign judges → teams submit → scoring → auto-combine judge scores + module scores → notify recruiters
4. Judge Flow (4 steps) — view queue → score against rubric
5. Admin Flow (implied, not fully detailed)

Use these as acceptance criteria / demo script material.

---

## Handoff by Role

- **Frontend lead:** `09-ui-design-system.md` + `10-folder-structure-and-accessibility.md`
- **QA/Test lead:** `11-role-flows-and-use-cases.md` (for acceptance criteria)
- **Backend/Algorithm lead:** `08-algorithms-and-formulas.md`
- **All devs:** `DOCUMENTATION_MAP.md` for how this fits with `doc/SRS/`

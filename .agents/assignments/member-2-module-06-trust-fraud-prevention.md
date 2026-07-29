# Member 2 — Module 06: Trust & Fraud Prevention

**This file is self-contained.** You should not need to open any other person's assignment file.
If you need shared context (build order, doc precedence, decision history), read these three repo
files in this order before writing code: `.agents/BUILD_ROADMAP.md`, `.agents/DOCUMENTATION_MAP.md`,
`.agents/decisions.md`. Then read `doc/SRS/06-SRS-Trust-Fraud-Prevention.md` and
`doc/multi-agent-architecture/06-trust-fraud-prevention.md` in full — **especially §7 and §8**,
which are binding design constraints, not optional notes.

## This is the highest ethical-risk module in the whole platform

A false accusation of fraud can end a candidate's opportunity unfairly. Every flag must be
evidence-linked, every score must be framed as "corroboration strength" not a guilt verdict, and a
human must be required to move anything past `raised` status. If you're ever unsure whether a
design choice crosses from "flag for review" into "automated adverse action," stop and pick the
more conservative option — don't guess toward automation.

## What already exists on `main` (as of 2026-07-29, all done and DB-verified) — you only READ these

- **Module 01**: `certifications` (candidate-uploaded certs, for FR-1 fake-cert detection),
  `candidate_profiles` (for FR-4 duplicate detection), `generated_documents` (resumes, for FR-3
  AI-content detection).
- **Module 03**: `submissions` (coding-assessment submissions, for FR-5 plagiarized-submission
  detection).
- **Module 04**: `presentations` (pitch decks — this module's own `AIContentSignal`/plagiarism
  logic in `services/agents/ppt_analyzer/` is the "shared approach" doc 06 §FR-3 refers to; read
  it before building your own AI-content heuristic so the two don't diverge in method).

You never write to another module's tables. You only add new tables for your own flags/scores and
read the above via their existing router endpoints or, for read-heavy internal joins, direct
SELECT against their tables (reading is fine, per this repo's existing cross-module convention —
e.g. Module 02's `recruitment.py` already reads Module 01's `candidate_profiles`/`talent_scores`
directly).

## Your scope (build inside-out: DB → tools → LangGraph agents → router → frontend)

Everything in `doc/SRS/06` §3 (FR-1 through FR-8):
- FR-1 Fake Certificate Detection (issuer lookup + verification URL check, or visual-forensics
  heuristic when no API/URL exists — never certainty, always low/medium/high suspicion)
- FR-2 Fake/Plagiarized Project Detection (structural code-clone detection, not text diff)
- FR-3 AI-Generated Content Detection (statistical heuristic, always confidence-banded, never a
  binary verdict — same approach as doc 04's AI-content agent, read that implementation first)
- FR-4 Duplicate Profile Detection (email variants, resume text fingerprinting, optional photo
  perceptual hashing — NOT facial recognition, see §8)
- FR-5 Plagiarized Submissions (structural similarity across Module 03 coding submissions)
- FR-6 Candidate Authenticity Score (0-100 "corroboration strength," framed positively like Module
  01's Verified Skill Badges — not a guilt score)
- FR-7 Fraud Risk Reports (every flag cites specific evidence, e.g. "certificate credential ID does
  not resolve on issuer's verification page")
- FR-8 Candidate Dispute Flow (`raised → under_review → upheld/dismissed`, always human-gated past
  `raised`)

## Data model (doc 06 §5 — copy this schema, no ambiguity)

`verification_records`, `fraud_flags`, `authenticity_scores`, `disputes`. New file:
`packages/db/models/fraud.py`.

## Agent architecture (doc 06 §4)

`services/agents/fraud/` — Issuer Lookup Agent (rules + `httpx`), Auto-Verify Agent (rules),
Visual Forensics Agent (Haiku + vision, low/medium/high suspicion only), Structural Similarity
Agent (tool: `copydetect` or similar token-based clone detector — check if it's already installed
in `services/api/.venv` before adding a new dependency; if not, `pip install` it into that venv,
same as this session confirmed `radon`/`lizard`/`bandit` were pre-installed for Module 03), Public
-Repo Cross-Check Agent (GitHub code-search API — reuse the PyGithub client pattern from
`services/agents/candidate_intelligence/tools/github.py`), Text Fingerprint Agent
(SimHash/MinHash + embedding similarity), Photo Perceptual-Hash Agent (`imagehash` — check venv
first), Perplexity Heuristic Agent (statistical, same approach as Module 04's AI-content agent —
read `services/agents/ppt_analyzer/` for the exact method before reimplementing), Authenticity
Aggregation Agent (rules, transparent weighted formula — log your weight choices to
`.agents/decisions.md` same as every other module's tunable formula), Fraud Risk Report Agent
(Sonnet, writes strictly from `signals`/evidence, never adds unsupported claims), Dispute Review
Agent (Sonnet, **assists only, cannot itself close a dispute** — this is a hard constraint, not a
suggestion).

Follow the exact node contract already used everywhere in this codebase: each node file exports
`async def run(state: FraudCheckState) -> dict`, returning only changed keys. Read
`services/agents/recruitment/` (Module 02) as your structural template, and
`services/agents/recruitment/tools/copilot_llm.py` for the anthropic tool-use schema style.

## §7/§8 — binding constraints, verify these before calling anything done

- Fraud flags **must not** be a Recruiter Copilot (Module 02) filter criterion — this is already
  enforced on Module 02's side (`services/agents/recruitment/`'s Copilot never queries a fraud
  table), you don't need to change Module 02, just don't add a backdoor into it.
- `raised` status has zero effect on visibility/ranking/Talent Score until a human moves it to
  `upheld`. Do not wire any automatic side-effect (hiding a candidate, lowering a score) off a
  `raised` flag anywhere in your code.
- Every `upheld` decision requires non-empty `review_notes` — enforce this at the API layer
  (`PATCH /flags/{id}/review`), not just as a frontend nicety.
- Photo perceptual hashing and resume text fingerprint checks MUST verify an active
  `consents` record (`consent_type = 'perceptual_photo_hash'` or `'resume_parsing'`) before
  running — reuse `_require_consent` from `services/api/routers/candidates.py` (import it, same
  as every other module does; don't duplicate the function).

## API Endpoints (doc 06 §6)

```
POST   /verification/certificates/{id}/check
POST   /verification/submissions/{id}/check
POST   /verification/profiles/{id}/duplicate-check
GET    /candidates/{id}/authenticity-score
GET    /candidates/{id}/flags
POST   /flags/{id}/dispute
PATCH  /flags/{id}/review
GET    /admin/fraud-review-queue
```
New file: `services/api/routers/fraud.py`. No route prefix, matching `recruitment.py`'s style.

## Frontend

`apps/web/src/app/(admin)/fraud-review/` and `apps/web/src/app/(candidate)/my-flags/` — check
what stub pages already exist there before creating new ones; wire them the same way Module 02/03
did (read `apps/web/src/app/(recruiter)/jobs/new/page.tsx` as the before/after pattern).

## File ownership — never touch outside this list

`packages/db/models/fraud.py`, `packages/shared_schemas/fraud.py`, `services/agents/fraud/`,
`services/api/routers/fraud.py`, `apps/web/src/app/(admin)/fraud-review/`,
`apps/web/src/app/(candidate)/my-flags/`.

## Shared files you WILL edit — expect trivial merge conflicts, not blockers

- `packages/db/models/__init__.py` — add your import block + `__all__` entries.
- `services/api/main.py` — add one `app.include_router(fraud.router)` line.
- `apps/web/src/lib/api.ts` — append your own `// --- Trust & Fraud Prevention (Module 06) ---`
  section at the end of the file.
- `.agents/decisions.md` — append your own dated section at the end.
- **Alembic migration**: run `alembic heads` right before writing your migration (not at session
  start), chain `down_revision` onto whatever you actually see. Expect a rebase at merge time if
  multiple people land migrations concurrently — already happened once this session, known/solved
  problem, see `.agents/decisions.md`'s dated entries for the precedent.

## Definition of done

Every FR in doc 06 §3 checked off, §7/§8 constraints verified. Live-verify against the real Neon
DB. `tsc --noEmit`, `eslint`, `next build` all clean, no route collisions. Commit progressively (DB
→ agents → router → frontend).

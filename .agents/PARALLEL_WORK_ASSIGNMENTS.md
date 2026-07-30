# Parallel Work Assignments (4 people, 2026-07-29)

**Each person works from their own file in `.agents/assignments/` — not this one.** This file is
just an index and the cross-cutting protocol every track shares. Hand each person exactly their
file; they should not need to open anyone else's.

| # | File | Track | Status |
|---|---|---|---|
| 1 | (was Module 03 — done, no file needed) | Assessment & Verification | **Done, merged on `main`** |
| 2 | [`assignments/member-1-module-05-hackathon-pipeline.md`](assignments/member-1-module-05-hackathon-pipeline.md) | Module 05 — Hackathon-to-Hiring Pipeline | **Done, merged on `main`** |
| 3 | [`assignments/member-2-module-06-trust-fraud-prevention.md`](assignments/member-2-module-06-trust-fraud-prevention.md) | Module 06 — Trust & Fraud Prevention | **Done, merged on `main`** (2026-07-30) |
| 4 | [`assignments/member-3-platform-hardening.md`](assignments/member-3-platform-hardening.md) | Platform Hardening & Observability | Not started (one item — global exception handler — done inline outside this track) |
| 5 | [`assignments/member-4-phase2-integration-prep.md`](assignments/member-4-phase2-integration-prep.md) | Phase 2 Integration Prep | **Parts 1-2 done, merged on `main`** (2026-07-30); Part 3 (QA journey walk) not started |

(5 files — all module-build tracks now closed out; Platform Hardening (minus the one item done
inline) and Phase 2 Part 3 are the only remaining open work.)

## Status as of this writing

All 6 product modules (Candidate Intelligence, AI Recruitment, Assessment & Verification, PPT
Analyzer, Hackathon-to-Hiring Pipeline, Trust & Fraud Prevention) are **fully merged on `main`** as
of 2026-07-30 — DB, agents, router, and frontend, live-verified against the real Neon DB. Phase 2
Integration Prep Parts 1-2 (supervisor graph demo, hackathon-rankings event consumer wiring
recruiter watchlists) are also merged. See `.agents/memory/project_platform_status_20260730.md`
for the full rollup and `.agents/decisions.md` for the detailed dated entries.

## Hard file-ownership boundaries

Each track's assignment file lists its own exclusive file/directory ownership in detail. The one
rule that applies to all four: **never edit another track's owned files.** If you need something
from another module, read it via its public router/table (never reach into another module's
internal `tools`/`nodes`), or note it as a dependency and move on — don't touch it yourself.

## Shared files everyone will touch — protocol, not avoidance

These files WILL get concurrent edits from multiple tracks. That's expected and fine — the fix is
at merge time, not by one track blocking on another. Every assignment file repeats this section so
no one has to cross-reference back here, but it's collected once more for the person merging
everything at the end:

- **`packages/db/models/__init__.py`**: each track adds its own import block + `__all__` entries.
  Trivial merge conflict, resolve by keeping both sides' additions.
- **`services/api/main.py`**: each track adds one `app.include_router(...)` line (Track 4 also adds
  additive middleware/exception-handler code here — see its file). Trivial merge, keep both.
- **`.agents/decisions.md`**: append your own dated section at the end, same format as the existing
  Module 01/02/03 entries. Never edit another track's section.
- **Alembic migration chain**: before writing your migration, run `alembic heads` against your own
  branch/worktree — do not assume any hex mentioned in an assignment file is still the real head by
  the time you get to it, other tracks are landing migrations concurrently. Chain your
  `down_revision` onto whatever head you actually see. **Expect a rebase at merge time**
  (regenerate `down_revision` so all tracks' migrations end up in one linear chain, `alembic heads`
  shows exactly one head) — this exact situation already happened once this session with 3 parallel
  migrations and is a known, solved problem; see `.agents/decisions.md`'s 2026-07-29 entries for the
  precedent (`fix(db): linearize ... migration` commits).
- **`apps/web/src/lib/api.ts`**: each track appends its own `// --- Module N ---` section at the
  end. Trivial merge, don't edit another track's section.

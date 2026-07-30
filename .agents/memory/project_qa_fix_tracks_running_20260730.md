---
name: project-qa-fix-tracks-running-20260730
description: "5 background agents (platform hardening + 4 QA-gap fixes) were running in worktrees when the session was paused 2026-07-30 — 4 of 5 stalled/failed mid-work (uncommitted WIP left behind, not lost), none merged. Read this to resume in a new session/window."
metadata:
  node_type: memory
  type: project
  modified: 2026-07-30T18:20:00.000Z
---

## Where things stand at the pause point (final snapshot before handoff)

`main` is at commit `ad04f02` (QA findings walkthrough committed). All 6 product modules + Phase 2
Integration Prep Parts 1-2 are merged and verified (see `project_platform_status_20260730.md`).
The QA walkthrough (`.agents/QA_FINDINGS_20260729.md`) found 5 demo-blocking gaps. The user said
"fix all 5 now, in parallel" — 5 background agents were launched in isolated git worktrees (4 fix
tracks + a previously-authorized platform hardening track). **As the session was being paused, 4 of
the 5 agents reported `status: failed` with `"Agent stalled: no progress for 600s (stream watchdog
did not recover)"` — this looks like an infra/connectivity hiccup, not a code problem (same
symptom class as the earlier single ENOTFOUND network error this session already hit once and
recovered cleanly from via SendMessage resume). None of the 5 tracks are committed-complete or
merged. Real per-worktree state as of the last check, right before pausing:**

| Track | Worktree dir | Branch | Status | Real state (uncommitted WIP) |
|---|---|---|---|---|
| Platform Hardening | `.claude/worktrees/agent-a74cdd79e7f86d79e` | `worktree-agent-a74cdd79e7f86d79e` | **failed (stalled)** | 2 commits done (`555e5e6` Sentry+rate-limiter, `5f826b0` Langfuse). Uncommitted: `.gitignore`, `apps/web/package.json`/`package-lock.json` modified, new `apps/web/e2e/` dir + `playwright.config.ts` (item 5, Playwright scaffolding) — was mid-way through adding npm scripts/README when it stalled. |
| Track 1 — assessment assignment | `.claude/worktrees/agent-adcdab07fd316e3d4` | `worktree-agent-adcdab07fd316e3d4` | **still running (not yet resolved when session paused)** | Uncommitted: modified `packages/db/models/assessment.py`, modified `packages/shared_schemas/assessment.py`, new migration `packages/db/migrations/versions/b1c2d3e4f5a6_add_candidate_id_to_assessments.py`. No commits yet. |
| Track 2 — candidate job-apply/hackathon-join | `.claude/worktrees/agent-a255d2d2d38a2b428` | `worktree-agent-a255d2d2d38a2b428` | **failed (stalled)** | Uncommitted: new `apps/web/src/app/(candidate)/jobs/` directory only — was "writing the jobs browse+apply page" when it stalled. The hackathon-join page (its other deliverable) had not been started yet. No commits. |
| Track 3 — recruiter nav/fraud visibility | `.claude/worktrees/agent-a0db8230f596a5e09` | `worktree-agent-a0db8230f596a5e09` | **failed (stalled)** | Uncommitted: modified `apps/web/src/lib/api.ts`, `packages/shared_schemas/recruitment.py`, `services/api/routers/recruitment.py` — was "appending new client functions for assessment creation" when it stalled. No commits. |
| Track 4 — admin user mgmt/audit log | `.claude/worktrees/agent-af03ff7248bd28ed1` | `worktree-agent-af03ff7248bd28ed1` | **unknown (no notification seen before pause)** | Zero uncommitted changes, zero commits at last check — either hadn't started meaningful work yet, or was still mid-read/exploration phase. |

**Nothing was lost** — worktrees preserve uncommitted changes on disk even after an agent process
stops; the WIP above is real and recoverable. But none of it is committed, so it's fragile: a
`git worktree remove` or accidental `git checkout` in these directories would destroy it. Don't run
destructive git commands in these worktree dirs without confirming what's there first.

## Full scope of each track (for re-briefing a fresh agent, since this session's exact prompts live
only in this now-paused conversation, not saved elsewhere verbatim)

### Platform Hardening
Fixes `.agents/assignments/member-3-platform-hardening.md` items 2-5 (item 1, the global exception
handler, is already done/merged on `main` — don't redo it). **User explicitly authorized building
without live credentials**: "Build everything, will test later, don't have keys yet" — code must be
structurally complete and gated to no-op cleanly when `ANTHROPIC_API_KEY`/`LANGFUSE_*`/
`SENTRY_DSN`/Clerk-test-creds are empty (the current real state), with exactly what needs real keys
to verify documented in decisions.md, not faked.
- Item 2 (Langfuse) and item 3 (Sentry + rate limiter) — DONE, committed (`5f826b0`, `555e5e6`).
- Item 5 (Playwright E2E scaffolding) — IN PROGRESS, uncommitted (`apps/web/e2e/`,
  `playwright.config.ts`, package.json changes already on disk). Finish: npm scripts, the
  `apps/web/e2e/README.md` documenting Clerk test-user setup (fixed-OTP test phone or
  password-based test user), one example test that's structurally complete but reports
  skipped/pending since no real Clerk test credentials exist yet.
- File ownership: `services/api/main.py` (additive only, preserve the existing exception handler +
  other tracks' router-includes), `services/api/core/`, every `services/api/routers/*.py`
  (additive `AgentRun(...)` trace-id only), new `apps/web/e2e/`, `.env.example` (additive).

### Track 1 — Assessment assignment loop (schema + backend + candidate inbox)
Fixes QA findings "Recruiter #1" / "Candidate #4": no `candidate_id` field on assessments, no
candidate assessment inbox (nav points to a hardcoded fake `/assessments/sample-assessment` ID).
- Uncommitted WIP already covers the schema/model/migration layer — verify it's correct, commit it,
  then continue: update `services/api/routers/assessments.py` to accept/persist `candidate_id` on
  `POST /assessments` and add `GET /assessments/mine` (candidate-self-serve). Build
  `apps/web/src/app/(candidate)/assessments/page.tsx` (new inbox list page, don't touch the
  existing `[id]/page.tsx` detail page). Fix the hardcoded link in `(candidate)/layout.tsx`.
- **Must document the exact `POST /assessments` request shape and `GET /assessments/mine` response
  shape in `.agents/decisions.md`** — Track 3 depends on this contract for its "Assign Assessment"
  button and may have guessed at a shape before this lands.
- File ownership: `packages/shared_schemas/assessment.py`, `packages/db/models/assessment.py`, its
  migration, `services/api/routers/assessments.py`, `apps/web/src/app/(candidate)/assessments/
  page.tsx` (new), `apps/web/src/app/(candidate)/layout.tsx` (one link), `apps/web/src/lib/api.ts`
  (append).

### Track 2 — Candidate job-apply + hackathon-join pages (pure frontend)
Fixes QA findings "Candidate #3" / "Candidate #5": `GET /jobs`/`POST /jobs/{id}/apply` and
`POST /hackathons/{id}/submissions` already work on the backend; no frontend page ever calls them.
- Uncommitted WIP: an empty/started `(candidate)/jobs/` directory — the browse+apply page itself
  was still being written when it stalled; verify/finish it.
- Still needed: the hackathon browse + join/submit page(s) under `(candidate)/hackathons/` (not
  started at all per the last check), nav links in `(candidate)/layout.tsx`, `apps/web/src/lib/
  api.ts` additions (a hackathon-list client function if one doesn't already exist).
- **No backend changes needed or permitted** — both endpoints already exist and work as-is.
- File ownership: `apps/web/src/app/(candidate)/jobs/` (new), `apps/web/src/app/(candidate)/
  hackathons/` (new), one link in `(candidate)/applications/page.tsx`, nav additions in
  `(candidate)/layout.tsx`, `apps/web/src/lib/api.ts` (append). Do not touch
  `(candidate)/assessments/` (Track 1 owns it).

### Track 3 — Recruiter navigation + fraud visibility + assign-assessment button
Fixes QA findings "Recruiter #1" (its half), "#2" (no job list), "#3" (no pipeline→reports
click-path), "#4" (fraud flag never surfaced to recruiters).
- Uncommitted WIP: modified `recruitment.py` schema + router (the fraud-flag field/lookup, likely
  in progress), modified `apps/web/src/lib/api.ts` (was mid-way through appending an
  assign-assessment client function when it stalled) — verify what's actually there before
  assuming it's complete; it stalled mid-edit.
- Still needed (per original brief, verify against actual WIP state): new `apps/web/src/app/
  (recruiter)/jobs/page.tsx` job list page, nav/link fixes in `jobs/new`, `jobs/[id]/matches`,
  `(recruiter)/layout.tsx`, and `KanbanBoard.tsx` candidate-card enhancements (report link, fraud
  badge, "Assign Assessment" button calling `POST /assessments` with `candidate_id` — check
  Track 1's decisions.md entry for the confirmed contract before finalizing this call).
- File ownership: `packages/shared_schemas/recruitment.py`, `services/api/routers/recruitment.py`
  (additive, read-only fraud lookup — never write to fraud tables, must not affect ranking/sort),
  `apps/web/src/app/(recruiter)/jobs/page.tsx` (new), `jobs/new/page.tsx`,
  `jobs/[id]/matches/page.tsx`, `(recruiter)/layout.tsx`, `pipeline/[jobId]/page.tsx`,
  `apps/web/src/components/KanbanBoard.tsx`, `apps/web/src/lib/api.ts` (append). Do not touch
  `fraud.py`, `assessments.py`, or `(candidate)/`/`(admin)/` frontend.

### Track 4 — Admin user management + audit log
Fixes QA findings "Admin #1" / "Admin #2": `(admin)/users` and `(admin)/audit-log` pages are 100%
hardcoded mock arrays; no `audit_logs` table exists anywhere despite the master-architecture doc
specifying one in its shared core schema (§4).
- **No progress detected at last check** (zero uncommitted changes, zero commits) — likely still in
  its read/exploration phase, or lost before starting real work. Treat as needing a fresh start;
  check its worktree again first in case it made progress after this log's last snapshot.
- Scope: new `packages/db/models/audit.py` (`AuditLog` model — check
  `doc/multi-agent-architecture/00-master-architecture.md` §4 for the already-specified shape
  first, don't invent a different one), migration, `services/api/core/audit.py`
  (`log_action(db, actor_user_id, action, target_type, target_id=None)` helper, no commit inside
  the helper), `GET /admin/users` + `PATCH /admin/users/{id}/role` (writes an audit row via the
  helper), `GET /admin/audit-log`, wire both mock frontend pages to real data, remove the
  `mockUsers`/`mockLogs` arrays. **Deliberately scoped narrow**: only call `log_action(...)` from
  the role-update endpoint itself in this pass — document broader instrumentation (fraud review,
  stage changes, onboarding) as an explicit fast-follow in decisions.md, don't build it now.
- File ownership: `packages/db/models/audit.py` (new), its migration, `services/api/core/audit.py`
  (new), `services/api/routers/users.py` (or a new `services/api/routers/admin.py` — agent's
  choice, document which and why), `apps/web/src/app/(admin)/users/page.tsx`, `apps/web/src/app/
  (admin)/audit-log/page.tsx`, `apps/web/src/lib/api.ts` (append), `packages/db/models/__init__.py`
  (additive). Do not touch `fraud.py`, `recruitment.py`, `assessments.py`, or
  `(candidate)/`/`(recruiter)/` frontend.

## How to resume in a new session/window

1. **Re-check every worktree's real state first** — this log is a snapshot from right before
   pausing; things may have changed if any agent kept running briefly after. For each of the 5
   branches above: `git -C .claude/worktrees/<dir> status --short` and
   `git -C .claude/worktrees/<dir> log --oneline -5`.
2. **Do not assume a "failed" status means the work is bad** — 4 of 5 failures were a stream
   watchdog timeout (infra hiccup), not a reported code/logic problem. The uncommitted diffs on
   disk are real in-progress work, worth reviewing and continuing, not discarding.
3. **Resume each track** by either (a) sending a message to the original agent if the harness still
   recognizes its id/name in a way that resumes from its saved transcript (this worked cleanly once
   already this session after the earlier single ENOTFOUND stall), or (b) if that's not available in
   a new window, spawn a fresh agent pointed at the existing worktree path with the scope above,
   explicitly telling it to first inspect and, if correct, commit the existing uncommitted diff
   before continuing (don't let it blindly overwrite good WIP).
4. **Track 1 and Track 3 have a contract dependency** (Track 3's "Assign Assessment" button calls
   Track 1's `POST /assessments` endpoint) — get Track 1 committed and its decisions.md entry
   written first if possible, so Track 3 can be finished/verified against the real contract rather
   than a guess.
5. **Review every branch's diff before merging** — never blind-merge, even a "reported complete"
   track.
6. Expected trivial merge conflicts across all 5 branches (same protocol as every prior parallel
   round this session): `packages/db/models/__init__.py`, `services/api/main.py`,
   `apps/web/src/lib/api.ts`, `.agents/decisions.md` — keep all sides' additions in each. Watch
   `services/api/main.py` specifically — it currently has an exception handler + `fraud.router` +
   `supervisor.router` + the event-consumer startup hook; any new merge must preserve ALL of that
   (this session already did one 3-way manual reconciliation of this exact file as a precedent, see
   `.agents/decisions.md`/commit history around `3f19dd8`).
7. Run `alembic heads` after all migrations land — Track 1 (assessment `candidate_id`,
   `b1c2d3e4f5a6` per its uncommitted migration file) and Track 4 (audit_logs, not yet written) both
   chain onto the current head (`54e04d937561`) independently — expect a `down_revision` rebase.
8. Post-merge, full verification: `python -c "import services.api.main"` via
   `services/api/.venv/Scripts/python.exe`, `tsc --noEmit`/`eslint`/`next build` in `apps/web`, no
   route collisions.
9. Update tracking docs once merged: roll `.agents/memory/project_platform_status_20260730.md` to a
   new dated file marking these fixed, delete this file, mark the corresponding "blocks the demo"
   items resolved in `.agents/QA_FINDINGS_20260729.md`.
10. Clean up all 5 worktrees once merged (`git worktree remove --force`; if it hits the Windows
    "Filename too long" error seen earlier this session, that's a known harmless quirk — the git
    metadata still deregisters, just `rm -rf` the leftover directory after).

## What's still deferred after these 5 land (not started, not urgent)
- Phase 2 QA findings' cosmetic-tier items (LinkedIn upload, conflict-resolution UI, organizer
  judge-assignment UI, watchlist-creation UI).
- Platform hardening item 5's live verification (needs real Clerk test-user credentials).
- Track 4's documented audit-log instrumentation fast-follow (fraud review, stage-change,
  onboarding endpoints).

## Related memories
[[project_platform_status_20260730]], [[feedback_progressive_commits]].

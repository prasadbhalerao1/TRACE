# QA Findings — Cross-Role Journey Walkthrough (Phase 2 Integration Prep, Part 3)

**Date walked:** 2026-07-30 (filename kept as `20260729` per the assignment brief's exact naming
instruction). **Method:** read every page component in each of the 5 role journeys against
`doc/multi-agent-architecture/11-role-flows-and-use-cases.md`, cross-referenced with the
corresponding `apps/web/src/lib/api.ts` client calls and `services/api/routers/*.py` endpoints,
plus each `(role)/layout.tsx` nav sidebar to distinguish "reachable by clicking" from "only
reachable by typing a URL." All 5 roles walked. Read-only pass — nothing here was fixed.

Already-logged, repo-wide, known limitation **not** re-reported below: missing
`ANTHROPIC_API_KEY` causing LLM-dependent features to fail closed with clean 503s (documented
repeatedly in `.agents/decisions.md`). Only genuinely worse breakages (crashes, 404s, dead UI,
hardcoded mocks) are logged here.

---

## Priority summary

### Blocks the demo (a role's headline journey has a real dead end)
1. **Candidate → Recruiter → Candidate assessment loop is fully broken.** Recruiters have no UI
   (and the schema has no `candidate_id` field) to assign an assessment to a specific candidate,
   so `(candidate)/assessments/[id]` can never be reached with a real ID in the current build.
   See Recruiter #1 / Candidate #4.
2. **Candidates cannot apply to jobs or join a hackathon through the UI at all**, despite both
   backend endpoints being fully implemented (`POST /jobs/{id}/apply`, `POST /hackathons/{id}/
   submissions`). This breaks the "recruiter posts job → candidate applies" and "candidate submits
   hackathon project directly" journeys described as first-class in the doc. See Candidate #3, #5.
3. **Admin "manage user roles" and "audit log" pages are 100% hardcoded mock data with zero
   backend support** — no list-users endpoint, no role-update endpoint, no `audit_logs` table/
   model/write-path anywhere in the codebase, despite the architecture doc explicitly naming the
   audit trail as "the one thread that ties every role together." See Admin #1, #2.
4. **Recruiters have no navigation path from "candidate in my pipeline" to that candidate's
   interview/assessment/contribution report**, and no path back to a job's pipeline/matches page
   once created (sidebar links are hardcoded fake IDs). See Recruiter #2, #3.
5. **Recruiters can never see a fraud flag on a candidate** — doc explicitly calls for a
   display-only flag indicator; no field exists anywhere in the recruiter-facing API types or UI.
   See Recruiter #4.

### Cosmetic / nice-to-fix (doesn't block the core demo narrative, worth a follow-up ticket)
6. LinkedIn export upload has no endpoint or UI at all (candidate step 5). See Candidate #1.
7. Conflict "resolution" component is read-only text, not an actual resolve action (candidate
   step 7). See Candidate #2.
8. Organizer has no judge-assignment UI, but this is self-documented in-code as a known gap on
   both the organizer and judge pages already (not a silent bug). See Organizer #1.
9. Recruiter can view the top-performers feed (now correctly wired, positive finding) but cannot
   create/edit a watchlist through any UI — always falls back to the unfiltered feed in practice.
   See Recruiter #5.

### Positive findings (previously flagged as stub/unwired, confirmed now working)
- `(recruiter)/top-performers` feed is fully wired to live watchlist matching per the Phase 2
  Part 2 work — `matched_watchlist` / `match_reasons` render correctly. The only remaining gap is
  the missing watchlist-creation UI (item 9 above), not the feed itself.
- `(recruiter)/reports/submission/[id]` — previously-logged Module 03 pitch-deck-content bug is
  confirmed fixed and still correct.
- `(admin)/fraud-review` and `(admin)/fraud-review/[flagId]` are fully and correctly wired,
  including the hard "notes required to uphold" rule mirrored client-side — no gaps found here.
- Judge journey (queue → open submission → score → composite ranking) is fully working end to
  end, no gaps beyond the shared, self-documented judge-assignment limitation (Organizer #1).

---

## 1. Candidate

**Documented journey (doc 11 §1):** sign up as candidate → land on empty dashboard → connect
GitHub → upload resume → optionally upload LinkedIn export + certificates → dashboard shows
Talent Score + Evidence Receipt → resolve any evidence conflicts on the dashboard → explore
Career Guidance → generate resume/portfolio → apply to jobs or get discovered → take an
assessment → do an AI interview → view/dispute fraud flags → join a hackathon and submit a
project.

**Working / correctly wired:**
- Sign-up + role picker: `apps/web/src/app/(public)/onboarding/page.tsx` → `POST /users/onboarding`.
- Empty-dashboard "connect evidence" state: `apps/web/src/components/CandidateDashboard.tsx:42-56`,
  wording matches the doc, links to `/profile/edit`.
- GitHub OAuth connect: `(candidate)/profile/edit/page.tsx:77-90` (`grantConsent` →
  `fetchGithubOAuthUrl` redirect).
- Resume upload: same page, lines 92-110, `uploadResume`.
- Talent Score + Evidence Receipt: `CandidateDashboard.tsx` renders `ScoreRadarChart`,
  `EvidenceReceipt`, `ScoreTrendLine`, `BadgeGrid`.
- Career Guidance: `(candidate)/career/page.tsx` → `<CareerGuidance />`.
- Resume/portfolio builder incl. job-tailoring + publish: `(candidate)/resume-builder/page.tsx`,
  wired to `generateResume`/`generateCoverLetter`/`publishPortfolio`, links to the real
  `(public)/[username]` SSR page.
- AI interview by voice with consent: `(candidate)/interview/[sessionId]/page.tsx`, self-serve
  `startInterview`/`interviewTurn`/`endInterview` via Web Speech API. Page itself is fine; see
  gap #4 for why it's unreachable with a real ID.
- View flags + dispute: `(candidate)/my-flags/page.tsx`, wired to `fetchCandidateFlags`/
  `submitFlagDispute`/`fetchAuthenticityScore`.

**Gaps found:**

1. **(missing) LinkedIn export upload doesn't exist anywhere.** Doc step 5. `services/api/
   routers/candidates.py:254` only lists `linkedin_export` as a valid `consent_type` string —
   there is no upload endpoint. `apps/web/src/lib/api.ts` has zero functions for it. No UI control
   in `(candidate)/profile/edit/page.tsx` (only GitHub/resume/certificate controls, lines
   145-197). Candidates can never grant this consent or upload anything for it.

2. **(broken) Conflict "resolution" is read-only — no resolve action exists.** Doc step 7 says
   "candidate resolves it directly on the dashboard." `apps/web/src/components/
   ConflictResolver.tsx` (21 lines total) only renders `conflict.description` text — no button,
   form, or endpoint call. `services/api/routers/candidates.py` has no `PATCH`/`POST`
   conflict-resolution endpoint at all; `resolved` only appears as a read-side filter. The
   component's name implies interactivity that isn't there.

3. **(dead frontend) "Apply to jobs" (step 10) is completely unreachable — no job browse/search
   page for candidates exists.** `fetchJobs(token)` and `applyToJob(token, jobId)` both exist in
   `apps/web/src/lib/api.ts` (lines ~640, ~648) and the backend has `GET /jobs` and `POST /jobs/
   {job_id}/apply` (`services/api/routers/recruitment.py:237,316`), but grepping the whole
   `apps/web/src/app` tree for callers of either function returns nothing outside `api.ts` itself.
   `(candidate)/applications/page.tsx` literally says "apply to a job posting to see it tracked
   here," but there is no page anywhere that lets a candidate browse or apply. Backend-ready,
   frontend-dead.

4. **(unreachable) No candidate-facing assessment queue — candidates can never discover/start a
   real assessment.** `(candidate)/assessments/[id]/page.tsx` itself works once given a real ID,
   but nothing in the UI ever produces one, because recruiters have no assign-to-candidate UI
   either (see Recruiter #1). `(candidate)/layout.tsx:59` hardcodes a nav link to
   `/assessments/sample-assessment` — a fake ID that 404s against the real backend. There is no
   assessment inbox/list page at all.

5. **(dead frontend) No candidate-facing "join hackathon" page — step 14 is backend-complete,
   frontend-absent.** `submitHackathonProject()` (`apps/web/src/lib/api.ts:985-992`) correctly
   calls `POST /hackathons/{id}/submissions` (`services/api/routers/hackathons.py:248`,
   candidate-role), but no `.tsx` file anywhere calls it. `(candidate)/pitch-deck/page.tsx` is a
   different, unrelated feature (Module 04 standalone deck analysis with no `hackathon_id`/team
   linkage) — it does not lead into the hackathon-join flow. A candidate has no way to register a
   team or submit a repo+deck for a hackathon anywhere in the app.

---

## 2. Recruiter

**Documented journey (doc 11 §2):** sign up linked to a company → post a job → see auto-ranked
matches with Match % breakdown → use Copilot for plain-language search → move candidates through
a kanban pipeline → assign an assessment or schedule an interview → review reports → check hiring
analytics → watch a hackathon/skill area and get notified of top performers → see (display-only)
if a candidate has a fraud flag.

**Working / correctly wired:**
- Post a job: `(recruiter)/jobs/new/page.tsx` → `createJob` → `POST /jobs`, redirects to
  `/jobs/{id}/matches` on success (line ~136).
- Ranked matches with full breakdown: `(recruiter)/jobs/[id]/matches/page.tsx` →
  `fetchJobMatches`.
- Copilot: `(recruiter)/copilot/page.tsx` → `postCopilotQuery`, multi-turn via `conversation_id`.
- Kanban pipeline: `(recruiter)/pipeline/[jobId]/page.tsx` + `KanbanBoard.tsx` — drag-and-drop and
  "Advance →" both call `updateApplicationStage` → `PATCH /applications/{id}/stage`.
- Reports: `(recruiter)/reports/interview/[id]`, `reports/submission/[id]`,
  `reports/contribution/[repo]` all correctly fetch their endpoints (the Module 03
  submission-report bug is confirmed already fixed and still correct).
- Analytics: `(recruiter)/analytics/page.tsx` → `fetchHiringFunnel`/`fetchTimeToHire`/
  `fetchSourceBreakdown`.

**Gaps found:**

1. **(missing, weak backend model too) "Assign an assessment or schedule an interview" (step 6)
   has no UI anywhere, and the backend doesn't really model a per-candidate assignment either.**
   `KanbanBoard.tsx`'s only per-card action is "Advance to [stage] →" — no assessment/interview
   button. There is no `createAssessment`-style function anywhere in `apps/web/src/lib/api.ts`
   (confirmed via grep: zero hits), even though `POST /assessments` exists and is recruiter-gated
   (`services/api/routers/assessments.py:85-95`, `require_role("recruiter")`). More fundamentally,
   `AssessmentCreateRequest` (`packages/shared_schemas/assessment.py:9-12`) only has
   `job_id`/`type`/`spec` — **no `candidate_id` field** — so even a hypothetical future button
   couldn't literally "assign to a candidate" without a schema change. Separately, `POST
   /interview-sessions` is candidate-self-serve only (`require_role("candidate")`,
   `services/api/routers/assessments.py:198-201`) — recruiters have no scheduling action for it at
   all, by backend design, not just a missing frontend button.

2. **(unreachable) No recruiter-facing job list — `pipeline/[jobId]` has no click-path back to
   it.** `(recruiter)/jobs/new/page.tsx`'s post-creation success state only shows "View Ranked
   Matches" (no "View Pipeline" link), and `(recruiter)/jobs/[id]/matches/page.tsx` never links to
   `/pipeline/{jobId}` either. `GET /jobs` and `fetchJobs()` both exist, but no page renders a job
   list. A recruiter with multiple real jobs has no way to navigate back to any of them except
   editing the URL bar directly (or the sidebar's hardcoded `sample-job` link).

3. **(unreachable) Reports pages have no click-path from the pipeline/matches UI.**
   `(recruiter)/pipeline/[jobId]/page.tsx` and `KanbanBoard.tsx`'s candidate cards have no link
   into that candidate's actual submission/interview/repo report. The only nav path to any report
   page is the sidebar's hardcoded fake IDs (`sample-submission`, `sample-interview`,
   `sample-repo`, `(recruiter)/layout.tsx:61-63`). Recruiters can never click from "a candidate in
   my pipeline" to "that candidate's report."

4. **(missing entirely) Fraud flag is never surfaced to recruiters — doc step 10's display-only
   indicator doesn't exist at all.** `ApplicationWithCandidateResponse` and
   `MatchScoreWithCandidateResponse` (`packages/shared_schemas/recruitment.py:60-66, 92-99`) carry
   headline/GitHub/talent-score fields but no fraud/flag field whatsoever (grepped the whole file
   for `fraud|flag|authenticity` — zero hits). `KanbanBoard.tsx`'s `CandidateCard` has no flag
   badge. A recruiter has no way to know a candidate has an open fraud flag anywhere in the
   recruiter-facing UI — not even the "display-only, decision stays mine" version the doc
   describes.

5. **(positive finding + one remaining gap) `(recruiter)/top-performers` is now correctly wired**
   to `fetchTopPerformersFeed()` → `GET /recruiters/me/top-performers-feed`, correctly highlights
   `matched_watchlist` entries with `match_reasons`
   (`apps/web/src/app/(recruiter)/top-performers/page.tsx:49-84`) — confirms the Phase 2 Part 2
   wiring described in `.agents/decisions.md` is live and correct, not a stale stub. **However,
   there is no UI anywhere to create or edit a watchlist row.** The client function that would
   call `POST /recruiters/me/watchlists` exists in `api.ts` (~line 1094), but grepping every
   `.tsx` file for a caller of it returns nothing — no form, no page. In practice, every recruiter
   only ever sees the unfiltered "all top-3 finishers" fallback feed, since nothing ever creates a
   watchlist row.

---

## 3. Hackathon Organizer

**Documented journey (doc 11 §3):** create a hackathon → assign judges → teams register/submit
directly → judges score against a rubric → platform auto-scores repo+deck and combines with judge
scores → rankings finalize, public leaderboard goes live, matching recruiters notified.

**Working / correctly wired:**
- Create hackathon: `(organizer)/hackathons/new/page.tsx` → `POST /hackathons`.
- Judge scoring + auto-scoring combined into a composite ranking:
  `(judge)/submissions/[id]/page.tsx` → `submitJudgeScore`; `(organizer)/hackathons/[id]/
  rankings/page.tsx` → `finalizeHackathonRankings`. The formula shown in the UI matches
  `services/agents/hackathon/tools/ranking.py`'s 0.40/0.30/0.20/0.10 weighting.
- Rankings finalize → public leaderboard + recruiter notification:
  `(public)/hackathons/[id]/leaderboard/page.tsx` correctly renders public rankings; the
  recruiter-notification side is confirmed wired per the Phase 2 Part 2 log (see Recruiter #5
  above).

**Gaps found:**

1. **(missing, self-documented in-code, not silent) "Assign judges" (step 2) has no UI and no
   backend concept at all.** `(organizer)/hackathons/[id]/manage/page.tsx` has no judge-related
   field anywhere (only team/track/repo/judge-score/member entry). The backend's own comment
   confirms this isn't just a missing button: `services/api/routers/hackathons.py:314-327` states
   there is no judge-assignment table, so every submission across every hackathon is visible to
   any authenticated judge, with no per-judge/per-track scoping. `(judge)/evaluations/
   page.tsx:75` repeats the same caveat to the user directly ("Every authenticated judge sees
   every submission — no per-judge/per-track assignment table exists yet"). Not a silently-wrong
   state — it's an honestly-labeled known gap — but the doc-described step genuinely doesn't exist
   in either layer.

2. **(dead frontend, shared with Candidate #5) Candidate-facing direct team registration (FR-7c,
   described in the organizer's own manage page as "the richest data path... recommended as the
   primary flow") has no actual frontend.** `(organizer)/hackathons/[id]/manage/page.tsx:186-187`
   itself says "Teams can also self-register their own repo/deck link directly (FR-7c) once
   candidates log in" — but no page exists for a candidate to do this (see Candidate #5). In
   practice the only usable submission path today is the organizer's own manual entry on the
   manage page.

---

## 4. Judge

**Documented journey (doc 11 §4):** log in, see a queue of assigned submissions → open a
submission (repo, deck, AI summary) → score against a fixed rubric → submit, becomes part of the
composite ranking.

**Fully working, no new gaps** beyond the shared, self-documented no-assignment-table limitation
(Organizer #1 above):
- Queue: `(judge)/evaluations/page.tsx` → `fetchJudgingQueue()` → `GET /judging/queue`, each row
  correctly links to `/submissions/{id}?hackathonId={hid}`.
- Score submission: `(judge)/submissions/[id]/page.tsx` → `submitJudgeScore()` → `POST
  /hackathons/{id}/submissions/{id}/judge-score`. Repo link renders correctly. (Minor,
  unconfirmed-not-a-bug note: the page shows `repo_url` prominently; a dedicated "AI-generated
  summary" rendering block wasn't directly confirmed on this page in the time available —
  `presentation_id` is present on the queue entry type and may be rendered via a shared component
  not fully traced. Flagging as a "worth a closer look" item, not a confirmed gap.)
- Composite ranking: confirmed via the ranking formula reading `judge_score` in
  `services/agents/hackathon/tools/ranking.py`.

---

## 5. Admin

**Documented journey (doc 11 §5):** log in, see the fraud review queue → open a flagged item, see
the evidence → decide uphold/dismiss with a written reason → manage user roles across the
platform → check the audit log for any role's actions.

**Working / correctly wired:**
- Fraud review queue, evidence viewer, uphold/dismiss with required reason:
  `(admin)/fraud-review/page.tsx` and `(admin)/fraud-review/[flagId]/page.tsx` are both fully and
  correctly wired to `fetchFraudReviewQueue`/`fetchFraudFlagDetail`/`reviewFraudFlag`, including a
  client-side mirror of the server's hard "422 on empty notes when upholding" rule. Matches the
  already-logged Module 06 verification — confirmed still correct.

**Gaps found:**

1. **(hardcoded mock, no backend) "Manage user roles" (step 4) is 100% static placeholder
   content.** `apps/web/src/app/(admin)/users/page.tsx:7` defines `const mockUsers = [...]` as a
   literal in-component array and renders it directly — confirmed no `fetch`/`useEffect`/API call
   anywhere in the file. `services/api/routers/users.py` only defines `GET /me` and `POST
   /users/onboarding` — there is no list-users or role-update endpoint at all. A page that visually
   looks like a working admin tool does nothing.

2. **(hardcoded mock, no backend, no table exists anywhere) "Check the audit log" (step 5) is
   likewise 100% static placeholder content.** `apps/web/src/app/(admin)/audit-log/page.tsx:6`
   defines `const mockLogs = [...]` and renders it — no fetch call. Confirmed via grep across
   `services/api` and `packages/db` for `audit_log`/`AuditLog` — **zero hits anywhere in the
   codebase.** No table, model, write path, or read endpoint exists, despite this being the one
   thread doc 11 §6 explicitly calls out as tying every role together ("Nobody in this platform is
   ever shown a bare number they can't ask 'why?' about"). Every role's actions (onboarding, fraud
   decisions, pipeline stage changes, etc.) generate zero audit trail today — a complete no-op
   feature, not a partial one. (`agent_runs`, a separate real table, does exist and is correctly
   used for score/match provenance elsewhere — it is not a substitute for a per-action audit log.)

---

## Notes on scope / what was not exhaustively checked

- Judge's "AI summary rendering" sub-point above is a soft note, not a confirmed gap — worth 5
  minutes of follow-up, not a blocker.
- Parts 1/2 of this same track (supervisor graph, event consumer) were verified live against the
  real Neon DB in earlier sessions of this same track per `.agents/decisions.md` — not re-verified
  here since Part 3 is scoped to the frontend/backend role-journey wiring specifically.

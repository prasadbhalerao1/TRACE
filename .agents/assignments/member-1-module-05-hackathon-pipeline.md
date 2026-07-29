# Member 1 — Module 05: Hackathon-to-Hiring Pipeline

**This file is self-contained.** You should not need to open any other person's assignment file.
If you need shared context (build order, doc precedence, decision history), read these three repo
files in this order before writing code: `.agents/BUILD_ROADMAP.md`, `.agents/DOCUMENTATION_MAP.md`,
`.agents/decisions.md`. Then read `doc/SRS/05-SRS-Hackathon-to-Hiring-Pipeline.md` and
`doc/multi-agent-architecture/05-hackathon-pipeline.md` in full.

## What already exists on `main` (as of 2026-07-29, all done and DB-verified)

- **Module 01 (Candidate Intelligence)**: `candidate_profiles`, `talent_scores`, `badges` tables.
  You read `candidate_profiles.id` to populate `hackathon_team_members.candidate_id`.
- **Module 03 (Assessment & Verification)**: `submissions` (static analysis + LLM review for a
  linked repo) and `contribution_reports` (per-member commit attribution) tables — FR-4 of your
  module ("reuses doc 03's static analysis for any linked repo") means you call into Module 03's
  **router endpoints**, never its internal `tools`/`nodes` directly. Relevant endpoints:
  `POST /assessments` (create a `project_analysis`-type assessment for a submitted repo),
  `POST /assessments/{id}/submit`, `POST /contribution-reports/generate`. Read
  `services/api/routers/assessments.py` to see the exact request/response shapes.
- **Module 04 (PPT Analyzer)**: `presentations`/`presentation_scores` tables and a working pipeline
  at `services/api/routers/presentations.py` — FR-4/FR-5 of your module ("reuses doc 04 pipeline
  for any submitted deck", "reuses doc 04's Innovation Score") means calling
  `POST /presentations/upload` and reading back `presentation_scores`, never reimplementing the
  rubric scoring yourself.
- **Module 02 (AI Recruitment)**: `jobs`, `applications` tables and
  `services/api/routers/recruitment.py` — you do NOT build the consumer side of your own
  `hackathon.rankings.finalized` event (that's Module 02's job, in a future Phase 2 pass, not
  yours). You only **publish** the event (see §6 below) and stop there.

## Your scope (build this, inside-out: DB → tools → LangGraph agents → router → frontend)

Everything in `doc/SRS/05` §3 (FR-1 through FR-7) and its architecture-doc counterpart:
- FR-1 Hackathon Performance Tracking (event metadata, tracks, team roster, submission timestamps)
- FR-2 Winner Analytics (placements, per-track winners, judge score breakdowns)
- FR-3 Team Rankings (composite score combining judge scores + doc 04 pitch score + doc 03
  repo/contribution analytics)
- FR-4/FR-5 Project & Innovation Evaluation (calls into doc 03/04, doesn't reimplement)
- FR-6 Recruiter Access to Top Performers (publish-only, see §6)
- FR-7 three ingestion modes: organizer CSV/XLSX upload, platform webhook, direct in-platform
  submission — build all three; CSV upload is the one to get rock-solid first (zero integration
  risk per the doc), webhook second, direct-submission third.

## Data model (doc 05 §5 — copy this schema, it's already finalized in the doc, no ambiguity)

`hackathons`, `hackathon_teams`, `hackathon_team_members`, `hackathon_submissions`,
`hackathon_rankings`, `recruiter_watchlists`. New file: `packages/db/models/hackathon.py`.

## Composite ranking formula (doc 05 §4, weights are illustrative/configurable per the doc — pick
sane defaults, log your choice in `.agents/decisions.md`, same pattern Module 02/03 already used
for their own tunable-weight formulas)

```
composite_score = 0.40 * normalized(judge_score)      # if judges scored manually
                + 0.30 * doc04.overall_pitch_score
                + 0.20 * doc03.repo_quality_score
                + 0.10 * novelty_score
```

## Agent architecture (doc 05 §4)

`services/agents/hackathon/` — Normalization Agent (Haiku + rules, handles differing CSV/webhook
shapes), Repo/Deck Linking Agent (rules, dedupes + triggers doc 03/04 calls), Ranking Aggregation
Agent (rules, transparent weighted formula), Cross-Event Novelty Agent (embedding similarity via
Qdrant across `presentation_slide_embeddings` — reuse the Qdrant client-construction pattern from
`services/agents/candidate_intelligence/tools/skill_gap.py` or `services/agents/recruitment/
tools/embeddings.py`, don't reinvent it), Recruiter Notification Agent (rules + templated Haiku
message, writes to the `events` table — see §6).

Follow the exact node contract already used everywhere else in this codebase: each node file
exports `async def run(state: HackathonRankingState) -> dict`, returning only the keys it changed.
Read `services/agents/recruitment/` (Module 02) as your structural template for
state.py/nodes/tools/graph.py organization and the LLM tool-use pattern (see
`services/agents/recruitment/tools/copilot_llm.py` for the exact anthropic tool-use schema style
to copy).

## §6 Event publishing — your integration boundary, stop here

When `hackathon_rankings` finalizes, write one row to the existing `events` table
(`packages/db/models/event.py` — already exists, don't recreate it):

```json
{
  "event_type": "hackathon.rankings.finalized",
  "payload": {"hackathon_id": "...", "top_teams": [...], "candidate_ids": [...]}
}
```

That's the end of your responsibility for this integration. Do not build the Module 02 consumer
side (matching `candidate_ids` against `recruiter_watchlists` and surfacing a notification) — that
lives in Module 02's territory and is explicitly a Phase 2 (post-all-modules) task per
`.agents/BUILD_ROADMAP.md`.

## API Endpoints (doc 05 §7)

```
POST   /hackathons
POST   /hackathons/{id}/import/csv
POST   /hackathons/{id}/webhook
POST   /hackathons/{id}/submissions
GET    /hackathons/{id}/rankings
GET    /hackathons/{id}/teams/{teamId}
POST   /recruiters/{id}/watchlists
GET    /recruiters/{id}/top-performers-feed
```
New file: `services/api/routers/hackathons.py`. No route prefix, matching `recruitment.py`'s style.

## Frontend

`apps/web/src/app/(organizer)/` and `apps/web/src/app/(judge)/` — check what stub pages already
exist there (`hackathons/new`, `hackathons/[id]/manage`, `hackathons/[id]/rankings`,
`hackathons/[id]/leaderboard`, `hackathons/[id]/teams/[teamId]`, `(judge)/evaluations`) before
creating new ones; wire the existing mocks to your real backend the same way Module 02/03 did
(read `apps/web/src/app/(recruiter)/jobs/new/page.tsx` as the before/after pattern). Also wire
`apps/web/src/app/(recruiter)/top-performers/page.tsx` to your `GET /recruiters/{id}/
top-performers-feed` endpoint — this is the one piece of Module 02's frontend that was
deliberately left unwired pending your module.

## File ownership — never touch outside this list

`packages/db/models/hackathon.py`, `packages/shared_schemas/hackathon.py`,
`services/agents/hackathon/`, `services/api/routers/hackathons.py`,
`apps/web/src/app/(organizer)/`, `apps/web/src/app/(judge)/`,
`apps/web/src/app/(recruiter)/top-performers/`.

## Shared files you WILL edit — expect trivial merge conflicts, not blockers

- `packages/db/models/__init__.py` — add your import block + `__all__` entries.
- `services/api/main.py` — add one `app.include_router(hackathons.router)` line.
- `apps/web/src/lib/api.ts` — append your own `// --- Hackathon Pipeline (Module 05) ---` section
  at the end of the file.
- `.agents/decisions.md` — append your own dated section at the end.
- **Alembic migration**: run `alembic heads` right before writing your migration (not at session
  start — others may have landed migrations first), chain `down_revision` onto whatever you
  actually see. Expect a rebase at merge time if three people land migrations concurrently — this
  already happened once this session and is a known, solved problem (see `.agents/decisions.md`'s
  dated entries for the exact precedent).

## Definition of done

Every FR in doc 05 §3 checked off. Live-verify against the real Neon DB (dependency-override
script bypassing Clerk auth — read `services/api/routers/assessments.py`'s test pattern from this
session's history in `.agents/decisions.md` if you want the exact technique). `tsc --noEmit`,
`eslint`, `next build` all clean, no route collisions. Commit progressively (DB → agents → router →
frontend), not one giant commit.

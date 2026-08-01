# Talent Score Enhancement: Open-Source Contributions & Hackathon Performance

## Overview

This implementation adds two new sub-scores to the Talent Score system:

1. **`open_source_contributions`** (0.10 weight) — Measures external PR activity, repository diversity, and language breadth derived from GitHub data
2. **`hackathon_performance`** (0.10 weight) — Combines platform-run hackathon rankings with self-reported external hackathon experience

The original 7 sub-scores have been rebalanced from 0.10-0.20 each to 0.08-0.16 to accommodate the two new signals while maintaining a total weight of 1.0.

## Changes Summary

### Database Schema (Migration: `m8n9o0p1q2r3_talent_score_enhancements`)

- **`talent_scores` table**:
  - Added `open_source_contributions: Float` (nullable)
  - Added `hackathon_performance: Float` (nullable)

- **`candidate_profiles` table**:
  - Added `hackathon_experience: JSONB` (nullable)
  - Stores self-reported external hackathon entries: `{id, name, result, weight, date, platform_hackathon_id}`

### Backend Changes

#### Data Models (`packages/db/models/candidate.py`)
- `CandidateProfile.hackathon_experience` (JSONB list)
- `TalentScore.open_source_contributions` (Float)
- `TalentScore.hackathon_performance` (Float)

#### Schemas (`packages/shared_schemas/candidates.py`)
- `SUB_SCORE_NAMES` updated to 9 entries (added new two)
- `HackathonExperienceEntry` pydantic model for self-reported hackathon entries
- `HackathonExperienceRequest` pydantic model for API requests
- `CandidateProfileResponse` includes `hackathon_experience` field

#### Scoring Logic (`services/agents/candidate_intelligence/tools/`)

**`open_source_score.py`** (new file)
- `open_source_contributions(analysis, *, contribution_population) -> SubScore`
- Scores external PRs (weighted 5 pts each), repository breadth (3 pts each), and language diversity (2.5 pts each)
- Percentile-normalized against candidate pool
- Cold start returns `None` if no external contributions

**`hackathon_score.py`** (new file)
- `hackathon_performance(platform_results, self_reported) -> SubScore`
- Combines platform-run results (rank → tier mapping) with self-reported entries
- Base scores: winner=100, top5=75, finalist=50, participant=25
- Self-reported weights normalized to 0.2-1.0 range (from 1-5 input scale)
- Best 5 entries weighted 70%, rest averaged at 30% to reward quality + breadth
- Capped at 100 per entry and overall
- Cold start returns `None` if no hackathons

#### State & Node Updates (`services/agents/candidate_intelligence/`)

- **`state.py`**: Added `contribution_population`, `hackathon_platform_results`, `hackathon_self_reported` to `CandidateProfileState`
- **`nodes/talent_scoring.py`**: Updated to compute both new sub-scores and include them in the sub_scores dict
- **`tools/aggregate.py`**: Rebalanced `SUB_SCORE_WEIGHTS` to 9 entries

#### Router (`services/api/modules/candidates/router.py`)

- **Imports**: Added `HackathonRanking`, `HackathonTeamMember`, `HackathonExperienceRequest`
- **Graph state assembly** (before `_run_ingestion_and_persist`):
  - Fetches `contribution_population` for open-source percentile normalization
  - Queries platform hackathons: `HackathonTeamMember` → `HackathonRanking` joins
  - Reads self-reported hackathons from `profile.hackathon_experience`
- **Score persistence**: Added the two new columns to `TalentScore` insertion
- **New endpoints**:
  - `POST /candidates/me/hackathon-experience` — Add a hackathon experience entry
  - `DELETE /candidates/me/hackathon-experience/{entry_id}` — Remove an entry
  - Both trigger background rescoring via `_run_ingestion_background`

### Frontend (Next Steps)

The frontend components need updates (out of scope for this backend-focused implementation but required for full E2E):

1. **`apps/web/src/app/(candidate)/profile/edit/page.tsx`**
   - Add "Hackathon Experience" section with list of entries
   - Add/edit/delete form for new entries (name, result tier, weight 1-5, date picker)
   - Call new `PATCH` endpoint to add/remove entries

2. **Score display components**
   - Already generic (renders `sub_scores` dict), so will auto-pick up new entries
   - Verify no hardcoded list of 7 sub-score labels needs updating

3. **API client (`apps/web/src/lib/api.ts`)**
   - Add `updateHackathonExperience()` and `removeHackathonExperience()` functions

## Tests

Unit tests provided for the scoring tools:

- **`services/agents/candidate_intelligence/tools/test_open_source_score.py`**
  - Cold start (no external PRs)
  - Single external PR
  - High activity (multiple repos, diverse languages)

- **`services/agents/candidate_intelligence/tools/test_hackathon_score.py`**
  - Cold start
  - Single self-reported winner
  - Weight normalization
  - Multiple hackathons (capping)
  - Platform results with rank mapping
  - Combined platform + self-reported

## Verification Checklist

- [x] Database models updated (`CandidateProfile`, `TalentScore`)
- [x] Migration file created
- [x] Schemas updated (SUB_SCORE_NAMES, models)
- [x] Scoring weights rebalanced
- [x] New scoring tools implemented (open_source_score.py, hackathon_score.py)
- [x] State TypedDict updated
- [x] Talent scoring node updated
- [x] Router graph state assembly updated (fetches new data)
- [x] TalentScore persistence updated (new columns)
- [x] New API endpoints added (POST/DELETE hackathon-experience)
- [x] Unit tests provided for scoring tools
- [ ] Database migration applied (run `alembic upgrade head`)
- [ ] Backend tests executed
- [ ] E2E testing: connect GitHub → verify `open_source_contributions` in score
- [ ] E2E testing: add hackathon entry → verify score recomputes
- [ ] Frontend UI built and tested

## No-Penalty Guarantee

The implementation follows the existing "cold-start" pattern:
- Missing scores have their weight redistributed (not zeroed out as penalties)
- `open_source_contributions` returns `None` only if no external GitHub activity
- `hackathon_performance` returns `None` only if no hackathon entries at all
- Both `None` values are handled identically to existing sub-scores via `compute_overall()`'s renormalization

Self-reported hackathon entries are **unverified** by default (flagged as "self-reported" in UI, matching the existing `skills`/`experience` trust model). The fraud pipeline can be extended later to verify these if needed.

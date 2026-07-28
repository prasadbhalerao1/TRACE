# Module 9 — Folder Structure & Role-Based Accessibility

---

## 1. Complete Repository Structure

```
/apps
  /web                                  -- Next.js 14 frontend
    /app
      /(public)
        page.tsx                        -- landing page
        /sign-in/page.tsx
        /sign-up/page.tsx
        /[username]/page.tsx             -- public candidate portfolio (SSR)
        /hackathons/[id]/leaderboard/page.tsx    -- public leaderboard
        /hackathons/[id]/teams/[teamId]/page.tsx

      /(candidate)
        /dashboard/page.tsx              -- score radar, trend, badges
        /profile/edit/page.tsx           -- ingestion triggers, conflict resolution
        /career/page.tsx                 -- roadmap, courses, salary range
        /resume-builder/page.tsx
        /assessments/[id]/page.tsx       -- Monaco editor, Pyodide runner
        /interview/[sessionId]/page.tsx  -- Web Speech API chat interview
        /my-flags/page.tsx               -- view flags against self, submit dispute
        /applications/page.tsx           -- my applications, stage tracker

      /(recruiter)
        /dashboard/page.tsx
        /jobs/new/page.tsx
        /jobs/[id]/matches/page.tsx      -- ranked candidates, score breakdown
        /copilot/page.tsx                -- NL search chat
        /pipeline/[jobId]/page.tsx       -- kanban board
        /analytics/page.tsx              -- funnel, time-to-hire
        /top-performers/page.tsx         -- hackathon feed
        /reports/submission/[id]/page.tsx
        /reports/interview/[id]/page.tsx
        /reports/contribution/[repo]/page.tsx

      /(organizer)
        /hackathons/new/page.tsx
        /hackathons/[id]/manage/page.tsx -- roster, tracks, judge assignment
        /hackathons/[id]/rankings/page.tsx

      /(judge)
        /evaluations/page.tsx            -- assigned submissions queue
        /submissions/[id]/page.tsx       -- rubric scoring form

      /(admin)
        /fraud-review/page.tsx           -- review queue
        /fraud-review/[flagId]/page.tsx
        /users/page.tsx                  -- role management
        /audit-log/page.tsx

    /components
      /ui                                -- shadcn primitives, restyled to tokens
      EvidenceReceipt.tsx                -- the signature component (doc 08)
      ScoreRadarChart.tsx
      ScoreTrendLine.tsx
      BadgeGrid.tsx
      ConflictResolver.tsx
      RoadmapTimeline.tsx
      MatchScoreBadge.tsx
      KanbanBoard.tsx
      CopilotChat.tsx
      FunnelChart.tsx
      CodeEditor.tsx
      InterviewChat.tsx
      RubricBreakdown.tsx
      ContributionBarChart.tsx
      SlideViewer.tsx
      ScoreRadarChart.tsx
      PlagiarismMatchList.tsx
      AIContentSignalBadge.tsx
      LeaderboardTable.tsx
      CSVImportPreview.tsx
      AuthenticityScoreGauge.tsx
      EvidenceViewer.tsx
      DisputeForm.tsx
      ReviewQueueTable.tsx

    /lib
      api-client.ts                      -- typed fetch wrapper
      auth.ts
      theme.ts                           -- token definitions (doc 08)

/services
  /api                                   -- FastAPI backend
    /routers
      candidates.py
      jobs.py
      applications.py
      copilot.py
      assessments.py
      interviews.py
      presentations.py
      hackathons.py
      fraud.py
      analytics.py
      auth.py
    /core
      config.py
      security.py
      rbac.py                            -- role-dependency injection
    main.py

  /agents                                -- LangGraph subgraphs, one package per module
    /candidate_intelligence
    /recruitment
    /verification
    /ppt_analyzer
    /hackathon
    /fraud
    supervisor.py                        -- top-level router graph (doc 07 §2)

  /workers                                -- Arq worker entrypoints
    scheduled_jobs.py                     -- weekly GitHub refresh, etc.
    event_consumers.py                    -- events table subscribers

/packages
  /shared_schemas                         -- Pydantic models shared between api/ and agents/
  /db
    models.py
    /migrations                           -- Alembic

/infra
  docker-compose.yml                      -- local Postgres/Redis for dev
  .github/workflows/
```

## 2. Role-Based Route Accessibility

| Route group | Candidate | Recruiter | Organizer | Judge | Admin |
|---|---|---|---|---|---|
| `(public)` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `(candidate)` | **full, own data only** | ✗ | ✗ | ✗ | read-only (support) |
| `(recruiter)` | ✗ | **full, own org's jobs only** | ✗ | ✗ | read-only |
| `(organizer)` | ✗ | ✗ | **full, own hackathons only** | ✗ | read-only |
| `(judge)` | ✗ | ✗ | ✗ | **full, assigned submissions only** | read-only |
| `(admin)` | ✗ | ✗ | ✗ | ✗ | **full** |
| Candidate's own `/my-flags` | ✓ (own flags only) | ✗ | ✗ | ✗ | ✓ (all) |
| Recruiter's fraud-flag *view* on a candidate | ✗ | read-only, display panel only — never a filter (doc 06 §4) | ✗ | ✗ | ✓ |

Enforced server-side via a single FastAPI RBAC dependency (`/services/api/core/rbac.py`) checked on
every route — the frontend route groups mirror this but are not themselves the security boundary.

## 3. Data Visibility Rules (not just page access)

- A candidate sees their **own** full profile, score breakdown, and any flags raised against them.
- A recruiter sees a candidate's **public/shared profile** (whatever the candidate has published) plus
  match scores for their own job postings — never raw fraud-signal internals, only the flag's existence
  in the display-only panel.
- A judge sees only submissions **assigned to them** for the hackathon they're judging — not the full
  candidate profile behind a submission unless the organizer has explicitly made it visible.
- An organizer sees roster and rankings for **their own hackathons only**.
- Admin is the only role with access to the fraud dispute resolution actions (`PATCH /flags/{id}/review`).

*Continue to `11-role-flows-and-use-cases.md`.*

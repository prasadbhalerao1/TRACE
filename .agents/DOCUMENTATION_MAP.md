# DataAxle Project Documentation Map
**Last Updated:** 2026-07-28
**Purpose:** Navigate all project documentation, understand what each doc set covers, and where to look for a given decision.

---

## 📁 Directory Structure

```
DataAxle/
├── .agents/                                    # Agent/MCP configuration
│   ├── Problem_Statement.md                   # Brief: 12 mandatory deliverables
│   ├── constraints.md                          # Constraints & requirements
│   ├── DOCUMENTATION_MAP.md                    # This file
│   ├── DOC_SET_08-11_CONTENTS.md               # What's in multi-agent-architecture/08-11
│   └── QUICK_START_DOCS.md
│
├── doc/                                        # ALL documentation — two complementary sets
│   ├── SRS/                                    # Requirements & shared schema (8 files)
│   │   ├── 00-Master-Architecture-and-Analysis.md
│   │   ├── 01-SRS-Candidate-Intelligence-Platform.md
│   │   ├── 02-SRS-AI-Recruitment-Platform.md
│   │   ├── 03-SRS-Assessment-Verification-System.md
│   │   ├── 04-SRS-PPT-Analyzer.md
│   │   ├── 05-SRS-Hackathon-to-Hiring-Pipeline.md
│   │   ├── 06-SRS-Trust-Fraud-Prevention.md
│   │   └── 07-Multi-Agent-Architecture-LangGraph.md
│   │
│   └── multi-agent-architecture/               # Extended design & implementation detail (12 files)
│       ├── 00-master-architecture.md
│       ├── 01-candidate-intelligence-platform.md
│       ├── 02-recruitment-platform.md
│       ├── 03-assessment-verification.md
│       ├── 04-ppt-analyzer.md
│       ├── 05-hackathon-pipeline.md
│       ├── 06-trust-fraud-prevention.md
│       ├── 07-multi-agent-architecture.md
│       ├── 08-algorithms-and-formulas.md       # Not in SRS
│       ├── 09-ui-design-system.md              # Not in SRS
│       ├── 10-folder-structure-and-accessibility.md  # Not in SRS
│       └── 11-role-flows-and-use-cases.md      # Not in SRS
```

---

## 📊 Both doc sets are current — they cover different ground

Neither folder supersedes the other. `doc/SRS/` and `doc/multi-agent-architecture/` are companion documents written at different times covering the same seven modules from different angles. Use both.

### `doc/SRS/00-07` — Requirements & shared schema
**Files:** 8
**Contains:** Functional requirements, actors, shared core Postgres schema, agent architecture per module, cross-cutting rules (RBAC, model routing, build order).

| # | File | Covers |
|---|---|---|
| 00 | Master-Architecture-and-Analysis | Cross-cutting: tech stack, core schema, deployment, roadmap |
| 01 | Candidate-Intelligence-Platform | Talent Profile Engine, Talent Score™, Dashboard, Resume/Portfolio |
| 02 | AI-Recruitment-Platform | Recruiter Dashboard, Job Matching, Copilot, Analytics |
| 03 | Assessment-Verification-System | Skill Verification, Interview Agent, Team Analytics |
| 04 | PPT-Analyzer | Deck analysis, scoring, plagiarism detection, AI-content detection |
| 05 | Hackathon-Pipeline | Performance tracking, rankings, recruiter surfacing |
| 06 | Trust-Fraud-Prevention | Fake certs, duplicates, plagiarism, authenticity score |
| 07 | Multi-Agent-Architecture-LangGraph | Agent registry, supervisor graph, state schema, routing |

### `doc/multi-agent-architecture/00-11` — Extended architecture, design & implementation detail
**Files:** 12
**Contains:** The same 7-module architecture in more implementation-oriented form, plus four docs with no SRS counterpart:

- **08-algorithms-and-formulas.md** — Talent Score formula, Job Matching formula, plagiarism/structural-similarity detection — the exact math behind every score in the platform.
- **09-ui-design-system.md** — Design tokens, typography, component library, landing page structure, the Evidence Receipt component spec.
- **10-folder-structure-and-accessibility.md** — Full repo layout, page routes per role, component inventory, accessibility specs.
- **11-role-flows-and-use-cases.md** — Step-by-step flows for all 5 roles + plain-English use cases, useful as acceptance criteria.

See `DOC_SET_08-11_CONTENTS.md` for a detailed breakdown of these four.

---

## 🔗 Cross-References & Dependencies

### Dependency Chain (build order):
```
.agents/Problem_Statement.md (defines 12 deliverables)
    ↓
doc/SRS/00 + doc/multi-agent-architecture/00 (shared schema, stack, folder structure)
    ↓
    ├─→ 01-Candidate-Intelligence-Platform (data foundation)
    │   └─→ 02-Recruitment-Platform (depends on candidate data)
    │       └─→ 05-Hackathon-Pipeline (consumes both)
    │
    ├─→ 03-Assessment-Verification (interview, coding sandbox)
    │   └─→ (feeds results back to 01)
    │
    ├─→ 04-PPT-Analyzer (standalone)
    │   └─→ 05-Hackathon-Pipeline (consumes PPT scores)
    │
    ├─→ 06-Trust-Fraud-Prevention (reads from 01, 03, 04)
    │   └─→ 02-Recruitment (fraud flags via event bus)
    │
    └─→ 07-Multi-Agent-Architecture-LangGraph (orchestration, applies to all)
```

### Data Schema Dependencies:
- **Shared Core** (doc/SRS/00 §5): `organizations`, `users`, `files`, `consents`, `events`, `agent_runs`, `audit_logs`
- **Module 01** → `candidate_profiles`, `github_snapshots`, `certifications`, `talent_scores`, `badges`, `career_recommendations`
- **Module 02** → `jobs`, `applications`, `match_scores`, `copilot_conversations`
- **Module 03** → `assessments`, `submissions`, `interview_sessions`, `interview_transcripts`, `interview_reports`, `contribution_reports`
- **Module 04** → `presentations`, `presentation_scores`, `ai_content_flags`
- **Module 05** → `hackathon_events`, `hackathon_submissions`, `hackathon_rankings`, `hackathon_judges`
- **Module 06** → `certificate_verifications`, `plagiarism_checks`, `duplicate_profile_flags`, `candidate_authenticity_scores`

---

## ⚠️ Known Differences Between the Two Doc Sets

On a handful of specific points, the two doc sets literally describe different designs. Neither is auto-authoritative — when your task touches one of these, read both cited sections and, per `constraints.md` §6, resolve deliberately (ask the user if it's not obvious from other context) rather than picking one silently:

| Topic | `doc/SRS` says | `doc/multi-agent-architecture` says | Where |
|---|---|---|---|
| Code sandbox | Pyodide (browser WASM) + server static analysis | Pyodide primary, mentions Piston Docker sandbox in places | 00, 03, 07 |
| Interview speech | Web Speech API | Some sections reference Whisper/Coqui TTS | 03 |
| Latency targets | Removed; measure real numbers | Some sections list numeric targets (<3s, <60s) | 03 |
| `judge_evaluations` table | Not present; judges use `hackathon_submissions.judge_score` | Table appears | 02 |
| `jobs.org_id` | Only `organization_id` | Both `org_id` and `organization_id` appear | 02 |
| `interview_sessions` consent fields | `consent_id` FK only, via central `consents` table | Also has `consent_given`/`timestamp` columns | 03 |
| Cultural Fit scoring | Removed (FR-2.3, agent, score column) | Present as part of Job Matching | 02, 07 |
| Salary data source | Stack Overflow Survey only | Also references AmbitionBox | 01 |
| GitHub OAuth | Explicit: each candidate's own token, no shared server token | Less explicit on this point | 01 |

This list exists so you don't have to re-diff the two doc sets yourself — treat it as "things to double check," not a ruling.

---

## ✋ Action Items

### For Implementation:
1. **Read both `doc/SRS/` and `doc/multi-agent-architecture/`** for the module you're building — they're complementary, not a choice between old/new.
2. For anything in the "Known Differences" table above, don't default to either doc — check with the user or with `.agents/Problem_Statement.md`/`constraints.md` for tie-breaking context.
3. `doc/multi-agent-architecture/08-11` have no SRS counterpart — they're the only source for algorithms, design tokens, folder structure, and role flows. Always consult them for those topics.

### For Reference:
- Problem statement: `.agents/Problem_Statement.md` (12 deliverables)
- Constraints: `.agents/constraints.md` (rate limits, tech requirements, architecture discipline)

---

## 📋 File Size & Complexity Check

```
doc/SRS/00-Master-Architecture-and-Analysis.md      ~15 KB   (shared foundations)
doc/SRS/01-SRS-Candidate-Intelligence-Platform.md   ~12 KB   (Talent Score™, dashboard)
doc/SRS/02-SRS-AI-Recruitment-Platform.md           ~9 KB    (matching, copilot)
doc/SRS/03-SRS-Assessment-Verification-System.md    ~12 KB   (interviews, coding sandbox)
doc/SRS/04-SRS-PPT-Analyzer.md                      ~7 KB    (deck analysis)
doc/SRS/05-SRS-Hackathon-to-Hiring-Pipeline.md      ~8 KB    (rankings, recruiter surfacing)
doc/SRS/06-SRS-Trust-Fraud-Prevention.md            ~9 KB    (fraud detection, authenticity)
doc/SRS/07-Multi-Agent-Architecture-LangGraph.md    ~8 KB    (agent registry, orchestration)
────────────────────────────────────────────────────
TOTAL: ~80 KB across 8 files

doc/multi-agent-architecture/08-algorithms-and-formulas.md        ~20 KB
doc/multi-agent-architecture/09-ui-design-system.md               ~12 KB
doc/multi-agent-architecture/10-folder-structure-...md            ~15 KB
doc/multi-agent-architecture/11-role-flows-and-use-cases.md       ~18 KB
────────────────────────────────────────────────────
                                                     ~65 KB
```

---

**Prepared for:** Hackathon build
**Source of truth:** Both `doc/SRS/` and `doc/multi-agent-architecture/` — read the module doc from each set, plus 08-11 for algorithms/design/structure/flows.

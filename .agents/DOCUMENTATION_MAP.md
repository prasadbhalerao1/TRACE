# DataAxle Project Documentation Map
**Last Updated:** 2026-07-28  
**Purpose:** Navigate all project documentation, understand relationships, identify duplicates and sources of truth

---

## 📁 Directory Structure

```
DataAxle/
├── .agents/                                    # Agent/MCP configuration
│   ├── Problem_Statement.md                   # Brief: 12 mandatory deliverables
│   ├── constraints.md                          # Constraints & requirements
│   ├── DOCUMENTATION_MAP.md                    # This file
│   ├── PRESERVE_LEGACY_DOCS.md
│   └── QUICK_START_DOCS.md
│
├── doc/                                        # ALL documentation (divided into 2 versions)
│   ├── SRS/                                    # ⭐ CURRENT - Latest/Corrected (8 files)
│   │   ├── 00-Master-Architecture-and-Analysis.md
│   │   ├── 01-SRS-Candidate-Intelligence-Platform.md
│   │   ├── 02-SRS-AI-Recruitment-Platform.md
│   │   ├── 03-SRS-Assessment-Verification-System.md
│   │   ├── 04-SRS-PPT-Analyzer.md
│   │   ├── 05-SRS-Hackathon-to-Hiring-Pipeline.md
│   │   ├── 06-SRS-Trust-Fraud-Prevention.md
│   │   └── 07-Multi-Agent-Architecture-LangGraph.md
│   │
│   └── multi-agent-architecture/              # ⚠️ LEGACY - Earlier version (13 files)
│       ├── 00-master-architecture.md
│       ├── 01-candidate-intelligence-platform.md
│       ├── 02-recruitment-platform.md
│       ├── 03-assessment-verification.md
│       ├── 04-ppt-analyzer.md
│       ├── 05-hackathon-pipeline.md
│       ├── 06-trust-fraud-prevention.md
│       ├── 06-trust-fraud-prevention (1).md   # ⚠️ DUPLICATE FILE
│       ├── 07-multi-agent-architecture.md
│       ├── 08-algorithms-and-formulas.md      # ℹ️ Extra (not in SRS)
│       ├── 09-ui-design-system.md             # ℹ️ Extra (not in SRS)
│       ├── 10-folder-structure-and-accessibility.md  # ℹ️ Extra (not in SRS)
│       └── 11-role-flows-and-use-cases.md     # ℹ️ Extra (not in SRS)
```

---

## 📊 Documentation Versions Comparison

### ✅ SRS Version (doc/SRS) — RECOMMENDED
**Status:** Current, with 8 corrections applied  
**Files:** 8  
**Last Updated:** Today (2026-07-28)  
**Contains:** All core requirements across 7 modules + master architecture  
**Quality:** ⭐⭐⭐⭐⭐ Use this version for all implementation

#### File Mapping:
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

---

### ⚠️ Multi-Agent-Architecture Version (doc/multi-agent-architecture) — LEGACY
**Status:** Earlier iteration  
**Files:** 13 (11 core + 2 extras + 1 duplicate)  
**Contains:** Similar to SRS but pre-correction + additional design docs  
**Quality:** ⭐⭐⭐ Reference only; do NOT use for implementation (contains bugs and removed features)  
**Why kept:** May have additional design details in docs 08-11 not in SRS

#### Additional Files (not in SRS):
- **08-algorithms-and-formulas.md** — May contain salary model, scoring formulas
- **09-ui-design-system.md** — Design tokens, component library
- **10-folder-structure-and-accessibility.md** — Repo layout, WCAG compliance
- **11-role-flows-and-use-cases.md** — Detailed user journeys by role

---

## 🎯 What Changed in SRS (8 Corrections Applied)

| # | Issue | Location | Change | Status |
|---|---|---|---|---|
| 1 | Sandbox complexity | 00, 03, 07 | Piston → Pyodide (browser WASM) + server static analysis | ✅ |
| 2 | Speech TTS | 03 | Whisper/Coqui → Web Speech API | ✅ |
| 3 | Latency targets | 03 | Removed <3s, <60s targets; use measured numbers | ✅ |
| 4a | judge_evaluations table | 02 | Deleted (judges use hackathon_submissions.judge_score) | ✅ |
| 4b | jobs.org_id duplicate | 02 | Removed duplicate column, kept organization_id | ✅ |
| 4c | interview_sessions consent | 03 | Removed consent_given/timestamp, use consent_id FK only | ✅ |
| 4d | confidence_score undefined | 03 | Defined as "per-topic consistency & depth signals" | ✅ |
| 5 | Cultural Fit | 02, 07 | Removed FR-2.3, agent, score column entirely | ✅ |
| 6 | Salary data source | 01 | AmbitionBox → Stack Overflow Survey only | ✅ |
| 7 | Scale assumptions | 00, 03 | Noted Qdrant cap, rate limits not issues at 20 users | ✅ |
| 8 | GitHub OAuth | 01 | Clarified: each candidate uses own token, no shared server token | ✅ |

---

## 🔗 Cross-References & Dependencies

### Dependency Chain (build order):
```
.agents/Problem_Statement.md (defines 12 deliverables)
    ↓
doc/SRS/00-Master-Architecture-and-Analysis.md (shared schema, stack)
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

## ✋ Action Items

### For Implementation:
1. **Use ONLY `doc/SRS/` for all coding** — it contains the 8 corrections
2. **Delete or archive `doc/multi-agent-architecture/`** — legacy, source of confusion
3. **Fix duplicate file:** `06-trust-fraud-prevention (1).md` should be deleted
4. **Check docs 08-11 in legacy version** for any unique design content worth extracting (design system, algorithms, UI flows) before deleting

### For Reference:
- Problem statement: `.agents/Problem_Statement.md` (12 deliverables)
- Constraints: `.agents/constraints.md` (rate limits, tech requirements)

---

## 📋 File Size & Complexity Check

```bash
# SRS version (CURRENT)
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
```

---

## 🚨 Known Issues (Fixed in SRS)

| Issue | Was In | Now Fixed |
|---|---|---|
| Piston server-side sandbox complexity | multi-ag 03, 07, 00 | ✅ SRS: Pyodide only |
| Cultural Fit bias vector | multi-ag 02, 07 | ✅ SRS: Removed entirely |
| judge_evaluations table duplication | multi-ag 02 | ✅ SRS: Deleted |
| Unverified latency targets | multi-ag 03 | ✅ SRS: Removed |
| Undefined confidence_score field | multi-ag 03 | ✅ SRS: Defined |
| Salary scraped from AmbitionBox | multi-ag 01 | ✅ SRS: Stack Overflow only |
| Duplicate org_id column in jobs | multi-ag 02 | ✅ SRS: Fixed |
| Interview consent redundancy | multi-ag 03 | ✅ SRS: Central consents table only |

---

## 💡 Recommendations

1. **Archive or delete `doc/multi-agent-architecture/`** immediately to avoid confusion
2. **Update any local IDE references** to point to `doc/SRS/`
3. **Extract unique value from docs 08-11** (if any) before deletion:
   - 08: Algorithms/formulas for salary regression, scoring
   - 09: UI design tokens, component specs
   - 10: Folder structure conventions
   - 11: User journey workflows
4. **Delete duplicate:** `06-trust-fraud-prevention (1).md`
5. **Use this map** as the canonical reference for what documentation exists

---

**Prepared for:** Hackathon build  
**Source of Truth:** `doc/SRS/` (all modules 00-07)  
**Status:** All 8 corrections applied and verified

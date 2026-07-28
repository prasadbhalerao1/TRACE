# 📚 Quick Reference: Where Everything Is & What to Use

## 🎯 TL;DR

| Question | Answer | File |
|---|---|---|
| **What's the brief?** | 12 mandatory deliverables for hackathon | `.agents/Problem_Statement.md` |
| **What's the architecture?** | Tech stack, core schema, deployment | `doc/SRS/00-Master-Architecture-and-Analysis.md` |
| **What am I building? (detailed)** | 7 independent modules, each with full SRS | `doc/SRS/01-07-*.md` |
| **What's wrong with the old docs?** | Cultural Fit removed, Piston → Pyodide, etc. | `.agents/DOCUMENTATION_MAP.md` § "What Changed" |
| **What should I code first?** | Candidate Intelligence → Matching → Verification | `doc/SRS/00` § "Build Order" |
| **What's the formula for Talent Score?** | 7-term weighted sum, dynamic renormalization | `doc/multi-agent-architecture/08-algorithms-and-formulas.md` (preserve this) |
| **What color is "verified"?** | Teal (#0E7C86), Evidence Receipt design | `doc/multi-agent-architecture/09-ui-design-system.md` (preserve this) |
| **What routes exist?** | 50+ pages grouped by role | `doc/multi-agent-architecture/10-folder-structure-and-accessibility.md` (preserve this) |
| **Walk me through signing up as a candidate** | 14-step flow with plain-English use cases | `doc/multi-agent-architecture/11-role-flows-and-use-cases.md` (preserve this) |

---

## 📂 The Two Documentation Sets

### ✅ SRS Version (USE THIS)
**Location:** `doc/SRS/`  
**Files:** 8 (`00-07`)  
**Status:** Latest, all 8 corrections applied  
**Quality:** Production-ready  
**Use for:** All implementation, decisions, requirements

```
doc/SRS/
├── 00-Master-Architecture-and-Analysis.md      ← Start here
├── 01-SRS-Candidate-Intelligence-Platform.md   ← Talent Score logic
├── 02-SRS-AI-Recruitment-Platform.md           ← Matching engine
├── 03-SRS-Assessment-Verification-System.md    ← Interviews, sandbox
├── 04-SRS-PPT-Analyzer.md                      ← Presentation scoring
├── 05-SRS-Hackathon-to-Hiring-Pipeline.md      ← Rankings & discovery
├── 06-SRS-Trust-Fraud-Prevention.md            ← Authenticity score
└── 07-Multi-Agent-Architecture-LangGraph.md    ← Agent orchestration
```

### ⚠️ Legacy Version (REFERENCE ONLY)
**Location:** `doc/multi-agent-architecture/`  
**Files:** 13 (11 core + 2 extras + 1 duplicate)  
**Status:** Earlier iteration, pre-corrections  
**Quality:** Reference/research  
**Use for:** Extra implementation detail only (docs 08-11), then delete

```
doc/multi-agent-architecture/
├── 00-11 ...                      ← DON'T USE (has bugs, removed features)
├── 08-algorithms-and-formulas.md  ← ⭐ PRESERVE & MIGRATE to SRS
├── 09-ui-design-system.md         ← ⭐ PRESERVE & MIGRATE to SRS
├── 10-folder-structure-and-accessibility.md  ← ⭐ PRESERVE & MIGRATE to SRS
├── 11-role-flows-and-use-cases.md ← ⭐ PRESERVE & MIGRATE to SRS
└── 06-trust-fraud-prevention (1).md ← ❌ DELETE (duplicate)
```

---

## 🔄 8 Corrections Applied to SRS

| # | Was | Now | Files Changed |
|---|---|---|---|
| 1 | Piston server sandbox | Pyodide browser WASM | 00, 03, 07 |
| 2 | Self-hosted Whisper/Coqui TTS | Web Speech API | 03 |
| 3 | Latency targets (<3s, <60s) | Removed; measure real numbers | 03 |
| 4a | judge_evaluations table exists | Deleted (use hackathon_submissions) | 02 |
| 4b | jobs.org_id + organization_id | Removed duplicate column | 02 |
| 4c | interview_sessions.consent_given/timestamp | Removed; use consents.consent_id FK | 03 |
| 4d | Confidence Score undefined | Defined: per-topic signals | 03 |
| 5 | Cultural Fit scoring | Removed (bias vector) | 02, 07 |
| 6 | Salary from AmbitionBox | Stack Overflow Survey only | 01 |
| 7 | Scale worries | Noted: non-issues at 20 users | 00, 03 |
| 8 | Shared GitHub token risk | Each candidate's own OAuth token | 01 |

---

## 🚀 Implementation Order

**Phase 1 — Foundation (Day 1)**
1. Read `doc/SRS/00` fully
2. Set up database schema from `doc/SRS/00` § 5
3. Scaffold auth + RBAC middleware
4. Candidate & Recruiter dashboard shells

**Phase 2 — Core AI Loop (Days 1–2)**
5. Read `doc/SRS/01` → build Talent Score agent
6. Read `doc/SRS/03` → build Skill Verification agents
7. Read `doc/multi-agent-architecture/08` → implement scoring formulas

**Phase 3 — Matching (Days 2–3)**
8. Read `doc/SRS/02` → build Job Matching agents
9. Read `doc/multi-agent-architecture/09` → design UI

**Phase 4 — Verification (Days 2–3, parallel)**
10. Build Interview Agent (stateful, WebSocket)
11. Implement Pyodide sandbox for code execution
12. Implement Web Speech API for voice

**Phase 5 — Everything Else (Days 3–5)**
13. `doc/SRS/04` → PPT Analyzer
14. `doc/SRS/05` → Hackathon Pipeline
15. `doc/SRS/06` → Fraud Prevention
16. Read `doc/multi-agent-architecture/10-11` → build routes & test cases

---

## 🎓 How to Navigate Each SRS Module

**Every module (01-07) follows this structure:**

```markdown
## 1. Scope              — What problem does this module solve?
## 2. Actors             — Who interacts with it? (candidate, recruiter, etc.)
## 3. Functional Reqs    — FR-1, FR-2, ... (what must it do?)
## 4. Agent Architecture — LangGraph diagram + state schema + agent roles
## 5. Data Model         — SQL tables (CREATE TABLE ...)
## 6-8. Implementation   — APIs, libraries, non-functional requirements
## 10-11. Success Metrics— How do we know if it works?
```

**Always read in this order:**
1. Scope + Actors → understand the "why"
2. Functional Reqs → understand the "what"
3. Agent Architecture → understand the "how" (AI orchestration)
4. Data Model → understand the database
5. Implementation → understand the code

---

## 🛠️ Critical Files by Role

### I'm a **Backend/AI Developer**
1. `doc/SRS/00` § 6–7 (agent registry, routing policy)
2. `doc/SRS/07` (LangGraph orchestration)
3. `doc/SRS/01-06` (module-specific agents)
4. `doc/multi-agent-architecture/08` (algorithms & formulas)

### I'm a **Frontend Developer**
1. `doc/SRS/00` § 3 (tech stack: Next.js, shadcn, Tailwind)
2. `doc/multi-agent-architecture/09` (design system, tokens, components)
3. `doc/multi-agent-architecture/10` (folder structure, routes)
4. `doc/SRS/01-06` § 8–9 (each module's frontend sections)

### I'm a **QA/Test Lead**
1. `doc/multi-agent-architecture/11` (role flows & use cases = test scenarios)
2. `doc/SRS/00` (acceptance criteria in each FR)
3. `doc/SRS/01-06` § 10–11 (success metrics)

### I'm a **Product/UX Designer**
1. `doc/multi-agent-architecture/09` (design system)
2. `doc/multi-agent-architecture/11` (user flows)
3. `doc/SRS/01-06` § 3 (functional requirements)

### I'm a **Judge/Evaluator**
1. `doc/SRS/00` (why these decisions?)
2. `doc/SRS/07` (multi-agent provenance: "why did this score happen?")
3. `.agents/DOCUMENTATION_MAP.md` (map between brief & modules)

---

## 📊 File Sizes (for context)

```
doc/SRS/00-Master-Architecture-and-Analysis.md          ~15 KB
doc/SRS/01-SRS-Candidate-Intelligence-Platform.md      ~12 KB
doc/SRS/02-SRS-AI-Recruitment-Platform.md              ~9 KB
doc/SRS/03-SRS-Assessment-Verification-System.md       ~12 KB
doc/SRS/04-SRS-PPT-Analyzer.md                         ~7 KB
doc/SRS/05-SRS-Hackathon-to-Hiring-Pipeline.md         ~8 KB
doc/SRS/06-SRS-Trust-Fraud-Prevention.md               ~9 KB
doc/SRS/07-Multi-Agent-Architecture-LangGraph.md       ~8 KB
                                                        ──────
                                                Total: ~80 KB

doc/multi-agent-architecture/08-algorithms-and-formulas.md        ~20 KB ⭐
doc/multi-agent-architecture/09-ui-design-system.md              ~12 KB ⭐
doc/multi-agent-architecture/10-folder-structure-...md           ~15 KB ⭐
doc/multi-agent-architecture/11-role-flows-and-use-cases.md      ~18 KB ⭐
                                                                  ──────
                                            (Preserve these) ~65 KB
```

---

## ✅ Pre-Implementation Checklist

- [ ] Read `doc/SRS/00` end-to-end (master architecture)
- [ ] Skim all `doc/SRS/01-07` (understand all 7 modules)
- [ ] Extract `doc/multi-agent-architecture/08-11` to `doc/SRS/08-11` (algorithms, design, structure, flows)
- [ ] Delete `doc/multi-agent-architecture/` folder entirely
- [ ] Use `.agents/DOCUMENTATION_MAP.md` as your reference
- [ ] Share role-specific docs with your team (backend gets 07 + 08, frontend gets 09 + 10, QA gets 11)
- [ ] Create a quick-reference Slack bookmark to this file

---

## 🤔 Common Questions

**Q: Should I read the legacy docs?**  
A: No. Read SRS only. Legacy has bugs (Cultural Fit, Piston). Only use docs 08-11 for extra implementation detail, then migrate them.

**Q: Where's the database schema?**  
A: `doc/SRS/00` § 5 (shared tables) + each module's § 5 (module tables).

**Q: How do I know if my implementation is correct?**  
A: Check against § 10–11 in each module (success metrics, non-functional requirements).

**Q: Where are the API endpoints?**  
A: `doc/SRS/01-06` § 6 in each module.

**Q: How do I make sure scores are explainable?**  
A: Every agent writes to `agent_runs` table (§ 00.5). Use `langfuse_trace_id` to trace the full flow.

**Q: Should I build Cultural Fit scoring?**  
A: No. It was removed (bias vector). Score only: Skill Similarity + Project Relevance.

**Q: Can I use Piston for code sandbox?**  
A: No. Use Pyodide (browser WASM) only. Simpler, no server infra.

**Q: Why are the design tokens in the legacy docs?**  
A: They should be in SRS 08-11 (after migration). Copy from `09-ui-design-system.md` to your Tailwind config immediately.

---

## 🚦 Status Summary

| Component | Status | Location | Action |
|---|---|---|---|
| Requirements (SRS 00-07) | ✅ Complete, all corrections applied | `doc/SRS/` | Use immediately |
| Algorithms & formulas | ✅ Complete | `doc/multi-ag/08` | Migrate to SRS 08 |
| Design system | ✅ Complete | `doc/multi-ag/09` | Migrate to SRS 09 |
| Repository structure | ✅ Complete | `doc/multi-ag/10` | Migrate to SRS 10 |
| Role flows & use cases | ✅ Complete | `doc/multi-ag/11` | Migrate to SRS 11 |
| Documentation map | ✅ Complete | `.agents/DOCUMENTATION_MAP.md` | Reference guide |
| Quick start guide | ✅ Complete | `.agents/QUICK_START_DOCS.md` | You are here |
| Legacy docs migration | ⏳ Ready to start | `.agents/PRESERVE_LEGACY_DOCS.md` | Follow checklist |

---

**Last updated:** 2026-07-28  
**Prepared by:** Claude Code  
**For:** Hackathon build team

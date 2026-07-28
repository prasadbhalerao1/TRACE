# 📚 Quick Reference: Where Everything Is & What to Use

## 🎯 TL;DR

| Question | Answer | File |
|---|---|---|
| **What's the brief?** | 12 mandatory deliverables for hackathon | `.agents/Problem_Statement.md` |
| **What's the architecture?** | Tech stack, core schema, deployment | `doc/SRS/00-Master-Architecture-and-Analysis.md` + `doc/multi-agent-architecture/00-master-architecture.md` |
| **What am I building? (detailed)** | 7 independent modules, each with full requirements | `doc/SRS/01-07-*.md` + `doc/multi-agent-architecture/01-07-*.md` |
| **Where do the two doc sets disagree?** | See table | `.agents/DOCUMENTATION_MAP.md` § "Known Differences" |
| **What should I code first?** | Candidate Intelligence → Matching → Verification | `doc/SRS/00` § "Build Order" |
| **What's the formula for Talent Score?** | 7-term weighted sum, dynamic renormalization | `doc/multi-agent-architecture/08-algorithms-and-formulas.md` |
| **What color is "verified"?** | Teal (#0E7C86), Evidence Receipt design | `doc/multi-agent-architecture/09-ui-design-system.md` |
| **What routes exist?** | 50+ pages grouped by role | `doc/multi-agent-architecture/10-folder-structure-and-accessibility.md` |
| **Walk me through signing up as a candidate** | 14-step flow with plain-English use cases | `doc/multi-agent-architecture/11-role-flows-and-use-cases.md` |

---

## 📂 The Two Documentation Sets

Both are current. They cover the same modules from different angles — read both for whatever you're building.

### `doc/SRS/` — Requirements & schema
**Files:** 8 (`00-07`)
**Use for:** Functional requirements, actors, shared/module data schemas, agent state machines.

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

### `doc/multi-agent-architecture/` — Extended design & implementation detail
**Files:** 12 (`00-11`)
**Use for:** Everything in the SRS set, in more implementation-oriented form, plus algorithms, UI design, folder structure, and role flows that have no SRS counterpart.

```
doc/multi-agent-architecture/
├── 00-11 ...                                  ← Companion to doc/SRS, same 7 modules
├── 08-algorithms-and-formulas.md              ← ⭐ Only source for scoring formulas
├── 09-ui-design-system.md                     ← ⭐ Only source for design tokens
├── 10-folder-structure-and-accessibility.md   ← ⭐ Only source for routes/folder layout
└── 11-role-flows-and-use-cases.md             ← ⭐ Only source for role flows
```

---

## ⚠️ Where the Two Sets Disagree

A handful of specific points differ between the two sets (Piston vs. Pyodide sandbox mentions, Cultural Fit scoring present/absent, a couple of duplicate schema columns, etc.) — see `.agents/DOCUMENTATION_MAP.md` § "Known Differences Between the Two Doc Sets" for the full table. When your task touches one of these, don't silently pick a side — check both cited sections and resolve deliberately (ask if it's not obvious from `Problem_Statement.md` or `constraints.md`).

---

## 🚀 Implementation Order

**Phase 1 — Foundation (Day 1)**
1. Read `doc/SRS/00` and `doc/multi-agent-architecture/00` fully
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
doc/multi-agent-architecture/09-ui-design-system.md               ~12 KB ⭐
doc/multi-agent-architecture/10-folder-structure-...md           ~15 KB ⭐
doc/multi-agent-architecture/11-role-flows-and-use-cases.md      ~18 KB ⭐
                                                                  ──────
                                                            ~65 KB
```

---

## ✅ Pre-Implementation Checklist

- [ ] Read `doc/SRS/00` and `doc/multi-agent-architecture/00` end-to-end (master architecture, both angles)
- [ ] Skim all `doc/SRS/01-07` and `doc/multi-agent-architecture/01-07` (understand all 7 modules)
- [ ] Read `doc/multi-agent-architecture/08-11` for algorithms, design, structure, flows (no SRS counterpart)
- [ ] Check `.agents/DOCUMENTATION_MAP.md` § "Known Differences" before implementing anything on that list
- [ ] Share role-specific docs with your team (backend gets 07 + 08, frontend gets 09 + 10, QA gets 11)

---

## 🤔 Common Questions

**Q: Should I read `doc/multi-agent-architecture`?**
A: Yes — both doc sets are current. It's the only source for algorithms (08), design system (09), folder structure (10), and role flows (11).

**Q: Where's the database schema?**
A: `doc/SRS/00` § 5 (shared tables) + each module's § 5 (module tables).

**Q: How do I know if my implementation is correct?**
A: Check against § 10–11 in each SRS module (success metrics, non-functional requirements).

**Q: Where are the API endpoints?**
A: `doc/SRS/01-06` § 6 in each module.

**Q: How do I make sure scores are explainable?**
A: Every agent writes to `agent_runs` table (§ 00.5). Use `langfuse_trace_id` to trace the full flow.

**Q: Should I build Cultural Fit scoring?**
A: The two doc sets disagree here — `doc/SRS/02` omits it, `doc/multi-agent-architecture/02` includes it. Check `.agents/DOCUMENTATION_MAP.md`'s differences table and confirm with the user before implementing either way.

**Q: Can I use Piston for code sandbox, or only Pyodide?**
A: Same — the two sets differ on this. Pyodide (browser WASM) is the primary design in both; confirm before adding server-side sandbox infra.

**Q: Why are the design tokens in `doc/multi-agent-architecture`?**
A: Because that's the only doc set with a UI Design System doc — copy from `09-ui-design-system.md` to your Tailwind config (already done in `apps/web`).

---

**Last updated:** 2026-07-28
**Prepared by:** Claude Code
**For:** Hackathon build team

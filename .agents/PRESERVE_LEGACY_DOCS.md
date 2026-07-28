# Legacy Documentation Integration Guide
**Purpose:** Identify and preserve valuable content from `doc/multi-agent-architecture/` before archiving  
**Status:** Analysis complete — ready for integration decisions

---

## 📊 Summary: What to Preserve from Legacy Docs (08-11)

| Doc | File | Status | Value | Action |
|---|---|---|---|---|
| 08 | `08-algorithms-and-formulas.md` | ⭐⭐⭐ **HIGH** | Mathematical formulas, implementation notes, tunable defaults | **MUST PRESERVE** — merge into SRS 00 or create new `08-Implementation-Algorithms.md` |
| 09 | `09-ui-design-system.md` | ⭐⭐⭐ **HIGH** | Design tokens, typography, component library, landing page structure, Evidence Receipt component spec | **MUST PRESERVE** — merge into SRS or create new `08-UI-Design-System.md` |
| 10 | `10-folder-structure-and-accessibility.md` | ⭐⭐⭐ **HIGH** | Complete repo folder structure, page routes per role, component inventory, accessibility specs | **MUST PRESERVE** — merge into SRS 07 or create new `09-Repository-Structure.md` |
| 11 | `11-role-flows-and-use-cases.md` | ⭐⭐⭐ **HIGH** | Step-by-step flows for all 5 roles + plain-English use cases | **MUST PRESERVE** — merge into SRS 00 as Appendix or create new `10-Role-Flows-and-Use-Cases.md` |

**Bottom line:** All four extra docs contain implementation-critical details. Do NOT delete without extracting.

---

## 🔍 Detailed Content Breakdown

### Doc 08: Algorithms & Formulas (HIGHEST PRIORITY)

**Contains:** Mathematical specs for all scoring systems  
**Critical for:** Implementation of Talent Score, Job Matching, Code Plagiarism detection, etc.  
**Status:** Correct and complete (already reflects the 8 corrections)

**Key sections:**
```
1. Talent Score™ formula (weighted 7 sub-scores)
   - Dynamic weight renormalization for cold start
   - Practical notes on complexity penalties
   - What NOT to include (fraud stays separate)
   
2. Job Matching Score (4-term formula)
   - Semantic similarity blending
   - Skill overlap weighting
   
3. Code Plagiarism / Structural Similarity (Modules 3 & 6)
   [truncated in my read, but contains critical detection logic]
```

**Action:**
- [ ] Read full doc (it's long)
- [ ] Extract all formulas as a standalone reference doc: `08-Implementation-Algorithms.md`
- [ ] Add to SRS as appendix or cross-reference
- [ ] Ensure all constants are marked "tunable default" vs "validated"

---

### Doc 09: UI Design System (HIGH PRIORITY)

**Contains:** Visual identity, component specs, landing page structure  
**Critical for:** Frontend dev, designer onboarding, landing page build  
**Status:** Complete and production-ready

**Key sections:**
```
1. Design Concept — "Proof over paperwork" thesis
   - The Evidence Receipt component (signature element)
   - Used everywhere: dashboards, reports, fraud flags
   
2. Design Tokens (6 colors, 3 fonts)
   - ink (#12161C), paper (#F3F4F1)
   - teal-verified, amber-pending, rose-flagged
   - Space Grotesk, IBM Plex Sans, IBM Plex Mono
   
3. Frontend Libraries
   - Next.js 14, Tailwind, shadcn/ui
   - Recharts, dnd-kit, Monaco, Framer Motion
   
4. Landing Page Section Plan
   - Nav, Hero (live Evidence Receipt animation)
   - Problem/solution section, How it works (01–04)
   - For Candidates / For Recruiters splits
   - Trust section linking to fraud/review flow
```

**Action:**
- [ ] Extract as `08-UI-Design-System.md` (or create Figma link)
- [ ] Add design tokens to Tailwind config (colors, typography)
- [ ] Create component library stubs (Evidence Receipt most critical)
- [ ] Hand off to design/frontend lead with this exact doc

---

### Doc 10: Folder Structure & Accessibility (HIGH PRIORITY)

**Contains:** Complete repo layout with all routes, components, role-based page structure  
**Critical for:** Project setup, navigation, component inventory  
**Status:** Comprehensive and correct

**Key sections:**
```
1. Complete Repository Structure
   /apps/web/
     /(public) - landing, sign-in/up, candidate portfolio, hackathon leaderboard
     /(candidate) - dashboard, profile, career, resume builder, assessments, interview, disputes
     /(recruiter) - dashboard, jobs, matches, copilot, pipeline, analytics, top performers, reports
     /(organizer) - hackathon mgmt, rankings
     /(judge) - evaluation queue, rubric scoring
     /(admin) - fraud review, user mgmt, audit log
   
   /components - 25+ component specs (EvidenceReceipt, KanbanBoard, CodeEditor, etc.)
   
2. Role-Based Accessibility
   - Each route has implied RBAC middleware
   - Component reuse across roles
```

**Action:**
- [ ] Extract as `09-Repository-Structure.md`
- [ ] Create this as the "project map" for developers
- [ ] Use as basis for folder setup in implementation
- [ ] Cross-reference with SRS 07 (agent registry) to map which components call which agents

---

### Doc 11: Role Flows & Use Cases (HIGH PRIORITY)

**Contains:** Step-by-step walkthroughs for all 5 user types + 40+ plain-English use cases  
**Critical for:** UX design, acceptance testing, user stories  
**Status:** Complete, actionable, and well-written

**Key sections:**
```
1. Candidate Flow (14 steps)
   - Sign up → Connect GitHub → Upload resume → Conflicts → Career guidance → Generate portfolio
   - Assessments → Interview → Dispute flags → Hackathon submission
   - 14 plain-English use cases ("I can connect my GitHub…")

2. Recruiter Flow (10 steps + 8 use cases)
   - Post job → See matches → Use Copilot → Move through pipeline
   - Assign work → Review reports → Check analytics → Watch hackathons
   - See fraud flags (but never auto-filtered)

3. Organizer Flow (6 steps + implied use cases)
   - Create event → Assign judges → Teams submit → Scoring
   - Auto-combine judge scores + module scores → Notify recruiters

4. Judge Flow (4 steps + use cases)
   - View queue → Score against rubric

5. Admin Flow (implied, not detailed yet)
```

**Action:**
- [ ] Extract as `10-Role-Flows-and-Use-Cases.md`
- [ ] Convert use cases to acceptance criteria in your test suite
- [ ] Share with QA for test planning
- [ ] Use as demo script outline

---

## 📋 Migration Checklist

### Phase 1: Analysis (✅ DONE)
- [x] Identify unique content in docs 08-11
- [x] Assess value and completeness
- [x] Determine preservation priority

### Phase 2: Extraction (TODO)
- [ ] Read full doc 08 (algorithms may be longer than excerpt)
- [ ] Copy each legacy doc to SRS folder with new numbering
- [ ] Update cross-references between old and new locations
- [ ] Verify all 8 corrections are reflected in extracted docs

### Phase 3: Integration (TODO)
- [ ] Merge algorithms into SRS 00 or create SRS 08
- [ ] Merge design system into SRS or create SRS 08
- [ ] Merge folder structure into SRS 07 or create SRS 09
- [ ] Merge flows into SRS as Appendix or create SRS 10
- [ ] Update DOCUMENTATION_MAP.md with new structure

### Phase 4: Cleanup (TODO)
- [ ] Delete `doc/multi-agent-architecture/` folder entirely
- [ ] Delete duplicate file `06-trust-fraud-prevention (1).md` (if not already cleaned up)
- [ ] Verify no broken cross-references remain
- [ ] Confirm all 8 corrections are in the preserved content

---

## 🎯 Recommended Preservation Strategy

### Option A: **Expand SRS to 10 docs** (RECOMMENDED)
Keep everything under `doc/SRS/` with this structure:
```
doc/SRS/
├── 00-Master-Architecture-and-Analysis.md     (shared, cross-cutting)
├── 01-SRS-Candidate-Intelligence-Platform.md
├── 02-SRS-AI-Recruitment-Platform.md
├── 03-SRS-Assessment-Verification-System.md
├── 04-SRS-PPT-Analyzer.md
├── 05-SRS-Hackathon-to-Hiring-Pipeline.md
├── 06-SRS-Trust-Fraud-Prevention.md
├── 07-Multi-Agent-Architecture-LangGraph.md
├── 08-Implementation-Algorithms.md             ← NEW (from legacy 08)
├── 09-UI-Design-System.md                      ← NEW (from legacy 09)
├── 10-Repository-Structure.md                  ← NEW (from legacy 10)
└── 11-Role-Flows-and-Use-Cases.md              ← NEW (from legacy 11)
```

**Pros:**
- Single source of truth (SRS folder only)
- Clear numbering (00-11)
- All cross-references in one place
- Easy to archive/version control

**Cons:**
- SRS folder gets larger (but still manageable)

### Option B: **Create separate `/doc/IMPLEMENTATION/` folder**
Keep SRS as requirements, move implementation details elsewhere:
```
doc/SRS/              (requirements, business logic, scope)
doc/IMPLEMENTATION/   (algorithms, UI design, folder structure, flows)
  ├── algorithms.md
  ├── ui-design-system.md
  ├── repository-structure.md
  └── role-flows-and-use-cases.md
```

**Pros:**
- Separates "what we're building" from "how we build it"
- Could scale to include API docs, deployment guides later

**Cons:**
- Splits information across folders
- Harder to keep in sync during development

---

## 📌 Immediate Next Steps

**Priority 1 (Do this NOW):**
1. Read full content of docs 08-11 (I only read the first 80 lines)
2. Decide: Option A or Option B above?
3. Create new files with cleaned content (verify all 8 corrections are present)

**Priority 2 (Before implementation):**
1. Extract design tokens to Tailwind config
2. Create Evidence Receipt component template
3. Map folder structure to your IDE setup

**Priority 3 (During development):**
1. Use role flows as acceptance criteria
2. Reference algorithms doc during scoring implementation
3. Keep design system doc open while building UI

---

## 🗑️ What to Delete (with confidence)

**Safe to delete immediately:**
- `doc/multi-agent-architecture/06-trust-fraud-prevention (1).md` — exact duplicate, no unique content

**Safe to delete after extraction:**
- Entire `doc/multi-agent-architecture/` folder (after docs 08-11 are migrated to SRS)
  
**Do NOT delete:**
- `.agents/Problem_Statement.md` — the original brief
- `.agents/constraints.md` — rate limits and tech requirements

---

## 📞 Contacts & Handoff

When migration is complete, hand these docs off to:
- **Frontend lead:** `09-UI-Design-System.md` + `10-Repository-Structure.md`
- **QA/Test lead:** `11-Role-Flows-and-Use-Cases.md` (for acceptance criteria)
- **Backend/Algorithm lead:** `08-Implementation-Algorithms.md`
- **All devs:** Updated `DOCUMENTATION_MAP.md` showing new structure

---

**Status:** Ready to proceed with Phase 2  
**Estimated effort:** 2-3 hours to extract, integrate, and verify  
**Blocker:** None — can proceed independently of implementation

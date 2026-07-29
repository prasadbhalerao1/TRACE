---
name: project-doc-sets-both-current
description: "doc/SRS and doc/multi-agent-architecture are both current, complementary doc sets for this hackathon project — neither supersedes the other, despite older .agents notes that used to say otherwise."
metadata: 
  node_type: memory
  type: project
  originSessionId: ba37eec6-0e21-484f-9db3-96cd6f46c88e
  modified: 2026-07-28T18:31:46.996Z
---

This repo (AI Talent Intelligence & Recruitment Platform, hackathon build) has two documentation folders: `doc/SRS/00-07` (requirements, shared schema) and `doc/multi-agent-architecture/00-11` (extended design/implementation detail — docs 08-11 have no SRS counterpart: algorithms, UI design tokens, folder structure, role flows).

**Why:** An earlier pass at `.agents/DOCUMENTATION_MAP.md` framed `doc/multi-agent-architecture` as "legacy/pre-correction/has bugs" versus SRS as "current." The user explicitly rejected that framing (2026-07-28): "there is nothing legacy its all latest." The docs were rewritten so both sets are presented as equally current, scoped by what they cover rather than by supersession. A neutral "Known Differences" table replaced the old "corrections applied" table for the handful of points where the two sets literally disagree (code sandbox: Pyodide vs. Piston mentions, Cultural Fit scoring present/absent, a couple of duplicate schema columns, etc.) — those are flagged as "double check, don't assume," not resolved in either direction.

**How to apply:** Read both doc sets for any given module, per `.agents/DOCUMENTATION_MAP.md` and `.agents/DOC_SET_08-11_CONTENTS.md` (the latter replaced the old `PRESERVE_LEGACY_DOCS.md`). Never call `doc/multi-agent-architecture` "legacy," "buggy," or "don't use." When a task touches one of the "Known Differences" table entries, stop and ask the user rather than picking a side — this is also codified in `.agents/constraints.md` §6 (Architecture & Documentation Discipline). See [[feedback-progressive-commits]] for how this correction was rolled out in git history (original docs committed first, reframing as a separate follow-up commit).

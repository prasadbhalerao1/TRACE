---
name: feedback-progressive-commits
description: "User wants git commits made progressively in small, natural, human-like units as work happens, not batched into one large commit at the end."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: ba37eec6-0e21-484f-9db3-96cd6f46c88e
  modified: 2026-07-28T18:31:34.017Z
---

Commit as you go, in small logical units that mirror how a person would actually build the thing (e.g. "initialize skeleton" → "scaffold frontend" → "scaffold backend" → "add infra" → "add env template" → "add skills"), rather than doing all the work first and dumping it into a single commit at the end.

**Why:** Requested explicitly during the Module 12 scaffolding session ("keep progressive natural human like commits") — this is a multi-agent hackathon build where the user wants commit history to read as an honest build log, not a squashed dump.

**How to apply:** Once the user has authorized commits for a piece of work (per the global "never commit unless asked" rule, this still requires that authorization at least once), break the commit into the natural stopping points of the task instead of one `git add -A && git commit` at the very end. Also applies retroactively: if a doc or config file already existed before a session started, restore/commit its original state first, then commit your changes as a separate diff, rather than baking your edits into what looks like the "original" commit — see [[project-doc-sets-both-current]] for an example of this pattern in practice.

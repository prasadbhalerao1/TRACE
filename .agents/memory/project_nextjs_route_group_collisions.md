---
name: project-nextjs-route-group-collisions
description: Next.js route groups like (candidate)/(recruiter) are invisible in the URL — same-named pages across role groups (e.g. two dashboard/page.tsx) will fail the build. Shared landing pages must live outside any group.
metadata: 
  node_type: memory
  type: project
  originSessionId: ba37eec6-0e21-484f-9db3-96cd6f46c88e
  modified: 2026-07-28T19:10:33.706Z
---

In this repo's `apps/web`, the role-based folders `(candidate)`, `(recruiter)`, `(organizer)`, `(judge)`, `(admin)` under `src/app/` are Next.js **route groups** — parentheses mean the segment is stripped from the URL. `(candidate)/dashboard/page.tsx` and `(recruiter)/dashboard/page.tsx` both resolve to the literal URL `/dashboard`, which is a hard Next.js build error ("You cannot have two parallel pages that resolve to the same path"), not a runtime/conditional thing.

**Why this came up:** `doc/multi-agent-architecture/10`'s folder structure lists a `dashboard/page.tsx` under multiple role groups without accounting for this. Confirmed empirically during Phase 0 (2026-07-29) by creating two test `dashboard/page.tsx` files and running `npm run build`, which failed immediately. Resolved by making `/dashboard` a single shared route living directly under `src/app/dashboard/` (outside any group), reading the signed-in user's role client-side (via `/me`) and branching content from there. Full writeup in `.agents/decisions.md`.

**How to apply going forward:** Before adding a page inside more than one role group, check whether the leaf path (the part after the group name) is unique across all 5 groups. If two groups need the same leaf name (dashboard was the only case found so far), don't create both — either consolidate into one shared route outside the groups (as done for `/dashboard`), or give it a distinct name per group. This applies to any future module page, not just Phase 0's dashboard. See [[project-doc-sets-both-current]] for the broader pattern of doc 10 needing double-checking against actual Next.js behavior rather than assumed correct.

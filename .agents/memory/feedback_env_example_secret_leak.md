---
name: feedback-env-example-secret-leak
description: .env.example in this repo has been found with real secrets appended into it — always diff it before staging/committing.
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 16352565-6648-4267-adde-3cdec207f5a5
  modified: 2026-07-29T10:13:58.167Z
---

Always run `git diff .env.example` (or check `git status`) before staging/committing
in this repo, and revert with `git restore .env.example` if it contains real values
instead of blank/template placeholders.

**Why:** During the Module 01 candidate-intelligence build (2026-07-29), `.env.example`
was found modified on disk with real secrets appended after the original template
block — a real Neon `DATABASE_URL` (with password), real Clerk `CLERK_SECRET_KEY`,
and a real `GITHUB_CLIENT_SECRET`. Root cause unconfirmed (likely `.env` content got
copied/appended into `.env.example` by an earlier interrupted session or tool step),
but it was caught only because `git status` was reviewed before staging — it was
never actually committed. `.env.example` is meant to be a safe, shareable template
(blank values or non-secret defaults only); `.env` itself is gitignored and holds the
real values.

**How to apply:** Before any `git add`/`git commit` that touches `.env.example` (or
after a broad `git add`), diff it specifically. If it contains anything that looks
like a real credential (a password in a connection string, a `sk_`/`pk_` live-looking
key, a token), restore it from git and do not commit. See also [[project_module01_candidate_core_loop]].

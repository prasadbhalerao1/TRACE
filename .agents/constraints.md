# AI Coding Constraints & Engineering Rules

This document specifies binding constraints, code style rules, security guidelines, and architectural policies for all AI coding agents working on this monorepo.

---

## 1. Safety & Execution Rules
- **NEVER Push to Remote:** Never execute `git push` or modify remote repository state without explicit user permission.
- **No Destructive Database Operations:** Do not run `DROP TABLE`, `DROP DATABASE`, or `TRUNCATE` commands. All schema modifications MUST go through Alembic migrations in `packages/db/migrations/`.
- **No Unsafe Execution:** Never execute un-sandboxed shell code from candidate submissions directly on the host machine. All code execution MUST go through the isolated Piston Docker sandbox (`infra/piston/`) or Pyodide WASM client-side fallback.

---

## 2. Code Quality & Naming Consistency

### 2.1 Naming Conventions
- **Python:** `snake_case` for files, functions, variables, and module names. `PascalCase` for Pydantic models, SQLAlchemy models, and exception classes.
- **TypeScript:** `PascalCase` for React components. `camelCase` for functions, variables, and custom hooks. `kebab-case` for Next.js route directory names.
- **Database Tables:** Plural `snake_case` (e.g. `candidate_profiles`, `match_scores`, `agent_runs`).

### 2.2 Single Source of Truth for Schemas
- Never duplicate Pydantic models across `api/` and `agents/`.
- Import shared shapes from `packages/shared_schemas/`.

### 2.3 LangGraph Node Contract
- Every LangGraph agent node file MUST export an entrypoint function: `async def run(state: ModuleState) -> ModuleState`.
- Keeps `graph.py` as a clean list of `add_node("name", node.run)` calls.

---

## 3. Security, Secrets & Privacy Constraints
- **Zero Secrets in Code:** Never commit API keys (`ANTHROPIC_API_KEY`, `GITHUB_TOKEN`, etc.) or connection strings into code or `.env.example`. Secrets live in `.env` locally.
- **Consent Verification:** Prior to resume parsing, GitHub ingestion, photo perceptual hashing (`imagehash`), or live interview recording, verify an active consent record in `consents` table (`status = 'granted'`).
- **No Third-Party Scraping:** Do not build scrapers for external services (e.g. LinkedIn). Accept candidate self-uploaded exports (ZIP/PDF) and official APIs only.

---

## 4. Human-in-the-Loop & Ethics Constraints
- **Adverse Decision Protection:** Fraud flags with `raised` status MUST NOT alter a candidate's Talent Score or hide them from recruiter search until a human administrator reviews evidence and updates status to `upheld`.
- **Copilot Isolation:** The Recruiter Copilot search engine is strictly forbidden from filtering candidates based on `raised` fraud flags.
- **Explainability Required:** Every AI score or verdict written to the database MUST log an audit entry in `agent_runs` containing inputs, model string, rationale, and `langfuse_trace_id`.

---

## 5. Model Routing Policy
- **Extraction & High-Volume:** Use Claude Haiku or Groq-hosted Llama 3.3 70B for field extraction, tagging, MCQ generation, and NL filter parsing.
- **Human-Facing Judgments:** Use Claude 3.7 Sonnet for multi-turn interview turns, pitch deck rubric scoring, fraud forensics reports, and candidate re-ranking.

---

## 6. Architecture & Documentation Discipline
- **Modular, Feature-Based Structure:** This is a multi-agent architecture — organize code by feature/module (candidate intelligence, recruitment, assessment, PPT analyzer, hackathon pipeline, fraud prevention), not by technical layer alone. One concern per router/agent-node/component. Avoid god-files and cross-module imports that aren't through `packages/shared_schemas/`.
- **Maintainable Over Clever:** Prefer explicit, readable code over premature abstraction. Match existing patterns already established in the codebase before introducing a new one; don't build for hypothetical future requirements.
- **Docs Are the Source of Truth:** Before implementing any feature, endpoint, scoring formula, schema, or UI decision, consult both `doc/SRS/00-07` (requirements, schema) and `doc/multi-agent-architecture/00-11` (extended design/implementation detail; 08-11 have no SRS counterpart — see `.agents/DOCUMENTATION_MAP.md` and `.agents/DOC_SET_08-11_CONTENTS.md`). Both doc sets are current; neither supersedes the other. Never invent requirements, field names, or formulas that contradict either doc. Where the two sets genuinely disagree (see `.agents/DOCUMENTATION_MAP.md` § "Known Differences"), stop and ask rather than silently picking one.

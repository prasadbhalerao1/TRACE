# Architecture Decisions

Thirty-seven source files across Python and TypeScript cite this file as the record of
why the code is shaped the way it is — `services/api/core/storage.py`,
`services/agents/supervisor/graph.py`, `apps/web/src/lib/api.ts` and many others. It had
gone missing, so every one of those "see `.agents/decisions.md`" pointers dead-ended.

This reconstructs it from the reasoning preserved in those call sites. Where a decision is
already explained well in code, the entry here is a short index pointing at the authority
rather than a second copy that can drift out of sync.

**How to read this.** Each entry states the decision, the alternative that was rejected,
and the reason. A decision recorded here is not permanent — it is a record of what was
chosen and why, so a future change can be made deliberately instead of by accident.

---

## Agent and graph architecture

### LangGraph parallel fan-out: nodes return only their own keys

**Decision.** Every node that runs in a parallel superstep returns *only* the keys it
changed — never `{**state, ...}` or `{**ctx, ...}`.

**Why.** LangGraph merges each node's returned dict into shared state. Two nodes running in
the same superstep that both echo the merged state will each write a stale copy of the
other's channel, and the loser's output vanishes silently. No error is raised; the graph
completes and the result is simply wrong.

**Where enforced.**
- `services/agents/ppt_analyzer/state.py` — every node fanning out from
  `content_extraction` writes a distinct top-level key.
- `services/agents/fraud/state.py` — `signals` uses an `operator.add` reducer precisely
  because `duplicate_graph` fans `text_fingerprint` and `photo_hash` out together; the
  reducer lets both append safely.
- `services/api/tests/test_agent_correctness.py::test_photo_hash_returns_only_its_own_context_key`
  pins it. `photo_hash` violated this and was fixed in the 2026-08-19 audit — harmless only
  because `duplicate_graph` happens to run sequentially today, and a silent
  half-disabling of duplicate detection the moment it did not.

### Never read a channel a sibling branch writes

**Decision.** A node may read only state written by its own predecessors, never by a
parallel sibling branch.

**Why.** Whether the value has landed depends on scheduling, not on the data. A score
computed from such a read is nondeterministic across runs — and when that score is
persisted against a real submission and shown to an organizer, "the number changed and
nothing in the input did" is the worst available failure.

**Case.** `ppt_analyzer/nodes/innovation_business_impact.py` read `plagiarism_matches`,
written by `similarity_plagiarism` one superstep further down a parallel branch. An
in-code comment described it as data that "may not have landed yet"; it never had, so the
novelty hint was always `None`. Removed in the 2026-08-19 audit and pinned by
`services/api/tests/test_ppt_graph_ordering.py`.

### Nodes stay DB-free; routers own all I/O

**Decision.** Graph nodes never open a database session. The router pre-fetches everything
a node needs into state before invoking the graph, then persists whatever comes back.

**Why.** It keeps nodes unit-testable without a database, and keeps transaction boundaries
in one place instead of scattered across a graph whose execution order is the framework's
business.

**Authority.** `services/agents/fraud/state.py`'s docstring.

### No LangGraph checkpointer

**Decision.** No module uses a LangGraph checkpointer. Graphs are compiled once as a
module-level `get_graph()` singleton, and state that must survive a request is persisted to
ordinary DB columns.

**Rejected.** `builder.compile(checkpointer=postgres_checkpointer)`, which the reference
architecture doc's example assumes.

**Why.** The two modules with genuinely long-lived state — the Recruiter Copilot and the
Interview Agent — already persist it to columns the rest of the app can query, join and
migrate. A checkpointer would add a second, opaque source of truth for the same data.

**Authority.** `services/agents/supervisor/graph.py`'s module docstring.

### Supervisor nodes call service functions, not subgraphs

**Decision.** The supervisor's per-module nodes call the same service functions the REST
routers call, threading a live `AsyncSession` through config.

**Why.** Each module's real entry point is a router step (fetch context → build state →
invoke subgraph → persist), not a bare importable subgraph. Invoking the subgraph directly
would skip the DB work either side of it and produce a demo that only appears to work.

---

## Prompts

### Markdown files, one per LLM call site

**Decision.** Every LLM prompt is a `.md` file at
`services/agents/{module}/prompts/{name}.md`, loaded by
`services/agents/prompts_loader.py`. There are 24, one per LLM operation.

**Rejected.** Inline Python strings, and a Jinja2 template registry
(`packages/prompts/`) — **deleted** in the 2026-08-19 audit. It had zero importers and
imported an undeclared `jinja2` dependency: a second, dead prompt system shadowing the real
one.

**Why.** A prompt is a document and should read like one; changing wording produces a clean
diff instead of one buried in a Python function; and the file existing at the right path
*is* the registration, so there is no registry to keep in sync.

**Authority.** `Documentation/14-prompts-architecture.md`.

### Missing interpolation variables raise

**Decision.** `load_prompt` raises `ValueError` naming the prompt and every missing key.

**Why.** The alternative is a paid LLM call carrying a literal `{merged_profile_json}`.
This is not hypothetical: the loader once used `string.Template.substitute` (which
understands `$name`, not `{name}`), so **no placeholder was ever substituted** and nothing
raised — a schema-constrained call still returns well-formed output. It was caught only by
reading a classifier's rationale, which said the query "is not provided".

### Prompts must state the honest-failure rule and their scale

**Decision.** Every prompt tells the model to emit `null` plus a rationale rather than a
plausible guess, and every scoring prompt names its scale explicitly ("0-100").

**Why.** Fabrication is the failure mode that costs most here, because a confident wrong
answer is indistinguishable from a right one downstream. The scale requirement exists
because a model answering `8.5` on an implied 0–10 scale, persisted into a 0–100 column,
silently corrupts recruiter matching and salary prediction.

**Enforced by.** `services/api/tests/test_prompt_standard.py`.

---

## Reliability

### LLM failures are typed, and two of them are never retried

**Decision.** All LLM errors subclass `LLMUnavailable` (so existing handlers keep working),
but `LLMQuotaExhausted` and `LLMNotConfigured` are explicitly **not** retryable.

**Why.** Every failure used to collapse into one untyped 503, so the client retried all of
them. Retrying an exhausted billing balance or a missing API key cannot succeed — it spends
the user's time on a guaranteed failure and then shows the same error. Quota markers are
checked *before* rate-limit markers because quota exhaustion arrives as a 429 that is
otherwise identical to an ordinary rate limit, and the two need opposite handling.

**Authority.** `services/api/core/llm.py`, `services/api/main.py::_LLM_ERROR_RESPONSES`,
`apps/web/src/lib/errors.ts`. Full table in `Documentation/11-vector-search-and-llm-gateway.md`.

### A failed check is never reported as a passing check

**Decision.** When a verification cannot run, it reports "undetermined" — never the value
that means "ran and found nothing".

**Why.** An empty result renders to a human as an affirmative claim. Three instances of
this defect class have shipped:
- Plagiarism: `except Exception: return []` rendered as *"No similarity matches found
  against prior submissions."* A Qdrant method removed in 1.18 raised `AttributeError`
  inside that swallow and **every deck was reported clean**. Now raises
  `PlagiarismCheckUnavailable`, persisted as `plagiarism_checked=false`.
- GitHub contribution: four `except GithubException` blocks degrading to `0`, which renders
  as *"No attributable commits… flagged for human review"* — a rate-limit blip became an
  accusation about a real person's work. Now carries `data_incomplete`.
- Fact-check: `all([])` is `True`, so a model returning zero findings marked a document
  **verified with nothing checked**.

### Scores are validated before they touch the database

**Decision.** `validated_score()` clamps to `[0,100]` and returns `None` for
null/bool/non-numeric/NaN/inf, at all six sites that previously wrote `float(result[...])`
straight into a column.

**Why.** Those columns feed recruiter matching, salary prediction and hackathon rankings.
A single out-of-range value propagates silently into decisions about people.

---

## Data and configuration

### Curated catalogs live in the database, not in Python literals

**Decision.** `role_skill_requirements`, `skill_descriptions` and `default_avatar_hashes`
are tables, seeded idempotently by `scripts/seed_db.py`, read through
`services/agents/catalogs.py` with a TTL cache and a built-in seed fallback.

**Why.** Extending them was a code change plus a redeploy. `DEFAULT_AVATAR_HASH_BLACKLIST`
made the point: its own comment said "populate with real hashes as they're identified in
production", which is impossible while it lives in source.

**Note.** The sync engine in `catalogs.py` sets a 3-second `connect_timeout` deliberately —
without it, a module-scope import hangs for minutes when the DB is unreachable, which
breaks every test run on a machine with no database.

### Tunables are Settings with defaults equal to the previous literal

**Decision.** ~60 values (scoring weights, similarity thresholds, token budgets, timeouts,
retry bounds) moved to `services/api/core/config.py`, each defaulting to exactly the literal
it replaced.

**Why.** Tuning any of them required a deploy. Defaults-preserving means the refactor is
provably non-breaking — `services/api/tests/test_config_parity.py` asserts every default
still equals its prior value, which is the safety net that made a change of this size safe.

### Cross-language constants are served, not mirrored

**Decision.** A value needed by both Python and TypeScript is published by the API. Where a
literal genuinely must exist in both, a test asserts the two agree.

**Why.** Comments asking humans to keep two lists in sync do not work. Six names drifted out
of the Python `RESERVED_USERNAMES` copy, and `POST /auth/signup` with `username="admin"`
returned 201. `stats_refresh_cooldown_seconds` is now served for the same reason: the
backend value is env-tunable, so any client-side copy disagrees the moment a deployment
changes it.

**Enforced by.** `services/api/tests/test_reserved_usernames.py`,
`services/api/tests/test_cross_language_constants.py`,
`services/api/tests/test_api_contract_sync.py` (all 60 shared types).

### Single storage provider

**Decision.** Cloudinary only. No provider abstraction layer.

**Why.** One provider is in use; an abstraction over a single implementation is speculative
generality that has to be maintained regardless.

**Authority.** `services/api/core/storage.py`, `packages/db/models/file.py`.

### Real integrations raise typed errors rather than fabricating

**Decision.** When a real integration cannot run — no trained model artifact on disk, no API
key, an unreachable service — the code raises a clear typed error. It never substitutes a
plausible-looking number.

**Why.** A fabricated salary range or score is indistinguishable from a real one to
everyone downstream, including the person it is about.

**Authority.** `services/agents/candidate_intelligence/tools/salary_model.py`
(`SalaryModelUnavailable`), `services/api/core/storage.py`.

### Salary: talent score is a disclosed post-hoc adjustment

**Decision.** The salary model trains only on real Stack Overflow Developer Survey features.
`talent_score` is applied afterward as a disclosed ±15% linear adjustment around a 50-point
baseline.

**Why.** The spec lists talent score as a regression feature, but the survey has no such
column — it is this platform's own derived metric, with no ground truth to train against.
Inventing a training column would have produced a model whose confidence was unearned.
Always returned as a `[low, high]` range, never a point estimate, to avoid false precision.

---

## Application architecture

### Live computation over persisted match tables

**Decision.** The recruiter top-performers feed is computed live from
`hackathon_rankings` + `hackathon_team_members` + `candidate_profiles` +
`recruiter_watchlists` at read time.

**Rejected.** Persisting matches when the ranking-finalized event is processed.

**Why.** A watchlist can be created or edited *after* an event was published, so a match
computed at event-processing time goes stale or misses entirely. Reading live off tables
that already exist means the recruiter always sees a feed consistent with their *current*
criteria and *all* finalized rankings — and adds no new table.

**Authority.** `services/api/core/event_consumer.py`.

### A polling loop, not a task queue

**Decision.** Cross-module events are consumed by a fixed-interval `asyncio` polling loop.

**Rejected.** Celery, Arq, webhooks.

**Why.** No task queue exists anywhere in the repo yet, and a polling loop is sufficient at
this scope. `arq` *is* an installed dependency; `services/agents/ppt_analyzer/graph.py`
notes that its pipeline should move to a real worker once a shared worker entrypoint exists,
rather than building one for a single module.

### Client-side auth, no Next.js middleware

**Decision.** Next.js runs no business logic and guards no routes. Components call FastAPI
directly with a bearer token held client-side.

**Why.** One place enforces authorization — the API, which is reachable directly regardless
of what the frontend does. A client-side guard is a UX affordance, never a security
boundary. Route-group layouts provide the affordance; every endpoint enforces the boundary.

### Shared pages live outside role route groups

**Decision.** Pages viewable by several roles (`/dashboard`, `/pitch-deck/[id]`) sit outside
any `(role)` group.

**Why.** A `(candidate)`-only group applies a candidate role guard. The pitch-deck report is
specified as viewable by candidates, judges, recruiters and investors alike, so placing it
inside that group would lock out three of its four audiences.

### One polling implementation

**Decision.** All status polling goes through `pollUntil` in `apps/web/src/lib/api.ts`.

**Why.** Six implementations existed — four near-identical helpers plus two hand-rolled
`setTimeout` loops in page components. The loops used different intervals, no backoff, and
critically skipped `pollDelay`'s visibility gating, so a backgrounded tab issued requests
forever.

### `packages/shared_schemas` and `packages/db` stay service-independent

**Decision.** Neither imports from `services/api`. Where a schema genuinely needs a runtime
setting, the import is lazy, inside the function that needs it.

**Why.** Both packages are imported by the agents and by schema tooling. A module-level
import of FastAPI settings would invert the dependency direction and drag the service layer
into every consumer.

**Example.** `CandidateProfileResponse.stats_refresh_cooldown_seconds` uses a
`default_factory` that imports `get_settings` lazily.

---

## Product judgments

### Fraud flags never auto-penalize

**Decision.** Detection raises evidence for human review. Nothing affects a score, a
ranking or an account until a human upholds it.

**Why.** Every detector here is statistical. The cost of a false positive is an accusation
against a real person, and that asymmetry does not justify automation.

### Signals ship with evidence, never as a bare boolean

**Decision.** Every flag, match and score carries the evidence behind it — matched deck and
slide with its similarity value, the component breakdown behind a match percentage.

**Why.** A bare number invites a decision it cannot support. A recruiter looking at "21%"
needs to know which of skill overlap, semantic similarity, experience or talent score
produced it.

### AI-content detection caps its own confidence

**Decision.** The AI-content heuristic never reports confidence above `"medium"`, regardless
of sample size, and never auto-rejects.

**Why.** It is statistical, not forensic. High perplexity distinguishes formal writing from
informal writing at least as well as it distinguishes generated text from human text.

### Missing signals renormalize; they never zero-fill

**Decision.** A missing sub-score has its weight redistributed across the signals that do
exist (`weighted_renormalized_mean`), and the renormalization is reported alongside the
score.

**Why.** Zero-filling reads as "measured, and bad" when the truth is "not measured". For a
candidate with a sparse profile that is the difference between a cold start and a negative
judgment.

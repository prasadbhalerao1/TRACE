# Prompts Architecture

## What it does

Every LLM prompt in the codebase lives as a standalone Markdown file, not as an inline
Python string or a Jinja2 template. Code loads a prompt by name, interpolates variables into
it, and sends the result to the LLM gateway — the prompt text itself is fully separated from
the code that calls it.

## Why Markdown files instead of inline strings or Jinja2

- **Readable as documents.** A prompt is meant to read like a well-written instruction, and
  a `.md` file lets it actually look like one — headers, structure, examples — rather than a
  multi-line Python string with escaped quotes.
- **Clean git diffs.** Changing a prompt's wording is a diff to a `.md` file, not a diff
  buried inside a Python function alongside unrelated code changes.
- **One loading mechanism, not several.** Before this convention, prompts were split between
  inline strings and a handful of Jinja2 templates in `packages/prompts/templates/` — two
  different ways to build the same kind of string. Everything now goes through one function.
- **Testable and swappable independently of code.** A prompt can be edited, reviewed, or
  A/B'd without touching the Python that calls it.

## The convention

Each agent module owns its own `prompts/` directory:

```
services/agents/
├── recruitment/prompts/
│   ├── understand_query.md
│   ├── rerank_candidates.md
│   └── explain_matches.md
├── candidate_intelligence/prompts/
│   ├── resume_extraction.md
│   ├── judgment_scores.md
│   └── fact_check.md
├── assessment/prompts/
│   ├── generate_question.md
│   ├── evaluate_turn.md
│   ├── generate_followup.md
│   └── interview_report.md
├── fraud/prompts/
│   └── risk_report.md
├── supervisor/prompts/
│   └── classifier.md
├── ppt_analyzer/prompts/
└── hackathon/prompts/
```

A prompt lives at `services/agents/{module}/prompts/{prompt_name}.md`. There's no shared
top-level prompt directory — each module's prompts live next to the code that uses them,
which keeps a module's LLM behavior self-contained and reviewable in one place.

## How loading works

`services/agents/prompts_loader.py`:

```python
_PLACEHOLDER_RE = re.compile(r"\{(\w+)\}")


@functools.lru_cache(maxsize=None)
def _load_prompt_text(agent_name: str, prompt_name: str) -> str:
    agent_dir = Path(__file__).parent / agent_name / "prompts"
    prompt_file = agent_dir / f"{prompt_name}.md"

    if not prompt_file.exists():
        raise FileNotFoundError(f"Prompt not found: {prompt_file}")

    content = prompt_file.read_text(encoding="utf-8")
    # Strip ONLY the leading H1 title; `##` section headings are content.
    lines = content.split("\n")
    if lines and lines[0].startswith("# "):
        lines = lines[1:]
    return "\n".join(lines).strip()


def load_prompt(agent_name: str, prompt_name: str, **variables) -> str:
    text = _load_prompt_text(agent_name, prompt_name)
    # Regex substitution of `{name}`; raises ValueError listing any variable the
    # caller failed to supply, rather than shipping a literal placeholder.
    ...
```

Called as:

```python
from services.agents.prompts_loader import load_prompt

prompt = load_prompt("recruitment", "understand_query", raw_query=query_text)
```

Notes on the mechanics:
- **Interpolation is `{variable}`**, matching what every prompt file actually writes
  (e.g. `assessment/prompts/evaluate_turn.md` uses `{topic}`, `{question}`, `{answer}`).
  A missing variable raises `ValueError` naming the prompt and the missing keys — failing
  loudly is deliberate, since the alternative is a paid LLM call carrying a literal
  `{merged_profile_json}`. Write `{{` / `}}` for a literal brace.
- **JSON examples inside prompts are safe.** The placeholder pattern is `{identifier}`
  only, so `{"skills": ["Go"]}` in a worked example passes through untouched.
- **Only the leading `# Title` line is stripped.** `##` section headings ("Examples",
  "Rules") are part of the instruction and are sent to the model.
- **File reads are cached** (`functools.lru_cache`) — a prompt file only changes on deploy,
  so re-reading it from disk on every single LLM call would be pure waste; the cache is
  keyed on `(agent_name, prompt_name)`.

> **Fixed 2026-08-05 — this loader used to silently send un-interpolated prompts.**
> It built a `string.Template` and called `.substitute()`, which only understands
> `$name`, while every prompt file uses `{name}`. **No placeholder was ever substituted**:
> the model received the literal text `"{query}"` and `{resume_text}`. It also dropped
> every line starting with `#`, which removed all `##` section headings along with the
> title. Nothing raised, because a schema-constrained call still returns well-formed
> output — verified live against Gemini, the classifier answered
> *"The user's query is not provided, so by default we lean toward the narrower … 
> candidate_score operation"* and returned the wrong intent. Regression tests covering
> substitution, heading retention, and the missing-variable error live in
> `services/agents/tests/test_prompts_loader.py`.

## Adding a new prompt

1. Create `services/agents/{agent_name}/prompts/{prompt_name}.md` with the prompt text and
   `{variable}` placeholders where needed.
2. Call it from code:
   ```python
   from services.agents.prompts_loader import load_prompt

   prompt = load_prompt("{agent_name}", "{prompt_name}", variable=value)
   ```
3. That's the whole workflow — no registry to update, no template class to declare. The file
   existing at the right path *is* the registration.

## What this replaced

An earlier iteration of the codebase used a mix of inline prompt strings and Jinja2
templates under `packages/prompts/templates/`, with a `packages/prompts/registry.py` that
tracked which template belonged to which use case. That layer is no longer used —
`packages/prompts_loader.py`'s file-path convention (module name + prompt name) does the
same job without a separate registry to keep in sync, and every prompt-consuming module
listed above (`copilot_llm.py`, `resume.py`, `judgment_scores.py`, `fact_check.py`,
`interview_llm.py`, `report_llm.py`, `classifier_llm.py`) calls `load_prompt` uniformly.

## Where this lives

| Component | Path |
|---|---|
| Prompt loader | `services/agents/prompts_loader.py` |
| Recruitment prompts | `services/agents/recruitment/prompts/` |
| Candidate intelligence prompts | `services/agents/candidate_intelligence/prompts/` |
| Assessment prompts | `services/agents/assessment/prompts/` |
| Fraud prompts | `services/agents/fraud/prompts/` |
| Supervisor prompts | `services/agents/supervisor/prompts/` |
| PPT analyzer prompts | `services/agents/ppt_analyzer/prompts/` |
| Hackathon prompts | `services/agents/hackathon/prompts/` |

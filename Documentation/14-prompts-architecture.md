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
@functools.lru_cache(maxsize=None)
def _load_prompt_template(agent_name: str, prompt_name: str) -> Template:
    agent_dir = Path(__file__).parent / agent_name / "prompts"
    prompt_file = agent_dir / f"{prompt_name}.md"

    if not prompt_file.exists():
        raise FileNotFoundError(f"Prompt not found: {prompt_file}")

    content = prompt_file.read_text()
    # Strip markdown header lines (lines starting with #) before templating
    lines = content.split('\n')
    prompt_lines = [line for line in lines if not line.startswith('#')]
    prompt_text = '\n'.join(prompt_lines).strip()

    return Template(prompt_text)


def load_prompt(agent_name: str, prompt_name: str, **variables) -> str:
    template = _load_prompt_template(agent_name, prompt_name)
    try:
        return template.substitute(**variables)
    except KeyError as e:
        raise ValueError(f"Missing variable in prompt {prompt_name}: {e}") from e
```

Called as:

```python
from services.agents.prompts_loader import load_prompt

prompt = load_prompt("recruitment", "understand_query", raw_query=query_text)
```

Notes on the mechanics:
- **Interpolation is `string.Template`, but prompt files actually write plain `{variable}`
  placeholders** (e.g. `services/agents/assessment/prompts/evaluate_turn.md` uses
  `{topic}`, `{question}`, `{answer}`), not `string.Template`'s native `$variable` syntax.
  `Template.substitute()` only replaces `$`-prefixed placeholders, so a bare `{variable}` is
  passed through unless the code also does a `.format(**variables)`-style pass — worth
  knowing if extending this: the `load_prompt` variables kwarg is documented as working with
  `{variable}` style, so verify the exact interpolation behavior against
  `prompts_loader.py` before relying on it in a new prompt with untested placeholder syntax.
  A missing variable raises a clear `ValueError` naming the prompt and the missing key.
- **Markdown header lines are stripped before templating.** Any line starting with `#` is
  dropped, so a prompt file can carry a `# Title` and `## Schema Description` for a human
  reader without those literal characters leaking into what's actually sent to the model.
- **File reads are cached** (`functools.lru_cache`) — a prompt file only changes on deploy,
  so re-reading it from disk on every single LLM call would be pure waste; the cache is
  keyed on `(agent_name, prompt_name)`.

## Adding a new prompt

1. Create `services/agents/{agent_name}/prompts/{prompt_name}.md` with the prompt text and
   `${variable}` placeholders where needed.
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

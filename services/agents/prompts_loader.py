"""Load prompts from markdown files in agent directories.

Replaces the need for inline prompts or Jinja2 templates by loading from
simple markdown files that are easy to read, version control, and modify.
"""

import functools
from pathlib import Path
from string import Template


@functools.lru_cache(maxsize=None)
def _load_prompt_template(agent_name: str, prompt_name: str) -> Template:
    """Reads and parses one prompt file from disk — cached since every agent LLM call
    re-reads the same handful of prompt files, and their content only changes on deploy."""
    agent_dir = Path(__file__).parent / agent_name / "prompts"
    prompt_file = agent_dir / f"{prompt_name}.md"

    if not prompt_file.exists():
        raise FileNotFoundError(f"Prompt not found: {prompt_file}")

    content = prompt_file.read_text()

    # Remove markdown header lines (lines starting with #)
    lines = content.split('\n')
    prompt_lines = [line for line in lines if not line.startswith('#')]
    prompt_text = '\n'.join(prompt_lines).strip()

    return Template(prompt_text)


def load_prompt(agent_name: str, prompt_name: str, **variables) -> str:
    """Load a prompt markdown file and interpolate variables.

    Args:
        agent_name: e.g., "recruitment", "candidate_intelligence", "fraud"
        prompt_name: e.g., "understand_query", "classifier" (without .md extension)
        **variables: Variables to interpolate into the prompt template

    Returns:
        Interpolated prompt text (without markdown metadata)

    Raises:
        FileNotFoundError: If the prompt file doesn't exist
    """
    template = _load_prompt_template(agent_name, prompt_name)

    # Interpolate variables using $variable or {variable} format
    try:
        return template.substitute(**variables)
    except KeyError as e:
        raise ValueError(f"Missing variable in prompt {prompt_name}: {e}") from e


__all__ = ["load_prompt"]

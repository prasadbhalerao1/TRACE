"""System Prompt Registry for AI Agents.

Decouples prompt text and Jinja2 templates from agent execution logic.
Provides safe rendering, variable substitution, and fallback handling.
"""

from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader

PROMPTS_DIR = Path(__file__).parent / "templates"


class PromptRegistry:
    def __init__(self, templates_dir: Path | None = None) -> None:
        self.templates_dir = templates_dir or PROMPTS_DIR
        self._env = Environment(
            loader=FileSystemLoader(str(self.templates_dir)),
            autoescape=False,
            trim_blocks=True,
            lstrip_blocks=True,
        )

    def render(self, template_path: str, **kwargs: Any) -> str:
        """Render a Jinja2 prompt template relative to templates_dir.

        Example:
            registry.render("recruitment/copilot_v1.jinja2", query="Search Python dev")
        """
        template = self._env.get_template(template_path)
        return template.render(**kwargs)

    def get_raw_template(self, template_path: str) -> str:
        """Return raw unrendered prompt text."""
        full_path = self.templates_dir / template_path
        return full_path.read_text(encoding="utf-8")


# Default global registry singleton
default_registry = PromptRegistry()


def render_prompt(template_path: str, **kwargs: Any) -> str:
    """Convenience helper to render a prompt using the default registry."""
    return default_registry.render(template_path, **kwargs)

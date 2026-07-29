"""Resume & Cover-Letter Generator Agent — FR-5.1/5.3/5.4, doc 01 §4 ("Resume Generator
Agent | Sonnet | templating + rewriting").

Both generators call Anthropic for real — if `ANTHROPIC_API_KEY` isn't configured,
callers get a clear `DocumentGenerationUnavailable`, matching the
`ResumeExtractionUnavailable` / `StorageUnavailable` pattern used elsewhere in this
module (never silently fabricate a resume/cover letter).

Grounding (FR-5.4's "no fabrication" requirement) is enforced two ways: (1) the prompt
below instructs the model to use ONLY facts present in `merged_profile` and never invent
employers/titles/dates/metrics/skills, and (2) the mandatory Fact-Check Agent
(`tools/fact_check.py`) that runs after every generation — prompt-only enforcement is
not treated as sufficient on its own.
"""

import json

import anthropic

from services.api.core.config import get_settings

_GROUNDING_RULE = (
    "You must use ONLY facts present in the CANDIDATE PROFILE JSON below. Never invent "
    "employers, job titles, dates, metrics, degrees, or skills that are not present in "
    "it. You may rephrase, reorder, and emphasize existing facts, but you may not add "
    "new ones. If the profile lacks enough information for a section, leave it sparse "
    "rather than filling it in."
)

RESUME_GENERATION_SCHEMA = {
    "name": "generated_resume",
    "description": "ATS-friendly resume content generated strictly from the candidate's own profile data.",
    "input_schema": {
        "type": "object",
        "properties": {
            "headline": {"type": "string"},
            "summary": {"type": "string", "description": "2-3 sentence professional summary."},
            "skills": {"type": "array", "items": {"type": "string"}},
            "experience": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "company": {"type": "string"},
                        "years": {"type": "string"},
                        "bullets": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Achievement bullet points, grounded in the profile only.",
                        },
                    },
                    "required": ["title", "bullets"],
                },
            },
            "education": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "institution": {"type": "string"},
                        "degree": {"type": "string"},
                        "year": {"type": "string"},
                    },
                },
            },
        },
        "required": ["headline", "summary", "skills", "experience", "education"],
    },
}

COVER_LETTER_GENERATION_SCHEMA = {
    "name": "generated_cover_letter",
    "description": "A cover letter grounded strictly in the candidate's own profile data.",
    "input_schema": {
        "type": "object",
        "properties": {
            "subject": {"type": "string"},
            "body": {
                "type": "string",
                "description": "Full cover letter body text, 3-4 paragraphs.",
            },
        },
        "required": ["subject", "body"],
    },
}


class DocumentGenerationUnavailable(RuntimeError):
    """Raised when the LLM generation call can't run (e.g. no API key, API failure)."""


def _call_structured(schema: dict, prompt: str, model: str) -> dict:
    settings = get_settings()
    if not settings.anthropic_api_key:
        raise DocumentGenerationUnavailable(
            "ANTHROPIC_API_KEY is not configured — document generation requires it."
        )

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    try:
        response = client.messages.create(
            model=model,
            max_tokens=2048,
            tools=[schema],
            tool_choice={"type": "tool", "name": schema["name"]},
            messages=[{"role": "user", "content": prompt}],
        )
    except anthropic.APIError as exc:
        raise DocumentGenerationUnavailable(f"Anthropic API call failed: {exc}") from exc

    for block in response.content:
        if block.type == "tool_use":
            return block.input
    raise DocumentGenerationUnavailable("Model did not return structured tool output.")


def generate_resume_content(merged_profile: dict, target_job_description: str | None) -> dict:
    settings = get_settings()
    jd_instruction = (
        (
            "\n\nTARGET JOB DESCRIPTION (FR-5.4 optimization): re-rank and re-word the "
            "experience bullet points to emphasize the skills/keywords below that the "
            "candidate's ACTUAL profile already supports. Do not claim skills the "
            "profile doesn't show just because the JD asks for them.\n\n"
            f"{target_job_description}"
        )
        if target_job_description
        else ""
    )
    prompt = (
        f"{_GROUNDING_RULE}\n\n"
        f"CANDIDATE PROFILE JSON:\n{json.dumps(merged_profile, default=str)}"
        f"{jd_instruction}\n\n"
        "Generate ATS-friendly resume content: plain structure, no tables/graphics, "
        "standard section headings only."
    )
    return _call_structured(RESUME_GENERATION_SCHEMA, prompt, settings.llm_model_judgment)


def generate_cover_letter_content(merged_profile: dict, target_job_description: str) -> dict:
    settings = get_settings()
    prompt = (
        f"{_GROUNDING_RULE}\n\n"
        f"CANDIDATE PROFILE JSON:\n{json.dumps(merged_profile, default=str)}\n\n"
        f"TARGET JOB DESCRIPTION:\n{target_job_description}\n\n"
        "Write a cover letter addressed to the hiring team for this role, drawing "
        "connections between the candidate's actual experience/skills and the role's "
        "requirements. Do not fabricate enthusiasm-driven claims not backed by the profile."
    )
    return _call_structured(COVER_LETTER_GENERATION_SCHEMA, prompt, settings.llm_model_judgment)

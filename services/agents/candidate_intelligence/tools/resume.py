"""Resume text extraction (mechanical) + structured field extraction (LLM). FR-1.2.

Text extraction never touches the network and always succeeds for well-formed files.
Structured extraction calls Anthropic for real — if `ANTHROPIC_API_KEY` isn't configured,
callers get a clear `ResumeExtractionUnavailable`, never a fabricated/empty profile.
"""

import io
import json

import anthropic
import docx
import pdfplumber

from services.api.core.config import get_settings

RESUME_EXTRACTION_SCHEMA = {
    "name": "extracted_resume",
    "description": "Structured fields extracted from a candidate resume.",
    "input_schema": {
        "type": "object",
        "properties": {
            "headline": {"type": "string"},
            "location": {"type": "string"},
            "skills": {
                "type": "array",
                "items": {"type": "object", "properties": {"name": {"type": "string"}}},
            },
            "experience": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "company": {"type": "string"},
                        "years": {"type": "number"},
                        "description": {"type": "string"},
                    },
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
        "required": ["skills", "experience", "education"],
    },
}


class ResumeExtractionUnavailable(RuntimeError):
    """Raised when the LLM structured-extraction call can't run (e.g. no API key)."""


def extract_resume_text(file_bytes: bytes, content_type: str) -> str:
    if content_type == "application/pdf":
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            return "\n".join(page.extract_text() or "" for page in pdf.pages)
    if content_type in (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
    ):
        document = docx.Document(io.BytesIO(file_bytes))
        return "\n".join(p.text for p in document.paragraphs)
    raise ValueError(f"Unsupported resume content type: {content_type}")


def extract_resume_fields(resume_text: str) -> dict:
    settings = get_settings()
    if not settings.anthropic_api_key:
        raise ResumeExtractionUnavailable(
            "ANTHROPIC_API_KEY is not configured — resume structured extraction requires it."
        )

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    try:
        response = client.messages.create(
            model=settings.llm_model_fast,
            max_tokens=2048,
            tools=[RESUME_EXTRACTION_SCHEMA],
            tool_choice={"type": "tool", "name": "extracted_resume"},
            messages=[
                {
                    "role": "user",
                    "content": f"Extract structured fields from this resume:\n\n{resume_text}",
                }
            ],
        )
    except anthropic.APIError as exc:
        raise ResumeExtractionUnavailable(f"Anthropic API call failed: {exc}") from exc

    for block in response.content:
        if block.type == "tool_use":
            return block.input
    raise ResumeExtractionUnavailable("Model did not return structured tool output.")


def to_json_evidence(payload: dict) -> str:
    return json.dumps(payload, default=str)[:4000]

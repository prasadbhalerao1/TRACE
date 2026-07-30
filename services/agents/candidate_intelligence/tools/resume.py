"""Resume text extraction (mechanical) + structured field extraction (LLM). FR-1.2.

Text extraction never touches the network and always succeeds for well-formed files.
Structured extraction calls Anthropic for real — if `ANTHROPIC_API_KEY` isn't configured,
callers get a clear `ResumeExtractionUnavailable`, never a fabricated/empty profile.
"""

import io
import json

import docx
import pdfplumber

from services.api.core.llm import LLMUnavailable, generate_structured

RESUME_EXTRACTION_PARAMETERS = {
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
}


# Raised when the LLM structured-extraction call can't run (e.g. no/misconfigured provider key).
ResumeExtractionUnavailable = LLMUnavailable


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
    return generate_structured(
        schema_name="extracted_resume",
        schema_description="Structured fields extracted from a candidate resume.",
        parameters=RESUME_EXTRACTION_PARAMETERS,
        prompt=f"Extract structured fields from this resume:\n\n{resume_text}",
        is_fast=True,
        max_tokens=2048,
        agent_name="candidate_intelligence.resume_extraction",
    )


def to_json_evidence(payload: dict) -> str:
    return json.dumps(payload, default=str)[:4000]

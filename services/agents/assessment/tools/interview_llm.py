"""AI Interview Agent's four LLM steps (FR-2.1/2.2/2.3/2.4, judgment-tier per doc 03 §5 —
adapting difficulty and judging answer quality both need real reasoning, not
extraction-tier speed). Routed through `services.api.core.llm.generate_structured` —
see `assessment/tools/llm_review.py` for the same pattern.
"""

import json

from services.agents.assessment.tools.llm_review import AssessmentUnavailable
from services.api.core.llm import generate_structured

__all__ = ["AssessmentUnavailable", "generate_question", "evaluate_turn", "generate_followup", "generate_interview_report"]

_QUESTION_PARAMETERS = {
    "type": "object",
    "properties": {"question": {"type": "string"}},
    "required": ["question"],
}

_TURN_EVAL_PARAMETERS = {
    "type": "object",
    "properties": {
        "score": {"type": "number", "description": "0-100, this answer's quality on this topic"},
        "verdict": {
            "type": "string",
            "enum": ["weak", "sufficient"],
            "description": "'weak' if the answer was vague, evasive, or missed the core of the question and deserves a follow-up; 'sufficient' if it substantively addressed the question, even if imperfect.",
        },
        "hedging_detected": {
            "type": "boolean",
            "description": "true if the answer relied on hedging language ('I think', 'maybe', 'not totally sure') rather than concrete specifics.",
        },
        "specificity": {
            "type": "string",
            "enum": ["low", "medium", "high"],
            "description": "How concrete/specific the answer was (named tools, real numbers, actual tradeoffs) vs. generic.",
        },
    },
    "required": ["score", "verdict", "hedging_detected", "specificity"],
}

_FOLLOWUP_PARAMETERS = {
    "type": "object",
    "properties": {"question": {"type": "string"}},
    "required": ["question"],
}

_REPORT_PARAMETERS = {
    "type": "object",
    "properties": {
        "technical_rating": {"type": "number", "description": "0-100"},
        "communication_rating": {
            "type": "number",
            "description": "0-100, based ONLY on transcript signals: clarity, structure, filler-word/hedging rate. Never infer from tone or vocal delivery — there is none, this is text.",
        },
        "response_confidence_signal": {
            "type": "number",
            "description": "0-100, derived from hedging-language frequency and answer specificity/structure across the transcript — NOT a guess at the candidate's emotional confidence.",
        },
        "hiring_recommendation": {
            "type": "string",
            "description": "2-4 sentences of advisory rationale a recruiter can inspect and disagree with — never a bare pass/fail verdict, never a single word.",
        },
    },
    "required": [
        "technical_rating",
        "communication_rating",
        "response_confidence_signal",
        "hiring_recommendation",
    ],
}


def generate_question(topic: str, candidate_profile_summary: str, transcript: list[dict]) -> str:
    from services.agents.prompts_loader import load_prompt

    history = "\n".join(f"{t['role']}: {t['text']}" for t in transcript) or "(interview just starting)"
    prompt = load_prompt(
        "assessment",
        "generate_question",
        topic=topic,
        candidate_profile_summary=candidate_profile_summary,
        conversation_history=history,
    )
    result = generate_structured(
        schema_name="interview_question",
        schema_description="The next interview question to ask the candidate.",
        parameters=_QUESTION_PARAMETERS,
        prompt=prompt,
        max_tokens=256,
        agent_name="assessment.interview.question",
    )
    return result["question"]


def evaluate_turn(topic: str, question: str, answer: str) -> dict:
    from services.agents.prompts_loader import load_prompt

    prompt = load_prompt(
        "assessment",
        "evaluate_turn",
        topic=topic,
        question=question,
        answer=answer,
    )
    return generate_structured(
        schema_name="turn_evaluation",
        schema_description="Evaluation of the candidate's most recent answer against the current topic.",
        parameters=_TURN_EVAL_PARAMETERS,
        prompt=prompt,
        max_tokens=512,
        agent_name="assessment.interview.evaluate_turn",
    )


def generate_followup(topic: str, question: str, answer: str) -> str:
    from services.agents.prompts_loader import load_prompt

    prompt = load_prompt(
        "assessment",
        "generate_followup",
        topic=topic,
        question=question,
        answer=answer,
    )
    result = generate_structured(
        schema_name="followup_question",
        schema_description="A targeted follow-up question probing the weak spot in the candidate's last answer.",
        parameters=_FOLLOWUP_PARAMETERS,
        prompt=prompt,
        max_tokens=256,
        agent_name="assessment.interview.followup",
    )
    return result["question"]


def generate_interview_report(transcript: list[dict], per_topic_scores: dict[str, float]) -> dict:
    from services.agents.prompts_loader import load_prompt

    history = "\n".join(f"{t['role']}: {t['text']}" for t in transcript)
    prompt = load_prompt(
        "assessment",
        "interview_report",
        per_topic_scores_json=json.dumps(per_topic_scores),
        transcript_history=history,
    )
    return generate_structured(
        schema_name="interview_report",
        schema_description="Final interview report synthesized from the full transcript.",
        parameters=_REPORT_PARAMETERS,
        prompt=prompt,
        max_tokens=1024,
        agent_name="assessment.interview.report",
    )

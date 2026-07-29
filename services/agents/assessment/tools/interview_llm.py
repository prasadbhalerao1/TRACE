"""AI Interview Agent's four LLM steps (FR-2.1/2.2/2.3/2.4, all Sonnet per doc 03 §5 —
adapting difficulty and judging answer quality both need real reasoning, not
extraction-tier Haiku). Same anthropic tool-use pattern as
`assessment/tools/llm_review.py` / `candidate_intelligence/tools/fact_check.py`.
"""

import json

import anthropic

from services.agents.assessment.tools.llm_review import AssessmentUnavailable
from services.api.core.config import get_settings

_QUESTION_SCHEMA = {
    "name": "interview_question",
    "description": "The next interview question to ask the candidate.",
    "input_schema": {
        "type": "object",
        "properties": {"question": {"type": "string"}},
        "required": ["question"],
    },
}

_TURN_EVAL_SCHEMA = {
    "name": "turn_evaluation",
    "description": "Evaluation of the candidate's most recent answer against the current topic.",
    "input_schema": {
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
    },
}

_FOLLOWUP_SCHEMA = {
    "name": "followup_question",
    "description": "A targeted follow-up question probing the weak spot in the candidate's last answer.",
    "input_schema": {
        "type": "object",
        "properties": {"question": {"type": "string"}},
        "required": ["question"],
    },
}

_REPORT_SCHEMA = {
    "name": "interview_report",
    "description": "Final interview report synthesized from the full transcript.",
    "input_schema": {
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
    },
}


def _client(settings) -> anthropic.Anthropic:
    if not settings.anthropic_api_key:
        raise AssessmentUnavailable("ANTHROPIC_API_KEY is not configured — the AI Interview Agent requires it.")
    return anthropic.Anthropic(api_key=settings.anthropic_api_key)


def _extract_tool_input(response, tool_name: str) -> dict:
    for block in response.content:
        if block.type == "tool_use" and block.name == tool_name:
            return block.input
    raise AssessmentUnavailable(f"Model did not return structured '{tool_name}' output.")


def generate_question(topic: str, candidate_profile_summary: str, transcript: list[dict]) -> str:
    settings = get_settings()
    client = _client(settings)
    history = "\n".join(f"{t['role']}: {t['text']}" for t in transcript) or "(interview just starting)"
    prompt = (
        "You are the Question Agent for a technical AI interview. Ask ONE clear, "
        f"specific interview question about the topic '{topic}'. Personalize it using "
        "the candidate's own background where it makes the question sharper (e.g. ask "
        "about a technology they've actually claimed to use), but do not fabricate "
        "anything about their background beyond what's given below. Keep it to one "
        "question, conversational tone, no preamble like 'Great, next let's discuss'.\n\n"
        f"CANDIDATE BACKGROUND:\n{candidate_profile_summary}\n\n"
        f"CONVERSATION SO FAR:\n{history}"
    )
    try:
        response = client.messages.create(
            model=settings.llm_model_judgment,
            max_tokens=256,
            tools=[_QUESTION_SCHEMA],
            tool_choice={"type": "tool", "name": "interview_question"},
            messages=[{"role": "user", "content": prompt}],
        )
    except anthropic.APIError as exc:
        raise AssessmentUnavailable(f"Anthropic API call failed: {exc}") from exc
    return _extract_tool_input(response, "interview_question")["question"]


def evaluate_turn(topic: str, question: str, answer: str) -> dict:
    settings = get_settings()
    client = _client(settings)
    prompt = (
        "You are the Turn Evaluation Agent for a technical AI interview. Score the "
        f"candidate's answer to a question about '{topic}' on a 0-100 rubric of "
        "correctness/depth, decide whether it's 'weak' (deserves a follow-up probe) or "
        "'sufficient' (move to the next topic), and note hedging language and answer "
        "specificity — these are TEXT signals only (word choice, structure), never a "
        "guess at tone, emotion, or vocal delivery, since this is a text transcript.\n\n"
        f"QUESTION ASKED: {question}\n\n"
        f"CANDIDATE'S ANSWER: {answer}"
    )
    try:
        response = client.messages.create(
            model=settings.llm_model_judgment,
            max_tokens=512,
            tools=[_TURN_EVAL_SCHEMA],
            tool_choice={"type": "tool", "name": "turn_evaluation"},
            messages=[{"role": "user", "content": prompt}],
        )
    except anthropic.APIError as exc:
        raise AssessmentUnavailable(f"Anthropic API call failed: {exc}") from exc
    return _extract_tool_input(response, "turn_evaluation")


def generate_followup(topic: str, question: str, answer: str) -> str:
    settings = get_settings()
    client = _client(settings)
    prompt = (
        "You are the Follow-up Agent for a technical AI interview. The candidate's last "
        f"answer about '{topic}' was judged weak (vague, evasive, or missing the core "
        "of the question). Ask ONE targeted follow-up that directly probes the specific "
        "gap in their answer — do not just repeat the original question, and do not "
        "move to a new topic.\n\n"
        f"ORIGINAL QUESTION: {question}\n\n"
        f"CANDIDATE'S WEAK ANSWER: {answer}"
    )
    try:
        response = client.messages.create(
            model=settings.llm_model_judgment,
            max_tokens=256,
            tools=[_FOLLOWUP_SCHEMA],
            tool_choice={"type": "tool", "name": "followup_question"},
            messages=[{"role": "user", "content": prompt}],
        )
    except anthropic.APIError as exc:
        raise AssessmentUnavailable(f"Anthropic API call failed: {exc}") from exc
    return _extract_tool_input(response, "followup_question")["question"]


def generate_interview_report(transcript: list[dict], per_topic_scores: dict[str, float]) -> dict:
    settings = get_settings()
    client = _client(settings)
    history = "\n".join(f"{t['role']}: {t['text']}" for t in transcript)
    prompt = (
        "You are the Interview Report Agent for a technical AI interview. Synthesize the "
        "full transcript below into a final report. `communication_rating` and "
        "`response_confidence_signal` must be derived ONLY from transcript text signals "
        "(clarity, structure, hedging-language rate, specificity) — this platform "
        "explicitly never uses voice biometrics or emotion inference, so do not imply "
        "anything about tone, delivery, or nervousness. `hiring_recommendation` must be "
        "2-4 sentences of advisory rationale a recruiter can read and disagree with — "
        "never a bare pass/fail word.\n\n"
        f"PER-TOPIC SCORES (0-100, from the Turn Evaluation Agent): {json.dumps(per_topic_scores)}\n\n"
        f"FULL TRANSCRIPT:\n{history}"
    )
    try:
        response = client.messages.create(
            model=settings.llm_model_judgment,
            max_tokens=1024,
            tools=[_REPORT_SCHEMA],
            tool_choice={"type": "tool", "name": "interview_report"},
            messages=[{"role": "user", "content": prompt}],
        )
    except anthropic.APIError as exc:
        raise AssessmentUnavailable(f"Anthropic API call failed: {exc}") from exc
    return _extract_tool_input(response, "interview_report")

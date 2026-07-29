"""Turn Evaluation Agent — FR-2.1. Node contract: constraints.md §2.3.

Reads the router-appended candidate answer (the last `transcript` entry, role
'candidate') and the question before it (role 'agent'), scores it, and decides whether
this topic needs a follow-up or is done. Caps follow-ups at `_MAX_FOLLOWUPS_PER_TOPIC` so
a genuinely evasive candidate can't stall the interview indefinitely on one topic.
"""

from services.agents.assessment.state import InterviewState
from services.agents.assessment.tools.interview_llm import evaluate_turn

_MAX_FOLLOWUPS_PER_TOPIC = 1


async def run(state: InterviewState) -> dict:
    transcript = state["transcript"]
    answer_turn = transcript[-1]
    question_turn = transcript[-2] if len(transcript) >= 2 else {"text": ""}
    topic = state["topic_plan"][state["current_topic_idx"]]

    evaluation = evaluate_turn(topic, question_turn["text"], answer_turn["text"])

    per_topic_scores = {**state["per_topic_scores"]}
    follow_up_count = state["follow_up_count_this_topic"]
    current_idx = state["current_topic_idx"]

    is_weak = evaluation["verdict"] == "weak"
    should_follow_up = is_weak and follow_up_count < _MAX_FOLLOWUPS_PER_TOPIC

    if should_follow_up:
        return {
            "last_answer_verdict": "weak",
            "follow_up_count_this_topic": follow_up_count + 1,
        }

    # Topic is done (sufficient, or follow-up budget exhausted) — record its score and advance.
    per_topic_scores[topic] = evaluation["score"]
    next_idx = current_idx + 1
    completed = next_idx >= len(state["topic_plan"])
    return {
        "last_answer_verdict": "sufficient",
        "per_topic_scores": per_topic_scores,
        "current_topic_idx": next_idx,
        "follow_up_count_this_topic": 0,
        "interview_status": "completed" if completed else "in_progress",
        "next_question": None if completed else state.get("next_question"),
    }

"""Interview Report Agent — FR-2.4. Node contract: constraints.md §2.3. Separate
on-demand subgraph (see `interview_report_graph.py`), invoked once when the candidate
calls `POST /interview-sessions/{id}/end` — same pattern as Module 01's
career_guidance_graph being separate from the main ingestion fan-out."""

from services.agents.assessment.state import InterviewReportState
from services.agents.assessment.tools.interview_llm import generate_interview_report


async def run(state: InterviewReportState) -> dict:
    report = generate_interview_report(state["transcript"], state["per_topic_scores"])
    return {
        "response_confidence_signal": report["response_confidence_signal"],
        "technical_rating": report["technical_rating"],
        "communication_rating": report["communication_rating"],
        "hiring_recommendation": report["hiring_recommendation"],
    }

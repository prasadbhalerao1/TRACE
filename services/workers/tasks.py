"""Async Worker Tasks Definition.

Defines decoupled background worker task functions that can be invoked via FastAPI BackgroundTasks,
asyncio event loops, or distributed queues (Arq/Celery).
"""

import logging
from typing import Any

from services.api.core.notifications import dispatch_notification
from services.api.core.pdf_converter import extract_slides_from_pdf

logger = logging.getLogger("dataaxle.workers")


async def task_process_notification(
    recipient_email: str,
    event_type: str,
    subject: str,
    payload: dict[str, Any],
) -> bool:
    """Worker task: Dispatches email/webhook notification to a user."""
    logger.info("WORKER_TASK [notification] event=%s recipient=%s", event_type, recipient_email)
    return dispatch_notification(recipient_email, event_type, subject, payload)


async def task_extract_pitch_deck_slides(
    presentation_id: str,
    pdf_bytes: bytes,
) -> list[dict[str, Any]]:
    """Worker task: Offloads presentation slide text & OCR extraction."""
    logger.info("WORKER_TASK [pdf_extract] presentation_id=%s bytes=%d", presentation_id, len(pdf_bytes))
    slides = extract_slides_from_pdf(pdf_bytes)
    logger.info("WORKER_TASK [pdf_extract] completed slides_count=%d", len(slides))
    return slides


async def task_run_hackathon_finalization(
    hackathon_id: str,
) -> dict[str, Any]:
    """Worker task: Triggers hackathon ranking finalization pipeline."""
    logger.info("WORKER_TASK [hackathon_finalize] hackathon_id=%s", hackathon_id)
    from services.agents.hackathon.graph import build_hackathon_ranking_graph

    graph = build_hackathon_ranking_graph()
    initial_state = {"hackathon_id": hackathon_id}
    res = await graph.ainvoke(initial_state)
    logger.info("WORKER_TASK [hackathon_finalize] rankings finalized successfully")
    return res

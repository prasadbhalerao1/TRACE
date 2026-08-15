"""Worker task functions — the queue-side entry points for every long AI pipeline.

Each function here is a thin adapter: it takes the arguments arq handed it and delegates
to the *same* `_..._background` implementation the API process uses for its in-process
fallback. There is deliberately no second copy of the pipeline logic — the queued path
and the fallback path must not be able to drift apart.

(The previous version of this module defined three tasks that nothing ever imported, one
of which — `task_run_hackathon_finalization` — invoked the ranking graph with an
incomplete initial state and discarded the result without persisting anything. It was
dead code that would not have worked if called; it has been replaced rather than kept.)

Why the router imports are function-local
-----------------------------------------
The API routers pull in the whole agent stack (LangGraph graphs, sentence-transformers,
Qdrant clients). Importing them at module scope would make worker startup pay that cost
up front and, worse, would let a single import error in any one router take down the
entire worker. Importing inside the task keeps startup fast and failures scoped to the
task that actually needs the module.

Argument types
--------------
arq serializes job arguments with pickle, so `uuid.UUID` and `bytes` both round-trip
natively and need no manual encoding. File bytes (resumes, certificates, decks) pass
through the queue as-is; they are already bounded by the upload size limits the routers
enforce before enqueueing.

Retries
-------
arq only re-runs a job when the task raises `arq.worker.Retry` — an ordinary exception is
logged and the job is marked failed. That interacts with a deliberate property of the
`_..._background` helpers: they catch everything and record the reason on the subject row
(`ingestion_error`, `matching_error`, `grading_error`, `ranking_error`) so the UI's poll
always resolves. Nothing propagates on its own.

So retrying is opt-in here, via `_retry_if_transient`: after a helper runs, the task
re-reads the row and, if it failed for a reason that looks like a transient
infrastructure fault (network blip, timeout, rate limit, upstream 5xx), raises `Retry`
with exponential backoff. Permanent failures — bad input, a missing row, an unsupported
file — are left alone, because re-running them would burn the retry budget and delay the
user's error message without any chance of a different outcome.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

from arq.worker import Retry

from services.api.core.config import get_settings

logger = logging.getLogger("trace.workers.tasks")

# Substrings that mark a recorded failure as worth another attempt. Matched
# case-insensitively against the error text the pipeline persisted. Deliberately
# conservative: anything unrecognised is treated as permanent so a deterministic bug
# can't consume the whole retry budget on every job.
_TRANSIENT_ERROR_MARKERS = (
    "timeout",
    "timed out",
    "connection",
    "connectionerror",
    "temporarily unavailable",
    "service unavailable",
    "rate limit",
    "too many requests",
    "429",
    "500 server error",
    "502",
    "503",
    "504",
    "bad gateway",
    "reset by peer",
    "unavailable",
)


def _is_transient(error_text: str | None) -> bool:
    if not error_text:
        return False
    lowered = error_text.lower()
    return any(marker in lowered for marker in _TRANSIENT_ERROR_MARKERS)


def _retry_if_transient(ctx: dict, error_text: str | None, subject: str) -> None:
    """Raises `Retry` when `error_text` looks transient and tries remain.

    Backoff doubles per attempt from `queue_retry_base_delay_seconds`, giving a flaky
    upstream (GitHub, an LLM provider, Qdrant) time to recover instead of hammering it.
    """
    if not _is_transient(error_text):
        return
    settings = get_settings()
    job_try = ctx.get("job_try") or 1
    if job_try >= settings.queue_max_tries:
        logger.warning(
            "TASK %s exhausted retries after transient error: %s", subject, error_text
        )
        return
    delay = settings.queue_retry_base_delay_seconds * (2 ** (job_try - 1))
    logger.info(
        "TASK %s transient failure (try %s) — retrying in %ss: %s",
        subject,
        job_try,
        delay,
        error_text,
    )
    raise Retry(defer=delay)


async def _retry_from_row(
    ctx: dict,
    model: Any,
    row_id: uuid.UUID,
    field_prefix: str,
    subject: str,
) -> None:
    """Re-reads the subject row and retries the job if the pipeline recorded a transient
    failure.

    `field_prefix` names the status/error column pair to read — e.g. `"matching"` reads
    `matching_status` / `matching_error`. Reading the row (rather than catching an
    exception) is what lets this work without changing the `_..._background` helpers,
    which intentionally swallow errors so the polling UI always gets a definite answer.

    Any problem inspecting the row is ignored: the pipeline has already persisted a real
    outcome, and failing here would turn a completed job into a spurious retry.
    """
    from sqlalchemy import select

    from services.api.core.db import async_session

    try:
        async with async_session() as db:
            row = (await db.execute(select(model).where(model.id == row_id))).scalar_one_or_none()
            if row is None:
                return
            if getattr(row, f"{field_prefix}_status", None) != "failed":
                return
            error_text = getattr(row, f"{field_prefix}_error", None)
    except Retry:
        raise
    except Exception:  # noqa: BLE001 - inspection must never invent a failure
        logger.debug("TASK %s could not re-read row for retry check", subject, exc_info=True)
        return

    _retry_if_transient(ctx, error_text, subject)


async def task_run_ingestion(
    ctx: dict,
    profile_id: uuid.UUID,
    state_overrides: dict,
    github_access_token: str | None = None,
) -> None:
    """Candidate ingestion: resume parse, GitHub crawl, certificate OCR, Talent Score."""
    from packages.db.models import CandidateProfile
    from services.api.modules.candidates.router import _run_ingestion_background

    logger.info("TASK ingestion profile_id=%s try=%s", profile_id, ctx.get("job_try"))
    await _run_ingestion_background(profile_id, state_overrides, github_access_token)
    await _retry_from_row(ctx, CandidateProfile, profile_id, "ingestion", f"ingestion:{profile_id}")


async def task_run_matching(
    ctx: dict,
    job_id: uuid.UUID,
    use_pool_cache: bool = True,
) -> None:
    """Flow B job matching: candidate-pool build, embeddings, scoring, persistence."""
    from packages.db.models import Job
    from services.api.modules.recruitment.router import _run_matching_background

    logger.info("TASK matching job_id=%s try=%s", job_id, ctx.get("job_try"))
    await _run_matching_background(job_id, use_pool_cache=use_pool_cache)
    await _retry_from_row(ctx, Job, job_id, "matching", f"matching:{job_id}")


async def task_grade_submission(
    ctx: dict,
    submission_id: uuid.UUID,
    assessment_id: uuid.UUID,
    user_id: uuid.UUID,
    test_results: list[dict],
) -> None:
    """Assessment grading: repo fetch, static analysis, LLM code review."""
    from packages.db.models import Submission
    from services.api.modules.assessments.router import _grade_submission_background

    logger.info("TASK grade_submission submission_id=%s try=%s", submission_id, ctx.get("job_try"))
    await _grade_submission_background(submission_id, assessment_id, user_id, test_results)
    await _retry_from_row(ctx, Submission, submission_id, "grading", f"grading:{submission_id}")


async def task_analyze_presentation(
    ctx: dict,
    presentation_id: uuid.UUID,
    owner_user_id: uuid.UUID,
    file_bytes: bytes,
    file_name: str | None,
    file_content_type: str | None,
    linked_repo: str | None,
) -> None:
    """Pitch-deck analysis: slide extraction/OCR, rubric scoring, plagiarism check."""
    from packages.db.models import Presentation
    from services.api.modules.presentations.router import _analyze_presentation

    logger.info(
        "TASK analyze_presentation presentation_id=%s try=%s", presentation_id, ctx.get("job_try")
    )
    await _analyze_presentation(
        presentation_id, owner_user_id, file_bytes, file_name, file_content_type, linked_repo
    )
    # Presentations predate the `{prefix}_status`/`{prefix}_error` convention and use
    # plain `status`/`status_detail`, so the generic helper doesn't fit here.
    from sqlalchemy import select

    from services.api.core.db import async_session

    try:
        async with async_session() as db:
            row = (
                await db.execute(select(Presentation).where(Presentation.id == presentation_id))
            ).scalar_one_or_none()
            detail = row.status_detail if row is not None and row.status == "failed" else None
    except Exception:  # noqa: BLE001 - inspection must never invent a failure
        logger.debug("TASK deck retry check failed", exc_info=True)
        detail = None
    _retry_if_transient(ctx, detail, f"deck:{presentation_id}")


async def task_finalize_rankings(
    ctx: dict,
    hackathon_id: uuid.UUID,
    user_id: uuid.UUID,
) -> None:
    """Hackathon ranking finalization: repo verification, novelty, composite scoring."""
    from packages.db.models import Hackathon
    from services.api.modules.hackathons.router import _run_finalization_background

    logger.info("TASK finalize_rankings hackathon_id=%s try=%s", hackathon_id, ctx.get("job_try"))
    await _run_finalization_background(hackathon_id, user_id)
    await _retry_from_row(ctx, Hackathon, hackathon_id, "ranking", f"ranking:{hackathon_id}")


# Registered with the arq Worker in `runner.py`. Each function's __name__ must match the
# corresponding TASK_* constant in `services/api/core/queue.py` — that string is the
# contract between the enqueue site and the worker.
TASKS: list[Any] = [
    task_run_ingestion,
    task_run_matching,
    task_grade_submission,
    task_analyze_presentation,
    task_finalize_rankings,
]

"""Standalone background worker process (arq).

Consumes the Redis job queue that `services/api/core/queue.py` publishes to, running
every long AI pipeline — candidate ingestion, job matching, assessment grading, pitch-deck
analysis, hackathon ranking finalization — in a process separate from the API.

Usage:
    python -m services.workers.runner

    # or, equivalently, via arq's own CLI:
    arq services.workers.runner.WorkerSettings

Run at least one of these alongside `uvicorn`. Without a worker, enqueued jobs simply
queue up in Redis and no `"processing"` row ever advances — so `services/api/core/queue.py`
falls back to in-process execution whenever Redis is unreachable, which keeps a
worker-less setup (plain `uvicorn`, no Docker) working exactly as it did before.

(This module previously contained a `while True: await asyncio.sleep(5)` heartbeat that
consumed nothing and was imported by no one. It is now a real consumer.)
"""

from __future__ import annotations

import logging
import sys

from arq.connections import RedisSettings

from services.api.core.config import get_settings
from services.workers.tasks import TASKS

logger = logging.getLogger("trace.workers.runner")


async def startup(ctx: dict) -> None:
    logger.info("=========================================================")
    logger.info(" TRACE background worker ready")
    logger.info(" Tasks: %s", ", ".join(f.__name__ for f in TASKS))
    logger.info("=========================================================")


async def shutdown(ctx: dict) -> None:
    # The SQLAlchemy engine in services.api.core.db is module-level and shared by every
    # task that opened a session; dispose it so Postgres connections are released rather
    # than dropped, which otherwise leaves sockets lingering server-side after a restart.
    try:
        from services.api.core.db import engine

        await engine.dispose()
    except Exception:  # noqa: BLE001 - shutdown must never raise
        logger.debug("engine dispose failed during worker shutdown", exc_info=True)
    logger.info("Worker process shut down.")


def _redis_settings() -> RedisSettings:
    return RedisSettings.from_dsn(get_settings().redis_url)


class WorkerSettings:
    """arq worker configuration.

    `max_tries` and `job_timeout` come from app settings so the queue's retry/timeout
    behaviour is tuned in one place alongside everything else. `max_jobs` is deliberately
    low: these jobs are CPU- and memory-heavy (a sentence-transformer model is resident
    per process), so running many concurrently on one worker would thrash rather than
    speed anything up — scale out with more worker processes instead.
    """

    functions = TASKS
    on_startup = startup
    on_shutdown = shutdown
    max_jobs = 4
    # arq's `get_kwargs` reads this class's `__dict__` and forwards each matching entry
    # straight to `Worker(...)`, so these must be concrete values, not callables.
    redis_settings = _redis_settings()
    keep_result = get_settings().queue_result_ttl_seconds
    job_timeout = get_settings().queue_job_timeout_seconds
    max_tries = get_settings().queue_max_tries


def main() -> int:
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
    )
    from arq.worker import create_worker

    worker = create_worker(WorkerSettings)  # type: ignore[arg-type]
    try:
        worker.run()
    except KeyboardInterrupt:
        logger.info("Interrupted — shutting down.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

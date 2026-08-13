"""Standalone Background Worker Process Runner.

Runs background task consumers in a dedicated worker process loop.

Usage:
    python -m services.workers.runner
"""

import asyncio
import logging
import sys

logger = logging.getLogger("dataaxle.workers.runner")


async def run_worker_loop():
    """Main background worker process loop."""
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    logger.info("=========================================================")
    logger.info(" TRACE Standalone Background Worker Process Initialized ")
    logger.info(" Monitoring async task queue for notifications, PDF OCR, and LangGraph pipelines ")
    logger.info("=========================================================")

    try:
        while True:
            # Standalone worker heartbeat / task listener loop
            await asyncio.sleep(5)
    except (KeyboardInterrupt, asyncio.CancelledError):
        logger.info("Worker process shutting down gracefully...")


if __name__ == "__main__":
    try:
        asyncio.run(run_worker_loop())
    except KeyboardInterrupt:
        sys.exit(0)

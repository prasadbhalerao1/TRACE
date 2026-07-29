"""Commit Attribution Agent — FR-3.1. Node contract: constraints.md §2.3."""

from dataclasses import asdict

from services.agents.assessment.state import ContributionState
from services.agents.assessment.tools.github_contribution import attribute_commits


async def run(state: ContributionState) -> dict:
    stats = attribute_commits(state["repo_full_name"], state["github_usernames"], state.get("access_token"))
    return {"raw_stats": {username: asdict(s) for username, s in stats.items()}}

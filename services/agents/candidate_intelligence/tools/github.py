"""Deterministic GitHub data pull — no LLM involved. FR-1.1 / doc 01 §2.

Uses the candidate's own OAuth token when available (per-candidate auth, never a shared
server-side token) so rate limits and access scope are the candidate's own.
"""

import statistics
from dataclasses import dataclass, field

from github import Github
from github.GithubException import GithubException


@dataclass
class RepoSnapshot:
    repo_full_name: str
    stars: int
    forks: int
    commit_count: int
    pr_count: int
    issue_count: int
    languages: dict[str, int]
    is_fork: bool


@dataclass
class GithubAnalysis:
    repos: list[RepoSnapshot] = field(default_factory=list)
    total_stars: int = 0
    external_contributions: int = 0  # PRs merged into repos the candidate doesn't own
    commit_activity_weekly: list[int] = field(default_factory=list)  # last 52 weeks, own non-fork repos
    owned_repo_count: int = 0
    pr_review_count: int = 0


def fetch_github_analysis(
    github_username: str, access_token: str | None = None, max_repos: int = 15
) -> GithubAnalysis:
    """Pulls repo stats, language breakdown, commit cadence, and PR-review activity.

    Bounded to `max_repos` most-recently-pushed repos to keep ingestion under the <30s
    NFR target (doc 01 §10) — a candidate's full history isn't needed for the mechanical
    sub-scores, just a representative recent sample.
    """
    # retry=None: fail fast on rate limits (GithubException) instead of PyGithub's default
    # backoff-and-retry, which can block for the full rate-limit reset window.
    client = Github(login_or_token=access_token, retry=None) if access_token else Github(retry=None)
    user = client.get_user(github_username)

    analysis = GithubAnalysis()
    repos = sorted(user.get_repos(), key=lambda r: r.pushed_at, reverse=True)[:max_repos]

    for repo in repos:
        if repo.fork:
            is_fork = True
        else:
            is_fork = False
            analysis.owned_repo_count += 1

        try:
            languages = repo.get_languages()
        except GithubException:
            languages = {}

        try:
            commit_count = repo.get_commits().totalCount
        except GithubException:
            commit_count = 0

        try:
            pr_count = repo.get_pulls(state="all").totalCount
        except GithubException:
            pr_count = 0

        try:
            issue_count = repo.get_issues(state="all").totalCount
        except GithubException:
            issue_count = 0

        analysis.repos.append(
            RepoSnapshot(
                repo_full_name=repo.full_name,
                stars=repo.stargazers_count,
                forks=repo.forks_count,
                commit_count=commit_count,
                pr_count=pr_count,
                issue_count=issue_count,
                languages=languages,
                is_fork=is_fork,
            )
        )
        analysis.total_stars += repo.stargazers_count

        if not is_fork:
            try:
                weekly = repo.get_stats_commit_activity() or []
                counts = [w.total for w in weekly]
                if counts:
                    if not analysis.commit_activity_weekly:
                        analysis.commit_activity_weekly = counts
                    else:
                        analysis.commit_activity_weekly = [
                            a + b for a, b in zip(analysis.commit_activity_weekly, counts)
                        ]
            except GithubException:
                pass

    try:
        # External contributions: merged PRs authored by this user against repos not owned by them.
        issues = client.search_issues(
            query=f"type:pr author:{github_username} is:merged -user:{github_username}"
        )
        analysis.external_contributions = issues.totalCount
    except GithubException:
        analysis.external_contributions = 0

    try:
        reviewed = client.search_issues(query=f"type:pr reviewed-by:{github_username}")
        analysis.pr_review_count = reviewed.totalCount
    except GithubException:
        analysis.pr_review_count = 0

    return analysis


def commit_consistency_score(weekly_counts: list[int]) -> float | None:
    """Technical Consistency mechanical sub-score (doc 08 §1): regularity, not volume.

    Coefficient of variation (stdev/mean) inverted to a 0-100 scale — low variance
    (steady cadence) scores high, bursty/inactive-then-frantic cadence scores low.
    """
    active_weeks = [c for c in weekly_counts if c > 0]
    if len(active_weeks) < 4:
        return None  # not enough signal yet — cold start, not a penalty
    mean = statistics.mean(weekly_counts)
    if mean == 0:
        return None
    cv = statistics.pstdev(weekly_counts) / mean
    return max(0.0, min(100.0, 100.0 * (1 / (1 + cv))))

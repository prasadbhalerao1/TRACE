"""Commit Attribution Agent — FR-3.1/3.2, "tools only" per doc 03 §5. Reuses
`candidate_intelligence/tools/github.py`'s exact client-construction/error-handling
pattern (per-repo try/except, `retry=None` to fail fast on rate limits).
"""

from dataclasses import dataclass

from github import Github
from github.GithubException import GithubException


@dataclass
class MemberCommitStats:
    github_username: str
    commits: int
    # Net additions across this member's commits — an approximation of "lines that
    # survive to HEAD" (doc 03 §7's exact phrase implies blame-based tracking of what's
    # still present at HEAD, which needs a full git blame pass; commit-level net
    # additions is the practical proxy available from the GitHub REST API without
    # cloning the repo). Documented here, not hidden.
    lines_survived: int
    prs_opened: int
    prs_reviewed: int


def attribute_commits(
    repo_full_name: str, github_usernames: list[str], access_token: str | None = None
) -> dict[str, MemberCommitStats]:
    client = Github(login_or_token=access_token, retry=None) if access_token else Github(retry=None)
    repo = client.get_repo(repo_full_name)

    results: dict[str, MemberCommitStats] = {}
    for username in github_usernames:
        try:
            commits = list(repo.get_commits(author=username))
        except GithubException:
            commits = []

        net_additions = 0
        for c in commits:
            try:
                stats = c.stats
                net_additions += (stats.additions or 0) - (stats.deletions or 0)
            except GithubException:
                continue

        try:
            prs_opened = client.search_issues(
                query=f"repo:{repo_full_name} type:pr author:{username} is:merged"
            ).totalCount
        except GithubException:
            prs_opened = 0

        try:
            prs_reviewed = client.search_issues(
                query=f"repo:{repo_full_name} type:pr reviewed-by:{username}"
            ).totalCount
        except GithubException:
            prs_reviewed = 0

        results[username] = MemberCommitStats(
            github_username=username,
            commits=len(commits),
            lines_survived=max(0, net_additions),
            prs_opened=prs_opened,
            prs_reviewed=prs_reviewed,
        )

    return results

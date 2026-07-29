# Memory Index

- [Platform status 2026-07-29](project_platform_status_20260729.md) — **READ FIRST**: current build status across all modules, supersedes older per-module files.
- [Progressive commits](feedback_progressive_commits.md) — commit in small natural units as work happens, not one batch at the end.
- [Doc sets both current](project_doc_sets_both_current.md) — doc/SRS and doc/multi-agent-architecture are complementary, neither is "legacy."
- [Route group collisions](project_nextjs_route_group_collisions.md) — same-named pages across (role) route groups fail the build; shared routes must live outside any group.
- [LangGraph parallel fan-out](feedback_langgraph_parallel_fanout.md) — node `run()` must return only changed keys, not full state, or parallel branches collide.
- [Windows background dev servers](feedback_windows_background_dev_servers.md) — never background a long-lived server with shell `&`/disown; pass the bare command with run_in_background instead.
- [Env secret leak prevention](feedback_env_example_secret_leak.md) — never commit real secrets; .env.example uses placeholders.
- [Candidate Workflow UI Completed](project_candidate_workflow_ui_completed.md) — candidate dashboard 4-action grid wired to Module 01 & 04 features.

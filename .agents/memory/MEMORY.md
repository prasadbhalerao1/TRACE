# Memory Index

- [Progressive commits](feedback_progressive_commits.md) — commit in small natural units as work happens, not one batch at the end.
- [Doc sets both current](project_doc_sets_both_current.md) — doc/SRS and doc/multi-agent-architecture are complementary, neither is "legacy."
- [Route group collisions](project_nextjs_route_group_collisions.md) — same-named pages across (role) route groups fail the build; shared routes must live outside any group.
- [Module 01 core loop status](project_module01_candidate_core_loop.md) — FR-1/2/3 built 2026-07-29, FR-4/5 deferred, missing Anthropic/Cloudinary keys block live testing.
- [LangGraph parallel fan-out](feedback_langgraph_parallel_fanout.md) — node `run()` must return only changed keys, not full state, or parallel branches collide.
- [Windows background dev servers](feedback_windows_background_dev_servers.md) — never background a long-lived server with shell `&`/disown; pass the bare command with run_in_background instead.
- [Parallel module builds 2026-07-29](project_parallel_module_builds_20260729.md) — HANDOFF: FR-5 done, FR-4 uncommitted, Module 04 partial; exact worktree paths/commits/migration IDs logged, read first.

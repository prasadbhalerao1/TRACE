# Memory Index

- [Progressive commits](feedback_progressive_commits.md) — commit in small natural units as work happens, not one batch at the end.
- [Doc sets both current](project_doc_sets_both_current.md) — doc/SRS and doc/multi-agent-architecture are complementary, neither is "legacy."
- [Route group collisions](project_nextjs_route_group_collisions.md) — same-named pages across (role) route groups fail the build; shared routes must live outside any group.
- [Module 01 complete](project_module01_candidate_core_loop.md) — **ALL FRs done** (FR-1/2/3/4/5 on main as of 2026-07-29). Module 04 PPT Analyzer also done. Next: Module 02 Recruitment.
- [LangGraph parallel fan-out](feedback_langgraph_parallel_fanout.md) — node `run()` must return only changed keys, not full state, or parallel branches collide.
- [Windows background dev servers](feedback_windows_background_dev_servers.md) — never background a long-lived server with shell `&`/disown; pass the bare command with run_in_background instead.
- [Parallel module builds 2026-07-29](project_parallel_module_builds_20260729.md) — **COMPLETED**: FR-4, FR-5, Module 04 all merged into main (`8f6327a`). Worktrees removed. Migration chain linearized. Read this for the full file inventory and what's needed before testing live.
- [Env secret leak prevention](feedback_env_example_secret_leak.md) — never commit real secrets; .env.example uses placeholders.
- [Candidate Workflow UI Completed](project_candidate_workflow_ui_completed.md) — **COMPLETED**: 4-action candidate dashboard launchpad, Module 04 API client alignment, DB verified at head (`e8a55dc975da`), 0 tsc errors.
- [Module 02 Recruitment Prep](project_module02_recruitment_platform_prep.md) — Architecture blueprint and step sequence for Module 02 (3-stage matching pipeline, Recruiter Copilot, Job CRUD, ATS Kanban).

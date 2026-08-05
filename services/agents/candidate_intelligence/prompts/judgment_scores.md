# Project Quality Judgment Prompt

Rate the architecture and README quality of these projects on a 0-100 scale, grounded only in what the summaries actually describe. This score feeds a candidate's Talent Score, which recruiters rank on — so both inflation and unfair harshness have real consequences for a real person.

## Score bands

Anchor your number to these bands rather than drifting toward a comfortable middle:

- **85-100** — Substantial, well-structured systems. Clear separation of concerns, meaningful test coverage, thorough documentation. Evidence of sustained work (many commits over time) and outside interest (stars, forks, contributors).
- **70-84** — Solid, complete projects. Sensible structure and a real README that explains what the project does and how to run it. Perhaps thinner tests or lighter docs.
- **50-69** — Working but modest. Functional code with limited structure, a brief README, little testing. Typical of good coursework or a small personal tool.
- **30-49** — Minimal. Tutorial follow-alongs, boilerplate with few changes, a stub README, or a project abandoned very early.
- **0-29** — Effectively empty: a scaffold with no substantive code, or nothing legible in the summary.

## Calibration examples

**Input:** `"jordan/order-service: 340 stars, 1200 commits, Go. README documents architecture, deployment, and benchmarks. Has integration tests and CI."`
**Score ~88.** Sustained commit history, external validation, tests and CI, documentation covering more than installation.

**Input:** `"jordan/portfolio-site: 2 stars, 18 commits, JavaScript. README is the Create React App default."`
**Score ~35.** Small, an unmodified default README, minimal history. Not worthless — it exists and runs — but there is little engineering evidence here.

**Input:** `"jordan/ml-pipeline: 15 stars, 210 commits, Python. README explains the data flow and setup. No tests mentioned."`
**Score ~68.** Real, sustained work with genuine documentation; the absent test suite keeps it below the 70s band.

## Rules

- **Judge only what is stated.** If tests are not mentioned, treat that as absence of evidence — say so in the rationale rather than assuming they exist or that they don't.
- **Do not reward popularity alone.** A high star count on a tiny project ("awesome-list: 5k stars, 12 commits") is not architecture quality; weigh commit depth and structure over stars.
- **Do not penalize domain or language.** A well-built CLI tool is not inherently worth less than a web app.
- **One score for the whole set**, reflecting the candidate's overall demonstrated project quality, weighted toward their strongest substantial work rather than dragged down by small side repos.

## Rationale

State the specific evidence that produced the number: which projects carried it, what was present, what was missing. "Good projects" is not a rationale.

- Good: "Driven by order-service (1200 commits, integration tests, architecture docs); portfolio-site and dotfiles are small and contribute little."
- Useless: "The projects show reasonable quality and effort."

## Projects

{project_summaries}

## Schema Description

A 0-100 project-quality score with a rationale citing the specific project evidence behind it.

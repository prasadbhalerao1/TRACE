# Generate Interview Definition Questions

You are drafting interview topics for a specific role. Given the role, job description, and years of experience below, produce exactly {question_count} distinct interview topics that assess this role's core technical and behavioral competencies.

Each topic should be a short phrase (not a full question) — the interview engine will phrase actual questions at ask-time. Order them from foundational to advanced.

## What a good topic phrase looks like

Specific enough to anchor a real question, open enough that the interview engine can adapt it to the candidate.

- Good: "Database indexing and query performance"
- Good: "Handling partial failure in service-to-service calls"
- Too vague: "Databases" — could mean anything, so the generated question will be generic too.
- Too narrow: "The difference between a B-tree and a hash index" — that's already a single question with one right answer, leaving nothing to explore.
- Wrong shape: "Tell me about a time you optimized a slow query." — a full question. Topics are phrases; the engine writes the questions.

## Draw topics from the job description

Topics must reflect *this* role. If the JD names Kafka and event-driven architecture, those belong in the list; do not substitute generic backend trivia. Cover the role's actual surface area rather than five variations of one subject.

## Calibrate difficulty to the years of experience

The ordering runs foundational → advanced, but the whole range shifts with seniority.

- **0-2 years** — core language and data structures, debugging approach, version control, testing basics. Advanced end: designing a small feature end to end.
- **3-6 years** — system design for a single service, database modeling and performance, API design, failure handling, code review judgment. Advanced end: tradeoff-heavy design decisions.
- **7+ years** — architecture across services, scaling and migration strategy, technical leadership, incident response, decisions made under ambiguity.

Asking a 10-year engineer to define a hash map wastes the interview; asking a new graduate to design a multi-region failover strategy tests nothing but nerve.

## Worked example

Role: "Senior Backend Engineer" · 6 years · JD mentions Go, PostgreSQL, Kafka, high-traffic APIs · 5 topics:

1. "Go concurrency patterns and their failure modes"
2. "PostgreSQL schema design and indexing for high-write tables"
3. "API design and backward compatibility"
4. "Event-driven processing with Kafka: ordering, retries, and idempotency"
5. "Scaling a high-traffic service: bottleneck identification and mitigation"

Each maps to something the JD actually names, they progress from language-level to system-level, and no two overlap.

## Rules

- Exactly {question_count} topics — no more, no fewer.
- Distinct from one another. "Databases" and "SQL performance" are the same topic twice.
- Include at least one non-purely-technical topic (collaboration, technical decision-making, handling disagreement) when the count is 4 or more.
- No company names, no proprietary tools the candidate could not know.

## Role Title
{role_title}

## Job Description
{job_description}

## Years of Experience Expected
{years_experience}

## Schema Description

A list of interview topic phrases, ordered by difficulty/seniority level.

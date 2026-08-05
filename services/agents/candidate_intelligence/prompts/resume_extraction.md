# Resume Extraction Prompt

Extract structured fields from the resume below. Transcribe what the document says — do not infer, upgrade, or fill gaps. Everything you emit here becomes the candidate's profile of record: it is what the Talent Score is computed from, what recruiters search, and what the fact-checker later treats as ground truth when validating generated documents. A skill you add that isn't in the resume becomes a claim the candidate never made.

## Field rules

- **headline** — the candidate's own professional title or summary line, in their words. If the resume has none, derive it from the most recent job title only (e.g. "Senior Backend Engineer"). Never invent adjectives like "passionate" or "results-driven".
- **location** — city/region as written. Empty string if absent. Do not infer location from an employer's headquarters or a phone area code.
- **skills** — one entry per skill, as an object with a `name`. Take skills from anywhere in the document (skills section, bullets, project descriptions), using the resume's own spelling. Do NOT add skills that are merely implied — "built REST APIs" is not a licence to add "FastAPI".
- **experience** — one entry per role, with `title`, `company`, `years`, `description`.
  - `years` is the **duration of that role in years**, not a calendar year and not total career length. "Mar 2021 - Sep 2023" gives `2.5`. "2019 - present" is computed to the present year. When only a single year appears and duration is unknowable, use `0`.
  - `description` summarizes that role's bullets. Keep concrete metrics exactly as written — "cut p99 latency 40%" stays "cut p99 latency 40%". Never round, restate, or invent a number.
- **education** — one entry per credential, with `institution`, `degree`, `year` (graduation year as a string). Keep the degree as written ("B.Tech", "BSc CS"); do not expand or normalize it.

## Worked example

Resume text:

```
JORDAN REYES
Bangalore, India | jordan.reyes@email.com

Senior Backend Engineer

EXPERIENCE
Flipkart - Backend Engineer (Mar 2021 - Sep 2023)
  - Built order-processing services in Go handling 12k req/s
  - Migrated the checkout DB to PostgreSQL, cutting p99 latency 40%

Zomato - SDE Intern (Jun 2020 - Dec 2020)
  - Wrote internal Python tooling for log analysis

EDUCATION
BITS Pilani - B.Tech Computer Science, 2020

SKILLS: Go, Python, PostgreSQL, Docker, Kafka
```

Correct extraction:

```json
{
  "headline": "Senior Backend Engineer",
  "location": "Bangalore, India",
  "skills": [
    {"name": "Go"}, {"name": "Python"}, {"name": "PostgreSQL"},
    {"name": "Docker"}, {"name": "Kafka"}
  ],
  "experience": [
    {
      "title": "Backend Engineer",
      "company": "Flipkart",
      "years": 2.5,
      "description": "Built order-processing services in Go handling 12k req/s. Migrated the checkout DB to PostgreSQL, cutting p99 latency 40%."
    },
    {
      "title": "SDE Intern",
      "company": "Zomato",
      "years": 0.5,
      "description": "Wrote internal Python tooling for log analysis."
    }
  ],
  "education": [
    {"institution": "BITS Pilani", "degree": "B.Tech Computer Science", "year": "2020"}
  ]
}
```

What this example deliberately does **not** do:

- Does not add "Kubernetes" or "microservices" — plausible for this profile, but absent from the document.
- Does not promote the Zomato internship to "Software Engineer"; the title stays "SDE Intern".
- Uses `2.5` and `0.5` (durations), not `2021` or `2020` (calendar years). This is the single most frequent extraction error.
- Keeps "12k req/s" and "40%" verbatim rather than softening them to "high throughput" or "significant improvement".

## Sparse and messy inputs

- A field with nothing in the document gets an empty string or empty array. Never fabricate to fill a slot.
- Overlapping or concurrent roles each get their own entry, exactly as listed.
- For garbled or partially unreadable OCR text, extract only the parts you can actually read.

## Resume

{resume_text}

## Schema Description

Structured profile fields transcribed from the resume text, containing only what the document actually states.

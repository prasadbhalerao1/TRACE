#!/usr/bin/env python3
"""Generate a realistic candidate population, with real embeddings written to Qdrant.

Why this exists
---------------
Two features are dark without a population:

1. **Percentile normalization.** `percentile_normalize` needs `MIN_POPULATION` (30)
   candidates before it will rank anything; below that every sub-score silently falls
   back to a fixed constant. With a handful of seeded candidates the platform's central
   scoring algorithm never actually runs.
2. **Vector search.** Job matching, Copilot semantic search and skill-gap analysis all
   query Qdrant. Empty collections mean those return `None`/cold-start for everyone.

What "realistic" means here
---------------------------
Synthetic data that is merely *well-formed* is worse than useless for this: uniformly
random scores make every percentile ~50, and random skill sets make semantic search look
broken when it is working correctly. So the generator enforces the correlations that make
the data behave like a real population:

- **Archetypes, not random skills.** Each candidate is drawn from a real stack (backend
  Python, frontend React, ML, infra, mobile, data). Skills, repo names, languages, topics
  and headlines all come from the same archetype, so a "React developer" genuinely looks
  like one to a semantic search.
- **Seniority drives everything together.** Years of experience shifts scores, repo
  count, stars, commit volume and leadership in the same direction — a junior with 4k
  commits and a leadership score of 95 would be noise a percentile can't survive.
- **Scores are correlated and skewed, not uniform.** Sub-scores derive from a per-
  candidate latent "ability" with per-axis noise, and the distribution is deliberately
  right-skewed (many mid, few exceptional) so percentiles spread the way they do on a
  real platform.
- **Real embeddings.** Project vectors are produced by the same `SentenceTransformer`
  the app uses, written to `candidate_project_embeddings` with the exact payload shape
  `judgment_scores.py` writes (`{candidate_id, repo_name}`), so matching reads them
  natively. No fabricated vectors.

Determinism
-----------
Seeded RNG (`--seed`, default 20260816), so re-running produces the same population and
diffs stay reviewable. Idempotent by email: existing candidates are skipped, not
duplicated.

Usage
-----
    uv run python scripts/seed_realistic_population.py            # 60 candidates
    uv run python scripts/seed_realistic_population.py -n 100
    uv run python scripts/seed_realistic_population.py --no-vectors   # skip Qdrant
"""

from __future__ import annotations

import argparse
import asyncio
import math
import random
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# This script prints box-drawing/bullet characters; the Windows console defaults to
# cp1252, which cannot encode them and would crash *after* rows were committed.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from packages.db.models.candidate import Badge, CandidateProfile, GithubSnapshot, TalentScore
from packages.db.models.user import User
from services.api.core.config import get_settings
from services.api.core.security import hash_password

DEFAULT_COUNT = 60
DEFAULT_SEED = 20260816
SEED_PASSWORD = "password123"
# Marks every row this script creates, so a re-run can find them and `--purge` can remove
# them without touching hand-made or demo accounts.
EMAIL_DOMAIN = "synthetic.trace.dev"


# --- Archetypes -------------------------------------------------------------------
#
# Each entry is a coherent slice of a real engineering population. `skills` are ordered
# core-first: the generator takes a prefix, so a junior gets the fundamentals and a
# senior accumulates the long tail, which is how real skill lists actually grow.

ARCHETYPES = [
    {
        "id": "backend_python",
        "role": "Backend Engineer",
        "skills": ["Python", "PostgreSQL", "FastAPI", "Docker", "Redis", "SQLAlchemy",
                   "Celery", "Kubernetes", "gRPC", "Kafka"],
        "languages": {"Python": 0.72, "SQL": 0.14, "Dockerfile": 0.08, "Shell": 0.06},
        "repos": [
            ("payments-ledger", "Double-entry ledger service with idempotent transfers"),
            ("task-queue", "Distributed task queue with exponential backoff and DLQ"),
            ("api-gateway", "Async API gateway with per-tenant rate limiting"),
            ("etl-pipeline", "Incremental ETL pipeline with schema-drift detection"),
            ("auth-service", "OAuth2 + JWT auth service with refresh-token rotation"),
            ("webhook-relay", "At-least-once webhook delivery with replay protection"),
        ],
        "topics": ["python", "fastapi", "postgresql", "microservices", "async"],
        "headlines": [
            "Backend engineer — distributed systems and data-heavy APIs",
            "Python backend developer focused on reliability and throughput",
            "Server-side engineer building event-driven services",
        ],
    },
    {
        "id": "frontend_react",
        "role": "Frontend Engineer",
        "skills": ["TypeScript", "React", "Next.js", "CSS", "Tailwind CSS", "Redux",
                   "Jest", "GraphQL", "Vite", "Storybook"],
        "languages": {"TypeScript": 0.68, "CSS": 0.18, "JavaScript": 0.10, "HTML": 0.04},
        "repos": [
            ("design-system", "Accessible component library with theming tokens"),
            ("dashboard-ui", "Real-time analytics dashboard with virtualized tables"),
            ("form-engine", "Schema-driven form renderer with async validation"),
            ("editor-widget", "Collaborative rich-text editor built on CRDTs"),
            ("perf-lab", "Rendering benchmarks for large React trees"),
            ("chart-kit", "Composable SVG chart primitives, zero runtime deps"),
        ],
        "topics": ["react", "typescript", "frontend", "accessibility", "design-system"],
        "headlines": [
            "Frontend engineer — design systems and rendering performance",
            "React developer with a focus on accessibility and DX",
            "UI engineer building fast, testable interfaces",
        ],
    },
    {
        "id": "ml_engineer",
        "role": "Machine Learning Engineer",
        "skills": ["Python", "PyTorch", "NumPy", "Pandas", "scikit-learn", "MLflow",
                   "Transformers", "CUDA", "Ray", "Airflow"],
        "languages": {"Python": 0.82, "Jupyter Notebook": 0.12, "C++": 0.06},
        "repos": [
            ("retrieval-augmented-qa", "RAG pipeline with hybrid BM25 + dense retrieval"),
            ("model-registry", "Experiment tracking and model promotion workflow"),
            ("feature-store", "Point-in-time correct feature store for training"),
            ("embedding-bench", "Benchmark suite comparing sentence embedding models"),
            ("distill-toolkit", "Knowledge distillation utilities for smaller serving models"),
            ("drift-monitor", "Production data-drift detection with alerting"),
        ],
        "topics": ["machine-learning", "pytorch", "nlp", "mlops", "embeddings"],
        "headlines": [
            "ML engineer — retrieval systems and model serving",
            "Machine learning engineer working on NLP and ranking",
            "Applied ML engineer bridging research and production",
        ],
    },
    {
        "id": "infra_devops",
        "role": "Infrastructure Engineer",
        "skills": ["Kubernetes", "Terraform", "AWS", "Go", "Docker", "Prometheus",
                   "Linux", "Ansible", "Helm", "eBPF"],
        "languages": {"Go": 0.54, "HCL": 0.22, "Shell": 0.16, "Python": 0.08},
        "repos": [
            ("cluster-bootstrap", "Reproducible Kubernetes bootstrap with GitOps"),
            ("cost-explorer", "Cloud cost attribution by team and workload"),
            ("secret-rotator", "Automated credential rotation with zero-downtime cutover"),
            ("chaos-harness", "Fault-injection harness for resilience testing"),
            ("log-shipper", "Low-overhead log forwarder with backpressure"),
            ("tf-modules", "Reusable Terraform modules for multi-account setups"),
        ],
        "topics": ["kubernetes", "terraform", "observability", "sre", "infrastructure"],
        "headlines": [
            "Infrastructure engineer — Kubernetes, observability, cost control",
            "SRE focused on reliability and platform tooling",
            "Platform engineer automating cloud infrastructure",
        ],
    },
    {
        "id": "mobile",
        "role": "Mobile Engineer",
        "skills": ["Kotlin", "Swift", "Android", "iOS", "Jetpack Compose", "SwiftUI",
                   "Firebase", "Room", "Combine", "Gradle"],
        "languages": {"Kotlin": 0.48, "Swift": 0.38, "Java": 0.09, "Ruby": 0.05},
        "repos": [
            ("offline-sync", "Conflict-resolving offline sync layer for mobile clients"),
            ("camera-kit", "Camera capture pipeline with on-device preprocessing"),
            ("compose-navigation", "Type-safe navigation for Jetpack Compose"),
            ("battery-profiler", "Background battery usage profiler"),
            ("push-router", "Deep-link and push notification routing library"),
            ("mobile-ci", "Fastlane-based release automation for two app stores"),
        ],
        "topics": ["android", "ios", "kotlin", "swift", "mobile"],
        "headlines": [
            "Mobile engineer — Android and iOS, offline-first apps",
            "Native mobile developer focused on performance and battery",
            "Cross-platform mobile engineer shipping consumer apps",
        ],
    },
    {
        "id": "data_engineer",
        "role": "Data Engineer",
        "skills": ["Python", "Spark", "SQL", "Airflow", "dbt", "Snowflake",
                   "Kafka", "Parquet", "BigQuery", "Databricks"],
        "languages": {"Python": 0.58, "SQL": 0.34, "Scala": 0.08},
        "repos": [
            ("warehouse-models", "dbt models with tested, documented marts"),
            ("stream-ingest", "Exactly-once Kafka to warehouse ingestion"),
            ("data-quality", "Declarative data quality checks with lineage"),
            ("backfill-tool", "Idempotent partition backfill orchestration"),
            ("schema-registry", "Avro schema evolution with compatibility gates"),
            ("cdc-connector", "Change-data-capture connector for Postgres"),
        ],
        "topics": ["data-engineering", "spark", "airflow", "dbt", "streaming"],
        "headlines": [
            "Data engineer — batch and streaming pipelines at scale",
            "Analytics engineer building trustworthy data models",
            "Data platform engineer focused on correctness and lineage",
        ],
    },
]

FIRST_NAMES = [
    "Aarav", "Ananya", "Rohan", "Priya", "Vikram", "Meera", "Arjun", "Kavya", "Ishaan",
    "Diya", "Karthik", "Sneha", "Rahul", "Nisha", "Aditya", "Pooja", "Siddharth", "Tara",
    "Manish", "Ritu", "Nikhil", "Anjali", "Varun", "Shreya", "Akash", "Divya", "Sanjay",
    "Neha", "Yash", "Lakshmi", "Omar", "Sofia", "Liam", "Emma", "Noah", "Olivia", "Ethan",
    "Mia", "Lucas", "Ava", "Daniel", "Zara", "Marcus", "Elena", "Hugo", "Ingrid",
    "Kenji", "Yuki", "Chen", "Wei", "Farah", "Tomas", "Nadia", "Pedro", "Aisha",
    "Mateo", "Leila", "Andrei", "Fatima", "Jonas",
]

LAST_NAMES = [
    "Sharma", "Patel", "Reddy", "Nair", "Iyer", "Gupta", "Mehta", "Verma", "Rao", "Joshi",
    "Desai", "Kulkarni", "Chopra", "Banerjee", "Malhotra", "Kapoor", "Bhat", "Sinha",
    "Chen", "Wang", "Kim", "Tanaka", "Silva", "Costa", "Muller", "Schmidt", "Novak",
    "Andersen", "Okafor", "Adeyemi", "Hassan", "Karim", "Rossi", "Ferrari", "Dubois",
    "Laurent", "Garcia", "Martinez", "Johnson", "Williams", "Brown", "Davis", "Miller",
    "Wilson", "Moore", "Taylor", "Anderson", "Thomas", "Petrov", "Ivanov",
]

CITIES = [
    "Bengaluru, India", "Pune, India", "Hyderabad, India", "Mumbai, India",
    "Delhi, India", "Chennai, India", "San Francisco, CA", "Seattle, WA",
    "Austin, TX", "New York, NY", "London, UK", "Berlin, Germany",
    "Amsterdam, Netherlands", "Toronto, Canada", "Singapore", "Remote",
]

COLLEGES = [
    ("Indian Institute of Technology, Bombay", "B.Tech in Computer Science"),
    ("Indian Institute of Technology, Delhi", "B.Tech in Computer Science"),
    ("Indian Institute of Technology, Madras", "B.Tech in Electrical Engineering"),
    ("BITS Pilani", "B.E. in Computer Science"),
    ("National Institute of Technology, Trichy", "B.Tech in Information Technology"),
    ("College of Engineering, Pune", "B.Tech in Computer Engineering"),
    ("Vellore Institute of Technology", "B.Tech in Computer Science"),
    ("Delhi Technological University", "B.Tech in Software Engineering"),
    ("Carnegie Mellon University", "M.S. in Computer Science"),
    ("Georgia Institute of Technology", "M.S. in Computer Science"),
    ("University of Waterloo", "B.A.Sc. in Software Engineering"),
    ("Technical University of Munich", "M.Sc. in Informatics"),
]

COMPANIES = [
    "Zerodha", "Razorpay", "Freshworks", "Postman", "Zoho", "Swiggy", "CRED",
    "Atlassian", "Stripe", "Datadog", "Cloudflare", "Elastic", "GitLab", "HashiCorp",
    "Shopify", "Twilio", "Segment", "Confluent", "Snowflake", "MongoDB",
]

# Sub-score axes, split by how strongly each tracks raw seniority. Collaboration axes
# scale with experience much more steeply than raw coding ability does — a strong junior
# codes well but has rarely led anything yet, and flattening that distinction is what
# makes synthetic score data read as fake.
CODING_AXES = ("coding_ability", "problem_solving", "technical_consistency")
CRAFT_AXES = ("project_quality", "innovation")
SOCIAL_AXES = ("community_participation", "leadership", "open_source_contributions")


def _clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))


def _skewed_ability(rng: random.Random) -> float:
    """Latent ability in 0..1, right-skewed: many competent, few exceptional.

    A uniform draw would make percentile ranks meaningless in the opposite direction —
    every decile equally populated is not what a real candidate pool looks like.
    """
    return rng.betavariate(2.4, 2.0)


def _generate_candidate(rng: random.Random, index: int) -> dict:
    archetype = ARCHETYPES[index % len(ARCHETYPES)]
    ability = _skewed_ability(rng)

    # Experience correlates with ability but is not determined by it — plenty of strong
    # juniors and average seniors exist, and a perfect correlation would be obvious.
    years = _clamp(rng.gauss(1.5 + ability * 9.0, 2.2), 0.5, 18.0)
    seniority = _clamp(years / 12.0, 0.0, 1.0)

    first, last = rng.choice(FIRST_NAMES), rng.choice(LAST_NAMES)
    slug = f"{first}.{last}".lower()
    # Index-suffixed so two draws of the same name never collide on the unique columns.
    username = f"{slug.replace('.', '-')}-{index:03d}"

    def axis_score(floor: float, ability_weight: float, seniority_weight: float, spread: float) -> float:
        """Score = a competence floor + ability and seniority contributions + noise.

        The floor matters: anyone on a hiring platform clears a basic bar, so a
        population centered near zero-plus-ability would put half the candidates in a
        range no real pool occupies. Weights are tuned so the result lands roughly
        45-90 with a right-skewed middle, matching how these scores read in the UI.
        """
        center = floor + (100.0 - floor) * (ability_weight * ability + seniority_weight * seniority)
        return round(_clamp(rng.gauss(center, spread), 20.0, 99.0), 1)

    sub_scores: dict[str, float] = {}
    # Coding tracks raw ability most directly and has the tightest spread — it is the
    # best-evidenced axis (commits, assessments) so there is less measurement noise.
    for axis in CODING_AXES:
        sub_scores[axis] = axis_score(44.0, 0.62, 0.22, 6.0)
    for axis in CRAFT_AXES:
        sub_scores[axis] = axis_score(40.0, 0.54, 0.32, 7.5)
    # Collaboration axes start lower and climb hardest with seniority: a strong junior
    # codes well but has rarely led anything yet.
    for axis in SOCIAL_AXES:
        sub_scores[axis] = axis_score(30.0, 0.38, 0.50, 9.0)

    # Not every candidate has every signal. A real population has gaps, and the
    # Evidence Confidence Score exists precisely to expose them — seeding everyone with
    # a complete set would make that feature untestable.
    missing_axes: list[str] = []
    if rng.random() < 0.22:
        missing_axes.append("hackathon_performance")
    else:
        sub_scores["hackathon_performance"] = axis_score(34.0, 0.48, 0.34, 11.0)
    if rng.random() < 0.15:
        dropped = rng.choice(SOCIAL_AXES)
        sub_scores.pop(dropped, None)
        missing_axes.append(dropped)

    present = list(sub_scores.values())
    overall = round(sum(present) / len(present), 1)

    # Repo/star/commit volume all rise with seniority. Stars are heavy-tailed: most
    # repos get almost none and a rare one takes off, which is what makes a *percentile*
    # the right normalization in the first place.
    repo_count = max(2, min(len(archetype["repos"]), int(rng.gauss(2 + seniority * 5, 1.3))))
    repos = []
    for repo_name, description in rng.sample(archetype["repos"], repo_count):
        star_roll = rng.random()
        if star_roll > 0.94:
            stars = int(rng.uniform(400, 4200) * (0.4 + seniority))
        elif star_roll > 0.72:
            stars = int(rng.uniform(40, 400) * (0.4 + seniority))
        else:
            stars = int(rng.uniform(0, 45))
        repos.append(
            {
                "name": repo_name,
                "description": description,
                "stars": stars,
                "forks": int(stars * rng.uniform(0.05, 0.3)),
                "commits": int(rng.uniform(40, 900) * (0.35 + seniority)),
                "prs": int(rng.uniform(2, 90) * (0.3 + seniority)),
                "issues": int(rng.uniform(0, 70) * (0.3 + seniority)),
                "pushed_days_ago": int(rng.expovariate(1 / 120.0)) % 900,
            }
        )

    skill_count = max(3, min(len(archetype["skills"]), int(3 + seniority * 6 + rng.uniform(-1, 1))))
    skills = [
        {
            "name": name,
            # Earlier skills are core to the archetype and read as better-evidenced.
            "source": "github_analysis" if i < skill_count - 2 else rng.choice(["resume", "verified"]),
            "confidence": round(_clamp(rng.gauss(0.88 - i * 0.03, 0.05), 0.45, 0.98), 2),
        }
        for i, name in enumerate(archetype["skills"][:skill_count])
    ]

    college, degree = rng.choice(COLLEGES)
    grad_year = datetime.now(timezone.utc).year - int(years) - rng.randint(0, 2)

    experience_entries = []
    remaining = years
    while remaining >= 1.2 and len(experience_entries) < 3:
        stint = round(min(remaining, rng.uniform(1.2, 4.0)), 1)
        experience_entries.append(
            {
                "company": rng.choice(COMPANIES),
                "title": archetype["role"] if experience_entries else f"Senior {archetype['role']}",
                "years": stint,
                "description": f"{archetype['role']} working with {', '.join(s['name'] for s in skills[:3])}.",
            }
        )
        remaining -= stint

    total_commits = sum(r["commits"] for r in repos)
    # 52 weekly buckets whose sum matches total_commits — the shape github_stats carries
    # and what commit_count_population sums.
    weekly = [max(0, int(rng.gauss(total_commits / 52.0, total_commits / 90.0))) for _ in range(52)]

    return {
        "archetype": archetype,
        "full_name": f"{first} {last}",
        "email": f"{slug}.{index:03d}@{EMAIL_DOMAIN}",
        "username": username,
        "github_username": username,
        "leetcode_username": username if rng.random() < 0.55 else None,
        "headline": rng.choice(archetype["headlines"]),
        "location": rng.choice(CITIES),
        "skills": skills,
        "education": [{"institution": college, "degree": degree, "graduation_year": grad_year}],
        "experience": experience_entries,
        "years": round(years, 1),
        "sub_scores": sub_scores,
        "missing_axes": missing_axes,
        "overall": overall,
        "repos": repos,
        "weekly_commits": weekly,
        "ability": ability,
    }


async def _seed_candidate(db: AsyncSession, spec: dict, rng: random.Random) -> CandidateProfile | None:
    existing = await db.execute(select(User).where(User.email == spec["email"]))
    if existing.scalar_one_or_none() is not None:
        return None

    user = User(
        id=uuid.uuid4(),
        email=spec["email"],
        password_hash=hash_password(SEED_PASSWORD),
        full_name=spec["full_name"],
        role="candidate",
        is_active=True,
    )
    db.add(user)
    await db.flush()

    archetype = spec["archetype"]
    now = datetime.now(timezone.utc)
    profile = CandidateProfile(
        id=uuid.uuid4(),
        user_id=user.id,
        github_username=spec["github_username"],
        leetcode_username=spec["leetcode_username"],
        username=spec["username"],
        headline=spec["headline"],
        location=spec["location"],
        skills=spec["skills"],
        experience=spec["experience"],
        education=spec["education"],
        portfolio_published=True,
        ingestion_status="idle",
        github_stats={
            "commit_activity_weekly": spec["weekly_commits"],
            "owned_repo_count": len(spec["repos"]),
            "external_contributions": int(rng.uniform(0, 40) * (0.3 + spec["ability"])),
            "pr_review_count": int(rng.uniform(0, 120) * (0.3 + spec["ability"])),
            "top_languages": archetype["languages"],
        },
        leetcode_stats=(
            {
                "total_solved": int(rng.uniform(30, 800) * (0.3 + spec["ability"])),
                "easy": int(rng.uniform(20, 250)),
                "medium": int(rng.uniform(10, 400)),
                "hard": int(rng.uniform(0, 150) * spec["ability"]),
                "contest_rating": int(rng.gauss(1500 + spec["ability"] * 700, 180)),
            }
            if spec["leetcode_username"]
            else None
        ),
        stats_refreshed_at=now,
        updated_at=now,
    )
    db.add(profile)
    await db.flush()

    for repo in spec["repos"]:
        db.add(
            GithubSnapshot(
                id=uuid.uuid4(),
                candidate_id=profile.id,
                repo_full_name=f"{spec['github_username']}/{repo['name']}",
                stars=repo["stars"],
                forks=repo["forks"],
                commit_count=repo["commits"],
                pr_count=repo["prs"],
                issue_count=repo["issues"],
                languages=archetype["languages"],
                is_fork=False,
                topics=archetype["topics"],
                pushed_at=now - timedelta(days=repo["pushed_days_ago"]),
                description=repo["description"],
                fetched_at=now,
            )
        )

    # Score history: 1-4 rows trending toward the current value, so the dashboard trend
    # line and the _MAX_SCORE_HISTORY cap both have something real to act on.
    history_len = rng.randint(1, 4)
    for step in range(history_len):
        progress = (step + 1) / history_len
        computed_at = now - timedelta(days=(history_len - step - 1) * rng.randint(14, 45))
        drift = (1 - progress) * rng.uniform(3.0, 9.0)
        db.add(
            TalentScore(
                id=uuid.uuid4(),
                candidate_id=profile.id,
                overall=round(_clamp(spec["overall"] - drift), 1),
                score_version="v2",
                renormalized_subscores=spec["missing_axes"],
                confidence_available_signals=len(spec["sub_scores"]),
                confidence_expected_signals=10,
                confidence=round(len(spec["sub_scores"]) / 10.0, 2),
                computed_at=computed_at,
                **{
                    axis: round(_clamp(value - drift), 1)
                    for axis, value in spec["sub_scores"].items()
                },
            )
        )

    # Badges only for skills with corroboration from more than one source — the same
    # rule the real badge logic applies, so seeded badges aren't more generous than earned
    # ones.
    for skill in spec["skills"][:3]:
        if skill["confidence"] >= 0.8 and rng.random() < 0.6:
            db.add(
                Badge(
                    id=uuid.uuid4(),
                    candidate_id=profile.id,
                    skill_name=skill["name"],
                    corroboration_sources=["github_analysis", "resume"],
                    awarded_at=now - timedelta(days=rng.randint(1, 200)),
                )
            )

    return profile


def _write_project_vectors(project_texts: list[tuple[str, str]]) -> int:
    """Embed each project description and upsert into `candidate_project_embeddings`.

    Uses the app's own embedder and the exact payload shape `judgment_scores.py` writes
    (`{candidate_id, repo_name}`, where `repo_name` is the full descriptive string), so
    recruitment's `batch_candidate_project_relevance` reads these natively. Blocking on
    purpose — this is a script, so it runs on the main thread rather than via to_thread.
    """
    from qdrant_client.http import models as qmodels

    from services.agents.recruitment.tools.embeddings import (
        CANDIDATE_PROJECT_EMBEDDINGS_COLLECTION,
        embed_texts,
        get_qdrant_client,
    )
    from services.api.core.qdrant import ensure_payload_indexes

    client = get_qdrant_client()
    texts = [text for _, text in project_texts]
    vectors = embed_texts(texts)

    if not client.collection_exists(CANDIDATE_PROJECT_EMBEDDINGS_COLLECTION):
        client.create_collection(
            collection_name=CANDIDATE_PROJECT_EMBEDDINGS_COLLECTION,
            vectors_config=qmodels.VectorParams(
                size=len(vectors[0]), distance=qmodels.Distance.COSINE
            ),
        )
    # Idempotent, and the filter this collection is always queried by.
    ensure_payload_indexes(
        client, CANDIDATE_PROJECT_EMBEDDINGS_COLLECTION, {"candidate_id": "keyword"}
    )

    # Deterministic point ids (uuid5 over candidate+repo) so re-running updates the same
    # points instead of duplicating the corpus, which would skew every novelty score.
    client.upsert(
        CANDIDATE_PROJECT_EMBEDDINGS_COLLECTION,
        points=[
            qmodels.PointStruct(
                id=str(uuid.uuid5(uuid.NAMESPACE_URL, f"proj:{candidate_id}:{text}")),
                vector=vector,
                payload={"candidate_id": candidate_id, "repo_name": text},
            )
            for (candidate_id, text), vector in zip(project_texts, vectors)
        ],
    )
    return len(vectors)


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("-n", "--count", type=int, default=DEFAULT_COUNT)
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    parser.add_argument("--no-vectors", action="store_true", help="Skip Qdrant embedding")
    args = parser.parse_args()

    rng = random.Random(args.seed)
    settings = get_settings()
    engine = create_async_engine(settings.database_url, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    print(f"Generating {args.count} candidates (seed={args.seed})...")

    created = 0
    skipped = 0
    project_texts: list[tuple[str, str]] = []

    async with session_factory() as db:
        for index in range(args.count):
            spec = _generate_candidate(rng, index)
            profile = await _seed_candidate(db, spec, rng)
            if profile is None:
                skipped += 1
                continue
            created += 1
            for repo in spec["repos"]:
                # Same "{repo_full_name}: {languages}"-style descriptive string the
                # ingestion path embeds — description included so semantic search has
                # real signal rather than a bare repo slug.
                text = (
                    f"{spec['github_username']}/{repo['name']}: {repo['description']}. "
                    f"Languages: {', '.join(spec['archetype']['languages'])}."
                )
                project_texts.append((str(profile.id), text))

        await db.commit()

    await engine.dispose()
    print(f"  created {created}, skipped {skipped} (already present)")

    if args.no_vectors:
        print("  skipping vector write (--no-vectors)")
    elif not project_texts:
        print("  no new projects to embed")
    else:
        print(f"Embedding {len(project_texts)} projects (first run loads the model, ~30s)...")
        try:
            written = _write_project_vectors(project_texts)
            print(f"  upserted {written} vectors into candidate_project_embeddings")
        except Exception as exc:  # noqa: BLE001 - vectors are optional; rows are already committed
            print(f"  WARNING: vector write failed ({exc})")
            print("  Rows are committed; re-run with Qdrant reachable to backfill vectors.")

    print("\nDone. Sign in with any generated address, password:", SEED_PASSWORD)


if __name__ == "__main__":
    asyncio.run(main())

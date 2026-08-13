"""Database & Vector DB Seeding Script.

Seeds the PostgreSQL relational database and Qdrant vector database with rich demo data
for candidates, job postings, assessments, hackathons, and course catalogs.

Usage:
    python scripts/seed_db.py
"""

import asyncio
import logging
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

# Repo root on sys.path so `packages`/`services` import when this is run directly as
# `python scripts/seed_db.py`, without needing PYTHONPATH to be set by the caller.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from packages.db.models import (
    CandidateProfile,
    CourseCatalogEntry,
    Hackathon,
    HackathonTeam,
    Job,
    Organization,
    TalentScore,
    User,
)
from services.api.core.db import async_session

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("overwatch.seed")


async def seed_relational_database(session: AsyncSession):
    logger.info("Seeding relational database tables...")

    # 1. Organization
    org_stmt = select(Organization).where(Organization.name == "Demo Tech Corp")
    org_res = await session.execute(org_stmt)
    org = org_res.scalar_one_or_none()
    if not org:
        org = Organization(
            id=uuid.uuid4(),
            name="Demo Tech Corp",
            domain="overwatch.ai",
            org_type="company",
            created_at=datetime.now(timezone.utc),
        )
        session.add(org)
        await session.flush()
        logger.info("Created Organization: Demo Tech Corp")

    # 2. Demo Users
    user_data = [
        ("user_candidate_demo", "demo_candidate@overwatch.ai", "candidate", "Alex Rivera"),
        ("user_recruiter_demo", "demo_recruiter@overwatch.ai", "recruiter", "Sarah Chen"),
        ("user_organizer_demo", "demo_organizer@overwatch.ai", "organizer", "Marcus Vance"),
        ("user_judge_demo", "demo_judge@overwatch.ai", "judge", "Dr. Elena Rostova"),
        ("user_admin_demo", "demo_admin@overwatch.ai", "admin", "System Administrator"),
    ]

    users_map = {}
    from services.api.core.security import hash_password

    for clerk_id, email, role, full_name in user_data:
        user_stmt = select(User).where(User.email == email)
        u_res = await session.execute(user_stmt)
        user = u_res.scalar_one_or_none()
        if not user:
            user = User(
                id=uuid.uuid4(),
                password_hash=hash_password("password123"),
                email=email,
                role=role,
                full_name=full_name,
                organization_id=org.id,
                created_at=datetime.now(timezone.utc),
            )
            session.add(user)
            await session.flush()
            logger.info("Created User: %s (%s)", full_name, role)
        users_map[role] = user

    candidate_user = users_map["candidate"]
    recruiter_user = users_map["recruiter"]

    # 3. Candidate Profile
    prof_stmt = select(CandidateProfile).where(CandidateProfile.user_id == candidate_user.id)
    p_res = await session.execute(prof_stmt)
    profile = p_res.scalar_one_or_none()
    if not profile:
        profile = CandidateProfile(
            id=uuid.uuid4(),
            user_id=candidate_user.id,
            github_username="alexrivera-demo",
            username="alexrivera",
            headline="Senior Fullstack & AI Engineer passionate about distributed systems and LangGraph agents.",
            skills=[
                {"name": "Python", "source": "github_analysis", "confidence": 0.95},
                {"name": "TypeScript", "source": "github_analysis", "confidence": 0.90},
                {"name": "FastAPI", "source": "github_analysis", "confidence": 0.88},
                {"name": "React", "source": "github_analysis", "confidence": 0.85},
                {"name": "LangGraph", "source": "verified", "confidence": 0.92},
            ],
            portfolio_published=True,
            updated_at=datetime.now(timezone.utc),
        )
        session.add(profile)
        await session.flush()

        # Add Talent Score
        score = TalentScore(
            id=uuid.uuid4(),
            candidate_id=profile.id,
            overall=88.5,
            score_version="v1",
            coding_ability=92.0,
            technical_consistency=88.0,
            community_participation=85.0,
            leadership=80.0,
            project_quality=90.0,
            innovation=86.0,
            renormalized_subscores=["problem_solving"],
            computed_at=datetime.now(timezone.utc),
        )
        session.add(score)
        logger.info("Created Candidate Profile & Talent Score for Alex Rivera")

    # 4. Job Postings
    jobs_data = [
        ("Senior Fullstack AI Engineer", "Build agentic workflows and React control-planes.", ["Python", "FastAPI", "TypeScript", "React"], 4, True, "Remote"),
        ("Backend Systems Architect", "High-throughput PostgreSQL and distributed microservices.", ["Python", "PostgreSQL", "Docker", "Redis"], 6, True, "New York, NY"),
    ]

    for title, desc, req_skills, min_exp, is_remote, loc in jobs_data:
        j_stmt = select(Job).where(Job.title == title)
        j_res = await session.execute(j_stmt)
        if not j_res.scalar_one_or_none():
            job = Job(
                id=uuid.uuid4(),
                posted_by_user_id=recruiter_user.id,
                organization_id=org.id,
                title=title,
                description=desc,
                required_skills=req_skills,
                min_experience_years=min_exp,
                is_remote=is_remote,
                location=loc,
                created_at=datetime.now(timezone.utc),
            )
            session.add(job)
            logger.info("Created Job Posting: %s", title)

    # 5. Course Catalog Entries
    course_data = [
        ("coursera", "Advanced LangGraph & Multi-Agent Architecture", "https://coursera.org/langgraph", ["Python", "LangGraph"], "intermediate"),
        ("vendor", "Production FastAPI & Async Architectures", "https://udemy.com/fastapi", ["Python", "FastAPI"], "advanced"),
    ]

    for provider, title, url, skill_tags, level in course_data:
        c_stmt = select(CourseCatalogEntry).where(CourseCatalogEntry.title == title)
        c_res = await session.execute(c_stmt)
        if not c_res.scalar_one_or_none():
            course = CourseCatalogEntry(
                id=uuid.uuid4(),
                provider=provider,
                title=title,
                url=url,
                skill_tags=skill_tags,
                level=level,
                is_free=False,
                created_at=datetime.now(timezone.utc),
            )
            session.add(course)
            logger.info("Created Course Catalog Entry: %s", title)

    # 6. Hackathon Event
    h_stmt = select(Hackathon).where(Hackathon.name == "Global AI Hackathon 2026")
    h_res = await session.execute(h_stmt)
    hackathon = h_res.scalar_one_or_none()
    if not hackathon:
        hackathon = Hackathon(
            id=uuid.uuid4(),
            organizer_user_id=users_map["organizer"].id,
            organizer_org_id=org.id,
            name="Global AI Hackathon 2026",
            tracks=["Full-Stack AI", "Agentic Systems"],
            ingestion_mode="direct",
            status="active",
            created_at=datetime.now(timezone.utc),
        )
        session.add(hackathon)
        await session.flush()

        # Add Hackathon Team
        team = HackathonTeam(
            id=uuid.uuid4(),
            hackathon_id=hackathon.id,
            team_name="CyberAgents",
            created_at=datetime.now(timezone.utc),
        )
        session.add(team)
        logger.info("Created Hackathon Event & Team: CyberAgents")

    await session.commit()
    logger.info("Relational database seeding completed successfully!")


async def seed_vector_database():
    logger.info("Seeding Qdrant vector database...")
    try:
        from qdrant_client import QdrantClient
        from qdrant_client.http import models

        from services.api.core.config import get_settings

        from scripts.ensure_qdrant_indexes import COLLECTION_PAYLOAD_INDEXES
        from services.api.core.qdrant import ensure_payload_indexes

        settings = get_settings()
        client = QdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key or None)

        # Names taken from `COLLECTION_PAYLOAD_INDEXES`, which mirrors what the app
        # actually reads and writes. This list previously named `slide_embeddings` and
        # `candidate_skill_vectors` — neither of which any code path uses. The real
        # collections (`presentation_slide_embeddings`, `candidate_project_embeddings`,
        # `job_description_embeddings`) were absent, so seeding created two empty
        # collections nothing queried and pre-created none of the ones that matter.
        for col, payload_fields in COLLECTION_PAYLOAD_INDEXES.items():
            if not client.collection_exists(col):
                client.create_collection(
                    collection_name=col,
                    vectors_config=models.VectorParams(size=1024, distance=models.Distance.COSINE),
                )
                logger.info("Created Qdrant vector collection: %s", col)
            # Indexes the filtered fields up front so the first real search is already
            # fast, and repairs collections created before payload indexing existed.
            ensure_payload_indexes(client, col, payload_fields)

        logger.info("Qdrant vector database seeding completed successfully!")
    except Exception as e:
        logger.warning("Vector DB seeding skipped or degraded: %s", e)


async def main():
    async with async_session() as session:
        await seed_relational_database(session)
    await seed_vector_database()


if __name__ == "__main__":
    asyncio.run(main())

"""career guidance tables (FR-4)

Revision ID: a333d4c53bd0
Revises: a76c622e4c08
Create Date: 2026-07-29 16:40:00.000000

Hand-written (not `alembic revision --autogenerate`) — this worktree doesn't carry a
`.env`/live DB connection, and other agents are adding migrations concurrently on
`44fd41ed1de0` right now, so this may need `down_revision` rebased onto whatever new
head lands first. Mirrors `bfa4df0973c6_candidate_intelligence_tables.py`'s generated
style so a future `alembic revision --autogenerate` diffs cleanly against it.
"""
import json
import uuid
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a333d4c53bd0'
down_revision: Union[str, Sequence[str], None] = 'a76c622e4c08'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# `skill_tags` is passed as a JSON-encoded string bound to a `::jsonb`-cast text() SQL
# param, not via op.bulk_insert()'s literal-value rendering — the postgresql JSONB
# dialect has no literal renderer for a raw Python list, which breaks Alembic's
# offline/--sql mode (online mode's real parameter binding would've been fine either
# way, but this way both work).
_INSERT_COURSE_SQL = sa.text(
    """
    INSERT INTO course_catalog (id, provider, title, url, skill_tags, level, estimated_hours, is_free)
    VALUES (CAST(:id AS UUID), :provider, :title, :url, CAST(:skill_tags AS JSONB), :level, :estimated_hours, :is_free)
    """
)


def _course(provider, title, url, skill_tags, level, estimated_hours, is_free):
    return {
        "id": str(uuid.uuid4()),
        "provider": provider,
        "title": title,
        "url": url,
        "skill_tags": json.dumps(skill_tags),
        "level": level,
        "estimated_hours": estimated_hours,
        "is_free": is_free,
    }


# Curated seed rows (doc 01 §8: "maintained static table ... not scraped live"). Not
# exhaustive over every skill in role_taxonomy.py — enough coverage across the most
# common gaps to prove the matching path end to end; extend freely via a follow-up
# data migration, never by scraping.
_COURSE_CATALOG_SEED = [
    _course("coursera", "Python for Everybody Specialization", "https://www.coursera.org/specializations/python", ["python"], "beginner", 60, True),
    _course("freecodecamp", "Scientific Computing with Python", "https://www.freecodecamp.org/learn/scientific-computing-with-python/", ["python"], "beginner", 40, True),
    _course("coursera", "Databases and SQL for Data Science with Python", "https://www.coursera.org/learn/sql-data-science", ["sql"], "beginner", 20, True),
    _course("freecodecamp", "Relational Database Certification", "https://www.freecodecamp.org/learn/relational-database/", ["sql", "postgresql"], "beginner", 30, True),
    _course("coursera", "API Design and Fundamentals of Google APIs", "https://www.coursera.org/learn/api-design-fundamentals-google", ["rest api design"], "intermediate", 15, True),
    _course("vendor", "Docker Certified Associate (DCA) Prep Course", "https://training.docker.com/", ["docker"], "intermediate", 25, False),
    _course("coursera", "Software Design and Architecture Specialization", "https://www.coursera.org/specializations/software-design-architecture", ["system design"], "advanced", 80, True),
    _course("freecodecamp", "Git and GitHub for Beginners", "https://www.freecodecamp.org/news/git-and-github-for-beginners/", ["git"], "beginner", 8, True),
    _course("coursera", "Caching and Content Delivery Networks", "https://www.coursera.org/learn/caching-cdn", ["caching"], "intermediate", 12, True),
    _course("vendor", "Apache Kafka for Event-Driven Architectures", "https://developer.confluent.io/courses/", ["message queues"], "intermediate", 20, True),
    _course("freecodecamp", "Quality Assurance with Testing", "https://www.freecodecamp.org/learn/quality-assurance/", ["unit testing", "testing"], "beginner", 30, True),
    _course("freecodecamp", "JavaScript Algorithms and Data Structures", "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/", ["javascript"], "beginner", 100, True),
    _course("coursera", "Programming with TypeScript", "https://www.coursera.org/learn/programming-with-typescript", ["typescript"], "intermediate", 15, True),
    _course("freecodecamp", "Front End Development Libraries (React)", "https://www.freecodecamp.org/learn/front-end-development-libraries/", ["react"], "intermediate", 60, True),
    _course("coursera", "React Native Specialization", "https://www.coursera.org/specializations/react-native", ["react native"], "intermediate", 40, True),
    _course("freecodecamp", "Responsive Web Design (HTML/CSS)", "https://www.freecodecamp.org/learn/2022/responsive-web-design/", ["css", "html"], "beginner", 50, True),
    _course("coursera", "Web Accessibility Specialization", "https://www.coursera.org/specializations/web-accessibility", ["accessibility"], "intermediate", 20, True),
    _course("vendor", "Web Performance Fundamentals", "https://web.dev/learn/performance/", ["web performance"], "intermediate", 15, True),
    _course("coursera", "State Management with Redux", "https://www.coursera.org/projects/redux-state-management", ["state management"], "intermediate", 10, True),
    _course("coursera", "IBM Data Science Professional Certificate", "https://www.coursera.org/professional-certificates/ibm-data-science", ["pandas", "machine learning", "jupyter"], "beginner", 120, True),
    _course("coursera", "Machine Learning Specialization (Andrew Ng)", "https://www.coursera.org/specializations/machine-learning-introduction", ["machine learning", "scikit-learn"], "intermediate", 90, True),
    _course("coursera", "Statistics with Python Specialization", "https://www.coursera.org/specializations/statistics-with-python", ["statistics"], "intermediate", 60, True),
    _course("coursera", "Data Visualization with Python", "https://www.coursera.org/learn/python-for-data-visualization", ["data visualization"], "beginner", 20, True),
    _course("coursera", "A/B Testing and Experiment Design", "https://www.coursera.org/learn/ab-testing", ["experiment design"], "intermediate", 12, True),
    _course("vendor", "PyTorch for Deep Learning Bootcamp", "https://pytorch.org/tutorials/", ["pytorch"], "intermediate", 50, True),
    _course("vendor", "MLOps: Machine Learning Operations Specialization", "https://www.coursera.org/specializations/mlops-machine-learning-duke", ["mlops"], "advanced", 40, True),
    _course("coursera", "Distributed Systems Specialization", "https://www.coursera.org/specializations/cloud-computing", ["distributed systems", "cloud computing"], "advanced", 70, True),
    _course("vendor", "Feature Engineering for Machine Learning", "https://www.udacity.com/course/feature-engineering", ["feature engineering", "model evaluation"], "intermediate", 25, False),
    _course("vendor", "Kubernetes Certified Application Developer (CKAD) Prep", "https://kubernetes.io/training/", ["kubernetes"], "advanced", 40, False),
    _course("freecodecamp", "DevOps and CI/CD Pipelines", "https://www.freecodecamp.org/news/devops-ci-cd-pipeline/", ["ci/cd"], "intermediate", 20, True),
    _course("vendor", "HashiCorp Certified: Terraform Associate", "https://developer.hashicorp.com/terraform/tutorials/certification-associate-tutorials", ["terraform"], "intermediate", 30, True),
    _course("coursera", "AWS Fundamentals Specialization", "https://www.coursera.org/specializations/aws-fundamentals", ["aws", "cloud computing"], "beginner", 25, True),
    _course("freecodecamp", "Linux Command Line Basics", "https://www.freecodecamp.org/news/command-line-for-beginners/", ["linux", "bash scripting"], "beginner", 15, True),
    _course("vendor", "Prometheus and Grafana Monitoring Fundamentals", "https://prometheus.io/docs/introduction/overview/", ["monitoring"], "intermediate", 15, True),
    _course("coursera", "Computer Networking Fundamentals", "https://www.coursera.org/learn/computer-networking", ["networking"], "beginner", 20, True),
    _course("vendor", "Kotlin for Android Developers", "https://developer.android.com/courses/kotlin-android/kotlin-android", ["kotlin"], "beginner", 40, True),
    _course("vendor", "Swift and SwiftUI Essentials", "https://developer.apple.com/tutorials/swiftui", ["swift"], "beginner", 40, True),
    _course("vendor", "Mobile UI/UX Design Principles", "https://www.udacity.com/course/ux-design-for-mobile-developers", ["mobile ui design"], "beginner", 15, False),
    _course("vendor", "Mobile App Performance Tuning", "https://developer.android.com/topic/performance", ["app performance"], "advanced", 15, True),
    _course("coursera", "IBM Cybersecurity Analyst Professional Certificate", "https://www.coursera.org/professional-certificates/ibm-cybersecurity-analyst", ["security fundamentals", "incident response", "compliance"], "beginner", 100, True),
    _course("vendor", "Offensive Security Certified Professional (OSCP) Prep", "https://www.offsec.com/courses/pen-200/", ["penetration testing"], "advanced", 90, False),
    _course("coursera", "Applied Cryptography", "https://www.coursera.org/learn/crypto", ["cryptography"], "advanced", 30, True),
    _course("vendor", "Cloud Security Fundamentals", "https://www.sans.org/cyber-security-courses/cloud-security-fundamentals/", ["cloud security", "threat modeling"], "intermediate", 20, False),
    _course("vendor", "FinOps: Cloud Cost Optimization Foundations", "https://www.finops.org/training/", ["cost optimization"], "intermediate", 10, True),
    _course("coursera", "Effective Communication for Engineers", "https://www.coursera.org/learn/technical-writing", ["communication"], "beginner", 10, True),
]


def upgrade() -> None:
    """Upgrade schema."""
    # ### course_catalog (FR-4.2 / FR-4.5 static catalog) ###
    op.create_table(
        'course_catalog',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('provider', sa.Text(), nullable=False),
        sa.Column('title', sa.Text(), nullable=False),
        sa.Column('url', sa.Text(), nullable=False),
        sa.Column('skill_tags', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('level', sa.Text(), nullable=True),
        sa.Column('estimated_hours', sa.Integer(), nullable=True),
        sa.Column('is_free', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint("provider IN ('coursera','freecodecamp','vendor')", name='ck_course_catalog_provider'),
        sa.CheckConstraint(
            "level IS NULL OR level IN ('beginner','intermediate','advanced')",
            name='ck_course_catalog_level',
        ),
        sa.PrimaryKeyConstraint('id'),
    )

    # ### career_recommendations (FR-4 output, doc/multi-agent-architecture/01 §7) ###
    op.create_table(
        'career_recommendations',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('candidate_id', sa.UUID(), nullable=False),
        sa.Column('target_role', sa.Text(), nullable=True),
        sa.Column('skill_gaps', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('recommended_courses', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('roadmap', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('salary_estimate_low', sa.Integer(), nullable=True),
        sa.Column('salary_estimate_high', sa.Integer(), nullable=True),
        sa.Column('salary_rationale', sa.Text(), nullable=True),
        sa.Column('generated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['candidate_id'], ['candidate_profiles.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        'idx_career_recs_candidate_time', 'career_recommendations', ['candidate_id', 'generated_at'], unique=False
    )

    for row in _COURSE_CATALOG_SEED:
        op.execute(_INSERT_COURSE_SQL.bindparams(**row))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('idx_career_recs_candidate_time', table_name='career_recommendations')
    op.drop_table('career_recommendations')
    op.drop_table('course_catalog')

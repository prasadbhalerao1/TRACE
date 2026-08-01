#!/usr/bin/env python3
"""Seed database with sample data for all 5 roles."""

import asyncio
import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from packages.db.models.base import Base
from packages.db.models.user import User
from services.api.core.security import hash_password
from services.api.core.config import get_settings

settings = get_settings()


async def seed_db():
    """Create all tables and seed with sample data."""
    engine = create_async_engine(settings.database_url, echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Check if data already exists
        from sqlalchemy import select, count
        result = await session.execute(select(count(User.id)))
        user_count = result.scalar()
        if user_count > 0:
            print("✓ Database already seeded, skipping...")
            await engine.dispose()
            return

        # Define 5 roles and sample users
        roles_data = [
            {
                "role": "contributor",
                "users": [
                    {"email": "alice@example.com", "password": "password123", "full_name": "Alice Chen", "username": "alice_dev"},
                    {"email": "bob@example.com", "password": "password123", "full_name": "Bob Wilson", "username": "bob_coder"},
                    {"email": "charlie@example.com", "password": "password123", "full_name": "Charlie Davis", "username": "charlie_dev"},
                ]
            },
            {
                "role": "recruiter",
                "users": [
                    {"email": "recruiter1@company.com", "password": "password123", "full_name": "Sarah Johnson", "username": "sarah_recruiter"},
                    {"email": "recruiter2@company.com", "password": "password123", "full_name": "Mike Chen", "username": "mike_recruiter"},
                ]
            },
            {
                "role": "organizer",
                "users": [
                    {"email": "organizer@hackathon.io", "password": "password123", "full_name": "Emma Wilson", "username": "emma_organizer"},
                ]
            },
            {
                "role": "judge",
                "users": [
                    {"email": "judge1@hackathon.io", "password": "password123", "full_name": "Dr. Robert Smith", "username": "robert_judge"},
                    {"email": "judge2@hackathon.io", "password": "password123", "full_name": "Prof. Lisa Anderson", "username": "lisa_judge"},
                ]
            },
            {
                "role": "admin",
                "users": [
                    {"email": "admin@dataaxle.io", "password": "password123", "full_name": "Admin User", "username": "admin"},
                ]
            },
        ]

        # Create users
        users_created = []
        for role_data in roles_data:
            role = role_data["role"]
            for user_data in role_data["users"]:
                user = User(
                    id=uuid.uuid4(),
                    email=user_data["email"],
                    password_hash=hash_password(user_data["password"]),
                    full_name=user_data["full_name"],
                    username=user_data["username"],
                    role=role,
                    is_active=True,
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc),
                )
                session.add(user)
                users_created.append((role, user_data["email"], user_data["password"]))

        await session.commit()

        # Print login credentials
        print("\n" + "="*70)
        print("DATABASE SEEDED SUCCESSFULLY")
        print("="*70)
        print("\n📋 SAMPLE LOGIN CREDENTIALS (5 ROLES):\n")

        current_role = None
        for role, email, password in users_created:
            if role != current_role:
                print(f"\n🔐 {role.upper()}")
                print("-" * 70)
                current_role = role
            print(f"  Email:    {email}")
            print(f"  Password: {password}")

        print("\n" + "="*70)
        print("\n✅ All 5 roles seeded:")
        print("   1. contributor — project submissions, interviews, assessments")
        print("   2. recruiter — job posting, candidate matching, hiring pipeline")
        print("   3. organizer — hackathon event management, scoring config")
        print("   4. judge — hackathon submissions evaluation, scoring")
        print("   5. admin — platform administration, fraud review")
        print("\n" + "="*70 + "\n")

        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed_db())

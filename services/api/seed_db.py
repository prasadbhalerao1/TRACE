#!/usr/bin/env python3
"""Seed database with sample data for all 5 roles."""

import asyncio
import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, func

from packages.db.models.base import Base
from packages.db.models.user import User
from packages.db.models.candidate import CandidateProfile
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
        # Define 5 roles and sample users matching system schema
        roles_data = [
            {
                "role": "candidate",
                "label": "Contributor / Candidate",
                "users": [
                    {"email": "alice@example.com", "password": "password123", "full_name": "Alice Chen", "username": "alice_dev"},
                    {"email": "bob@example.com", "password": "password123", "full_name": "Bob Wilson", "username": "bob_coder"},
                    {"email": "charlie@example.com", "password": "password123", "full_name": "Charlie Davis", "username": "charlie_dev"},
                ]
            },
            {
                "role": "recruiter",
                "label": "Recruiter",
                "users": [
                    {"email": "recruiter1@company.com", "password": "password123", "full_name": "Sarah Johnson", "username": "sarah_recruiter"},
                    {"email": "recruiter2@company.com", "password": "password123", "full_name": "Mike Chen", "username": "mike_recruiter"},
                ]
            },
            {
                "role": "organizer",
                "label": "Organizer",
                "users": [
                    {"email": "organizer@hackathon.io", "password": "password123", "full_name": "Emma Wilson", "username": "emma_organizer"},
                ]
            },
            {
                "role": "judge",
                "label": "Judge",
                "users": [
                    {"email": "judge1@hackathon.io", "password": "password123", "full_name": "Dr. Robert Smith", "username": "robert_judge"},
                    {"email": "judge2@hackathon.io", "password": "password123", "full_name": "Prof. Lisa Anderson", "username": "lisa_judge"},
                ]
            },
            {
                "role": "admin",
                "label": "Admin",
                "users": [
                    {"email": "admin@dataaxle.io", "password": "password123", "full_name": "Admin User", "username": "admin"},
                ]
            },
        ]

        # Create or update users
        users_created = []
        for role_data in roles_data:
            role = role_data["role"]
            label = role_data["label"]
            for user_data in role_data["users"]:
                email = user_data["email"]
                pwd_hash = hash_password(user_data["password"])
                
                stmt = select(User).where(User.email == email)
                res = await session.execute(stmt)
                user = res.scalar_one_or_none()

                if user:
                    user.password_hash = pwd_hash
                    user.full_name = user_data["full_name"]
                    user.role = role
                    user.is_active = True
                else:
                    user_id = uuid.uuid4()
                    user = User(
                        id=user_id,
                        email=email,
                        password_hash=pwd_hash,
                        full_name=user_data["full_name"],
                        role=role,
                        is_active=True,
                        created_at=datetime.now(timezone.utc),
                    )
                    session.add(user)

                    if role == "candidate" and user_data.get("username"):
                        profile_stmt = select(CandidateProfile).where(CandidateProfile.user_id == user_id)
                        p_res = await session.execute(profile_stmt)
                        if not p_res.scalar_one_or_none():
                            profile = CandidateProfile(
                                user_id=user_id,
                                username=user_data["username"],
                                portfolio_published=True,
                            )
                            session.add(profile)

                users_created.append((label, email, user_data["password"], user_data["full_name"]))

        await session.commit()

        # Print login credentials
        print("\n" + "="*70)
        print("DATABASE SEEDED SUCCESSFULLY")
        print("="*70)
        print("\nSAMPLE LOGIN CREDENTIALS (5 ROLES):\n")

        current_label = None
        for label, email, password, full_name in users_created:
            if label != current_label:
                print(f"\nROLE: {label.upper()}")
                print("-" * 70)
                current_label = label
            print(f"  User:     {full_name}")
            print(f"  Email:    {email}")
            print(f"  Password: {password}\n")

        print("="*70)
        print("\nAll 5 roles seeded with initial credentials!")
        print("="*70 + "\n")

        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed_db())


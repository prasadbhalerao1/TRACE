from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from services.api.core.config import get_settings

settings = get_settings()

_connect_args = {}
if settings.database_ssl_required:
    # asyncpg's `ssl` kwarg, not libpq's `sslmode` query param (asyncpg doesn't parse that).
    # statement_cache_size=0 avoids "prepared statement already exists" errors against
    # Neon's pooled (PgBouncer-style) endpoint.
    _connect_args = {"ssl": True, "statement_cache_size": 0}

engine = create_async_engine(settings.database_url, connect_args=_connect_args)
async_session = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session

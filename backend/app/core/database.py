from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from arq.connections import ArqRedis, create_pool
from arq.connections import RedisSettings
from app.core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=40,
    max_overflow=20,
    pool_timeout=30,
    pool_recycle=3600,
    pool_pre_ping=True,
)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

_arq_pool: ArqRedis | None = None


async def arq_pool() -> ArqRedis:
    global _arq_pool
    if _arq_pool is None:
        _arq_pool = await create_pool(
            RedisSettings.from_dsn(settings.REDIS_URL),
            max_tries=1,
        )
    return _arq_pool


async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

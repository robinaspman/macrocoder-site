import json
from datetime import datetime, timezone, timedelta
from typing import Any
import redis.asyncio as redis
from app.core.config import settings

_client: redis.Redis | None = None


async def get_redis() -> redis.Redis:
    global _client
    if _client is None:
        _client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    return _client


async def cache_get(key: str) -> Any | None:
    r = await get_redis()
    data = await r.get(f"mc:{key}")
    if data is None:
        return None
    return json.loads(data)


async def cache_set(key: str, value: Any, ttl_seconds: int = 3600):
    r = await get_redis()
    await r.set(f"mc:{key}", json.dumps(value, default=str), ex=ttl_seconds)


async def cache_delete(key: str):
    r = await get_redis()
    await r.delete(f"mc:{key}")


async def cache_get_or_set(key: str, factory, ttl_seconds: int = 3600) -> Any:
    cached = await cache_get(key)
    if cached is not None:
        return cached
    value = await factory()
    await cache_set(key, value, ttl_seconds)
    return value

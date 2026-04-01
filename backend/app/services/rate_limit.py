import time
import hashlib
import json
import redis
from datetime import datetime, timezone
from typing import Any
from app.core.config import settings

MAX_REQUESTS_PER_MINUTE = settings.RATE_LIMIT_PER_MINUTE
MAX_REVIEWS_PER_SESSION = 5
MAX_TOKENS_PER_REVIEW = 4096
MAX_TURNS_PER_REVIEW = 3
COOLDOWN_SECONDS = 30

_client: redis.Redis | None = None


def _get_redis() -> redis.Redis:
    global _client
    if _client is None:
        _client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    return _client


def check_rate_limit(session_id: str) -> None:
    """Check per-session rate limit using Redis. Raises ValueError if exceeded."""
    try:
        r = _get_redis()
    except Exception:
        return

    now = time.time()
    key = f"rl:{session_id}"
    cooldown_key = f"rl_cooldown:{session_id}"

    pipe = r.pipeline()
    pipe.zremrangebyscore(key, 0, now - 60)
    pipe.zcard(key)
    pipe.ttl(cooldown_key)
    results = pipe.execute()

    request_count = results[1]
    cooldown_ttl = results[2]

    if cooldown_ttl and cooldown_ttl > 0:
        raise ValueError(f"Please wait {cooldown_ttl}s before next review.")

    if request_count >= MAX_REQUESTS_PER_MINUTE:
        raise ValueError("Rate limit exceeded. Please wait before trying again.")

    pipe = r.pipeline()
    pipe.zadd(key, {str(now): now})
    pipe.expire(key, 60)
    pipe.setex(cooldown_key, COOLDOWN_SECONDS, "1")
    pipe.execute()


def check_session_cap(session_id: str) -> None:
    """Check per-session review cap using Redis."""
    try:
        r = _get_redis()
    except Exception:
        return

    key = f"session_cap:{session_id}"
    current = r.get(key)
    if current and int(current) >= MAX_REVIEWS_PER_SESSION:
        raise ValueError("Daily review limit reached. Try again tomorrow.")

    pipe = r.pipeline()
    pipe.incr(key)
    pipe.expire(key, 86400)
    pipe.execute()


def generate_quote_id(
    analysis_id: str,
    assumptions: list[str],
    milestones: list[str],
    price_range: tuple[str, str],
    timestamp: datetime | None = None,
) -> dict[str, Any]:
    """Generate a signed, immutable quote record."""
    ts = timestamp or datetime.now(timezone.utc)

    payload = {
        "analysis_id": analysis_id,
        "assumptions": assumptions,
        "milestones": milestones,
        "price_range": {"min": price_range[0], "max": price_range[1]},
        "timestamp": ts.isoformat(),
    }

    payload_str = json.dumps(payload, sort_keys=True)
    signature = hashlib.sha256(
        f"{payload_str}:{settings.SECRET_KEY}".encode()
    ).hexdigest()[:16]

    return {
        "quote_id": f"MC-{ts.strftime('%Y%m%d')}-{signature}",
        "payload": payload,
        "signature": signature,
        "created_at": ts.isoformat(),
    }


def verify_quote(quote_id: str, payload: dict, signature: str) -> bool:
    """Verify a quote hasn't been tampered with."""
    payload_str = json.dumps(payload, sort_keys=True)
    expected = hashlib.sha256(
        f"{payload_str}:{settings.SECRET_KEY}".encode()
    ).hexdigest()[:16]
    return expected == signature

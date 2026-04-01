import time
import hashlib
import json
from datetime import datetime, timezone
from typing import Any
from app.core.config import settings

# In-memory rate limit storage (use Redis in production)
_request_counts: dict[str, list[float]] = {}
_session_caps: dict[str, int] = {}

MAX_REQUESTS_PER_MINUTE = settings.RATE_LIMIT_PER_MINUTE
MAX_REVIEWS_PER_SESSION = 5
MAX_TOKENS_PER_REVIEW = 4096
MAX_TURNS_PER_REVIEW = 3
COOLDOWN_SECONDS = 30

_last_request: dict[str, float] = {}


def check_rate_limit(session_id: str) -> None:
    """Check per-session rate limit. Raises ValueError if exceeded."""
    now = time.time()

    # Clean old entries
    if session_id in _request_counts:
        _request_counts[session_id] = [
            t for t in _request_counts[session_id] if now - t < 60
        ]
    else:
        _request_counts[session_id] = []

    if len(_request_counts[session_id]) >= MAX_REQUESTS_PER_MINUTE:
        raise ValueError("Rate limit exceeded. Please wait before trying again.")

    # Check cooldown
    if session_id in _last_request:
        elapsed = now - _last_request[session_id]
        if elapsed < COOLDOWN_SECONDS:
            raise ValueError(f"Please wait {COOLDOWN_SECONDS - int(elapsed)}s before next review.")

    _request_counts[session_id].append(now)
    _last_request[session_id] = now


def check_session_cap(session_id: str) -> None:
    """Check per-session review cap."""
    current = _session_caps.get(session_id, 0)
    if current >= MAX_REVIEWS_PER_SESSION:
        raise ValueError("Daily review limit reached. Try again tomorrow.")
    _session_caps[session_id] = current + 1


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

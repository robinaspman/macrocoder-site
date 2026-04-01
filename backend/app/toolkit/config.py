from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Set


@dataclass(slots=True)
class SecuritySettings:
    allowed_schemes: Set[str] = field(default_factory=lambda: {"http", "https"})
    blocked_hostnames: Set[str] = field(
        default_factory=lambda: {
            "localhost",
            "127.0.0.1",
            "::1",
            "0.0.0.0",
            "metadata.google.internal",
            "169.254.169.254",
        }
    )
    max_redirects: int = 3
    connect_timeout_seconds: float = 4.0
    read_timeout_seconds: float = 8.0
    max_download_bytes: int = 1_500_000
    allowed_text_content_types: Set[str] = field(
        default_factory=lambda: {
            "text/html",
            "text/plain",
            "application/xhtml+xml",
        }
    )
    user_agent: str = "LeadReviewToolkit/0.1"
    allow_github: bool = True
    allow_upwork: bool = True


@dataclass(slots=True)
class PricingSettings:
    min_hourly_rate: float = 45.0
    max_hourly_rate: float = 90.0
    minimum_project_floor: float = 300.0
    reject_if_budget_less_than_floor_fraction: float = 0.35
    default_contingency_fraction: float = 0.15
    phase_one_fraction: float = 0.35


@dataclass(slots=True)
class CacheSettings:
    cache_dir: Path = Path(".cache/lead_review_toolkit")
    default_ttl_seconds: int = 60 * 60 * 6


@dataclass(slots=True)
class TokenBudgetSettings:
    small_model_max_tokens: int = 1500
    medium_model_max_tokens: int = 3500
    large_model_max_tokens: int = 8000
    no_ai_threshold_chars: int = 220

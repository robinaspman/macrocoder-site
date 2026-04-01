from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Sequence, Tuple


class InputKind(str, Enum):
    GITHUB = "github"
    WEBSITE = "website"
    UPWORK = "upwork"
    UNKNOWN = "unknown"


@dataclass(slots=True)
class FetchedContent:
    url: str
    final_url: str
    status_code: int
    content_type: str
    text: str
    bytes_downloaded: int
    response_headers: Dict[str, str] = field(default_factory=dict)
    warnings: List[str] = field(default_factory=list)


@dataclass(slots=True)
class WebsiteExtraction:
    url: str
    final_url: str
    title: str = ""
    meta_description: str = ""
    headings: List[str] = field(default_factory=list)
    primary_ctas: List[str] = field(default_factory=list)
    nav_labels: List[str] = field(default_factory=list)
    trust_signals: List[str] = field(default_factory=list)
    pricing_mentions: List[str] = field(default_factory=list)
    forms: List[str] = field(default_factory=list)
    hero_text: str = ""
    visible_text_sample: str = ""
    warnings: List[str] = field(default_factory=list)


@dataclass(slots=True)
class RepoProfile:
    path: str
    frameworks: List[str] = field(default_factory=list)
    languages: Dict[str, int] = field(default_factory=dict)
    package_managers: List[str] = field(default_factory=list)
    databases: List[str] = field(default_factory=list)
    auth_indicators: List[str] = field(default_factory=list)
    payment_indicators: List[str] = field(default_factory=list)
    ci_indicators: List[str] = field(default_factory=list)
    docker: bool = False
    tests_present: bool = False
    env_files_present: bool = False
    line_count: int = 0
    file_count: int = 0
    complexity: str = "unknown"
    backend_present: bool = False
    frontend_present: bool = False
    notes: List[str] = field(default_factory=list)


@dataclass(slots=True)
class ProjectFeatureFlags:
    frontend: bool = False
    backend: bool = False
    auth: bool = False
    payments: bool = False
    admin_panel: bool = False
    analytics: bool = False
    ai_features: bool = False
    redesign: bool = False
    mobile_responsive: bool = True
    seo: bool = False
    documentation: bool = False
    maintenance: bool = False
    integrations: int = 0
    custom_dashboard: bool = False
    multi_user_roles: bool = False


@dataclass(slots=True)
class ProjectIntake:
    project_type: str
    source_kind: str
    title: str = ""
    description: str = ""
    feature_flags: ProjectFeatureFlags = field(default_factory=ProjectFeatureFlags)
    desired_budget: Optional[float] = None
    timeline_weeks: Optional[int] = None
    pages_or_views: Optional[int] = None
    repo_profile: Optional[RepoProfile] = None
    website_extraction: Optional[WebsiteExtraction] = None
    client_stated_scope: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class Milestone:
    name: str
    summary: str
    min_price: float
    max_price: float
    estimated_hours: Tuple[int, int]


@dataclass(slots=True)
class Estimate:
    package_tier: str
    effort_hours: Tuple[int, int]
    price_range: Tuple[float, float]
    budget_fit: str
    complexity_score: int
    milestone_suggestion: List[Milestone]
    assumptions: List[str] = field(default_factory=list)
    exclusions: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


@dataclass(slots=True)
class ScopeReduction:
    feasible: bool
    target_budget: Optional[float]
    summary: str
    removed_or_deferred: List[str] = field(default_factory=list)
    retained_scope: List[str] = field(default_factory=list)
    recommended_phase_one: List[str] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)


class IntentCategory(str, Enum):
    FAQ = "faq"
    PRICING_CHANGE = "pricing_change"
    SCOPE_CHANGE = "scope_change"
    TIMELINE = "timeline"
    PRIVACY = "privacy"
    FEATURE_CLARIFICATION = "feature_clarification"
    REPEATED_QUESTION = "repeated_question"
    UNRELATED = "unrelated"
    DEEP_REASONING = "deep_reasoning"


@dataclass(slots=True)
class IntentDecision:
    category: IntentCategory
    confidence: float
    ai_required: bool
    explanation: str
    recommended_model_tier: str = "none"


@dataclass(slots=True)
class QuoteRecord:
    quote_id: str
    version: int
    created_at: str
    price_range: Tuple[float, float]
    package_tier: str
    assumptions: List[str]
    exclusions: List[str]
    milestone_suggestion: List[Milestone]
    inputs_fingerprint: str
    signature: str


@dataclass(slots=True)
class RedFlag:
    code: str
    severity: str
    message: str


@dataclass(slots=True)
class SeriousnessScore:
    score: int
    grade: str
    reasons: List[str] = field(default_factory=list)


@dataclass(slots=True)
class Contradiction:
    code: str
    message: str
    severity: str = "medium"


@dataclass(slots=True)
class PromptBundle:
    compact_text: str
    structured: Dict[str, Any]


def as_serializable_dict(obj: Any) -> Dict[str, Any]:
    if hasattr(obj, "__dataclass_fields__"):
        return asdict(obj)
    raise TypeError(f"Object of type {type(obj)!r} is not a dataclass")

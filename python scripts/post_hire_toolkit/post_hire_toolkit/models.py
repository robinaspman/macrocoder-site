from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Optional


@dataclass(slots=True)
class InventoryReport:
    repo_name: str
    root_path: str
    total_files: int
    scanned_files: int
    languages: Dict[str, int] = field(default_factory=dict)
    frameworks: List[str] = field(default_factory=list)
    package_managers: List[str] = field(default_factory=list)
    integrations: List[str] = field(default_factory=list)
    env_files: List[str] = field(default_factory=list)
    ci_files: List[str] = field(default_factory=list)
    docker_files: List[str] = field(default_factory=list)
    docs_files: List[str] = field(default_factory=list)
    largest_files: List[Dict[str, Any]] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)


@dataclass(slots=True)
class ArchitectureMap:
    frontend_routes: List[str] = field(default_factory=list)
    api_routes: List[Dict[str, Any]] = field(default_factory=list)
    middleware: List[str] = field(default_factory=list)
    background_jobs: List[str] = field(default_factory=list)
    webhooks: List[str] = field(default_factory=list)
    cron_jobs: List[str] = field(default_factory=list)
    services: List[str] = field(default_factory=list)
    models: List[str] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)


@dataclass(slots=True)
class DependencyAuditReport:
    frontend_dependencies: Dict[str, str] = field(default_factory=dict)
    backend_dependencies: Dict[str, str] = field(default_factory=dict)
    dev_dependencies: Dict[str, str] = field(default_factory=dict)
    possible_duplicates: List[str] = field(default_factory=list)
    suspicious_dependencies: List[str] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)


@dataclass(slots=True)
class EnvSurfaceReport:
    env_vars_detected: List[str] = field(default_factory=list)
    env_example_vars: List[str] = field(default_factory=list)
    missing_in_example_file: List[str] = field(default_factory=list)
    hardcoded_secret_risks: List[Dict[str, Any]] = field(default_factory=list)
    providers: List[str] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)


@dataclass(slots=True)
class DatabaseSchemaReport:
    database_type: str = "unknown"
    tables: List[str] = field(default_factory=list)
    models: List[str] = field(default_factory=list)
    relationships: List[Dict[str, Any]] = field(default_factory=list)
    migration_files: List[str] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)


@dataclass(slots=True)
class APIContractReport:
    endpoints: List[Dict[str, Any]] = field(default_factory=list)
    auth_patterns: List[str] = field(default_factory=list)
    response_patterns: List[str] = field(default_factory=list)
    error_patterns: List[str] = field(default_factory=list)


@dataclass(slots=True)
class FrontendComponentReport:
    shared_components: List[str] = field(default_factory=list)
    layout_components: List[str] = field(default_factory=list)
    pages_or_views: List[str] = field(default_factory=list)
    repeated_ui_patterns: List[str] = field(default_factory=list)
    form_views: List[str] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)


@dataclass(slots=True)
class TestCoverageReport:
    __test__ = False
    test_frameworks: List[str] = field(default_factory=list)
    unit_tests: bool = False
    integration_tests: bool = False
    e2e_tests: bool = False
    critical_untested_areas: List[str] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)


@dataclass(slots=True)
class HotspotReport:
    hotspots: List[Dict[str, Any]] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)


@dataclass(slots=True)
class SecuritySnapshot:
    issues: List[Dict[str, Any]] = field(default_factory=list)
    strengths: List[str] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)


@dataclass(slots=True)
class DocsDigestReport:
    docs_present: bool = False
    onboarding_quality: str = "unknown"
    summaries: Dict[str, str] = field(default_factory=dict)
    missing_docs: List[str] = field(default_factory=list)
    contradictions: List[str] = field(default_factory=list)


@dataclass(slots=True)
class IssueBacklogReport:
    bug_count: int = 0
    feature_count: int = 0
    infra_count: int = 0
    top_repeated_themes: List[str] = field(default_factory=list)
    issue_samples: List[Dict[str, Any]] = field(default_factory=list)


@dataclass(slots=True)
class MeetingNotesReport:
    requirements: List[str] = field(default_factory=list)
    constraints: List[str] = field(default_factory=list)
    budget_mentions: List[str] = field(default_factory=list)
    deadlines: List[str] = field(default_factory=list)
    stakeholders: List[str] = field(default_factory=list)
    unresolved_questions: List[str] = field(default_factory=list)
    decisions: List[str] = field(default_factory=list)


@dataclass(slots=True)
class RiskRegister:
    technical_risks: List[str] = field(default_factory=list)
    delivery_risks: List[str] = field(default_factory=list)
    business_risks: List[str] = field(default_factory=list)
    confidence_score: float = 0.0


@dataclass(slots=True)
class ImplementationPlan:
    quick_wins: List[str] = field(default_factory=list)
    phase_1: List[str] = field(default_factory=list)
    phase_2: List[str] = field(default_factory=list)
    blockers: List[str] = field(default_factory=list)
    dependencies: List[str] = field(default_factory=list)
    milestone_suggestions: List[Dict[str, Any]] = field(default_factory=list)


@dataclass(slots=True)
class ClientContext:
    project_summary: str = ""
    scope_signals: List[str] = field(default_factory=list)
    budget_signals: List[str] = field(default_factory=list)
    urgency_signals: List[str] = field(default_factory=list)
    repo_signals: List[str] = field(default_factory=list)
    issue_signals: List[str] = field(default_factory=list)
    open_questions: List[str] = field(default_factory=list)


@dataclass(slots=True)
class DecisionLog:
    decisions: List[Dict[str, Any]] = field(default_factory=list)


@dataclass(slots=True)
class UpsellOpportunityReport:
    easy_upsells: List[str] = field(default_factory=list)
    high_value_upsells: List[str] = field(default_factory=list)
    retention_offers: List[str] = field(default_factory=list)


@dataclass(slots=True)
class ExportManifest:
    project_id: str
    generated_files: List[str]
    checksum: str
    compressed: bool
    sent_to: Optional[str] = None


def as_serializable_dict(obj: Any) -> Dict[str, Any]:
    if hasattr(obj, "__dataclass_fields__"):
        return asdict(obj)
    raise TypeError(f"Unsupported object type: {type(obj)!r}")

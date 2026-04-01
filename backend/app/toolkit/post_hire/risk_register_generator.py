from __future__ import annotations

from .models import (
    DependencyAuditReport,
    DocsDigestReport,
    HotspotReport,
    IssueBacklogReport,
    RiskRegister,
    SecuritySnapshot,
    TestCoverageReport,
)


def generate_risk_register(
    dependencies: DependencyAuditReport,
    tests: TestCoverageReport,
    hotspots: HotspotReport,
    security: SecuritySnapshot,
    docs: DocsDigestReport,
    backlog: IssueBacklogReport,
) -> RiskRegister:
    technical: list[str] = []
    delivery: list[str] = []
    business: list[str] = []
    score = 0.9

    if dependencies.suspicious_dependencies:
        technical.append("Suspicious or legacy dependencies increase maintenance risk.")
        score -= 0.08
    if dependencies.possible_duplicates:
        technical.append("Duplicate libraries may indicate stack drift and redundant complexity.")
        score -= 0.05
    if not tests.unit_tests:
        technical.append("Core logic appears under-tested.")
        score -= 0.12
    if not tests.e2e_tests:
        delivery.append("Full user flows may break without fast detection.")
        score -= 0.06
    if hotspots.hotspots:
        technical.append("Large or chatty files suggest refactor or performance risk.")
        score -= 0.06
    if security.issues:
        technical.append("Security posture contains issues that may delay release.")
        score -= 0.12
    if docs.missing_docs:
        delivery.append("Missing docs may slow onboarding and milestone delivery.")
        score -= 0.07
    if backlog.bug_count > backlog.feature_count and backlog.bug_count >= 5:
        business.append("Backlog is bug-heavy, which may reduce room for net-new features.")
        score -= 0.05

    return RiskRegister(
        technical_risks=technical,
        delivery_risks=delivery,
        business_risks=business,
        confidence_score=max(0.0, min(1.0, round(score, 2))),
    )

from __future__ import annotations

from .models import (
    DocsDigestReport,
    SecuritySnapshot,
    TestCoverageReport,
    UpsellOpportunityReport,
)
from .project_inventory import InventoryReport


def find_upsell_opportunities(
    inventory: InventoryReport,
    tests: TestCoverageReport,
    security: SecuritySnapshot,
    docs: DocsDigestReport,
) -> UpsellOpportunityReport:
    easy: list[str] = []
    high_value: list[str] = []
    retention: list[str] = []

    if "sentry" not in inventory.integrations:
        easy.append("Add observability/error tracking.")
    if not tests.e2e_tests:
        high_value.append("Set up end-to-end testing for critical user journeys.")
    if security.issues:
        high_value.append("Security hardening sprint and verification.")
    if docs.missing_docs:
        easy.append("Create onboarding/deployment documentation pack.")
    if "analytics" not in " ".join(inventory.integrations).lower():
        easy.append("Add product analytics and event tracking.")
    retention.extend([
        "Monthly maintenance / dependency hygiene.",
        "Monitoring and alerting review cadence.",
    ])

    return UpsellOpportunityReport(
        easy_upsells=easy[:8],
        high_value_upsells=high_value[:8],
        retention_offers=retention[:8],
    )

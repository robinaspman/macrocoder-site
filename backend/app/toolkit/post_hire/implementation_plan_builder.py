from __future__ import annotations

from .models import (
    ArchitectureMap,
    DependencyAuditReport,
    HotspotReport,
    ImplementationPlan,
    RiskRegister,
    SecuritySnapshot,
)


def build_implementation_plan(
    architecture: ArchitectureMap,
    dependencies: DependencyAuditReport,
    hotspots: HotspotReport,
    security: SecuritySnapshot,
    risks: RiskRegister,
) -> ImplementationPlan:
    quick_wins: list[str] = []
    phase_1: list[str] = []
    phase_2: list[str] = []
    blockers: list[str] = []
    deps: list[str] = []
    milestones: list[dict] = []

    if security.issues:
        quick_wins.append("Harden the most severe security findings first.")
    if hotspots.hotspots:
        quick_wins.append("Refactor the top 1–2 large or chatty files.")
    if dependencies.possible_duplicates:
        quick_wins.append("Consolidate overlapping libraries to reduce stack drift.")
    if architecture.api_routes:
        phase_1.append("Stabilize API contracts and auth-sensitive endpoints.")
    if architecture.webhooks:
        phase_1.append("Audit webhook verification and retry handling.")
    if architecture.frontend_routes:
        phase_1.append("Tighten the highest-value user journeys and forms.")
    if not phase_1:
        phase_1.append("Establish baseline architecture and delivery plan.")
    phase_2.extend([
        "Improve observability, tests, and docs after the first stabilization pass.",
        "Ship product enhancements once core reliability issues are controlled.",
    ])

    if any("docs" in risk.lower() for risk in risks.delivery_risks):
        blockers.append("Documentation gaps may slow onboarding.")
    if security.issues:
        blockers.append("Security issues should be addressed before scaling the system.")

    deps.extend(sorted({x["source"] for x in architecture.api_routes[:10]}))
    milestones = [
        {"name": "Stabilization", "focus": quick_wins[:3] or ["baseline cleanup"]},
        {"name": "Core Build", "focus": phase_1[:3]},
        {"name": "Scale & Polish", "focus": phase_2[:3]},
    ]

    return ImplementationPlan(
        quick_wins=quick_wins[:8],
        phase_1=phase_1[:8],
        phase_2=phase_2[:8],
        blockers=blockers[:8],
        dependencies=deps[:10],
        milestone_suggestions=milestones,
    )

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Tuple

from .models import Estimate, ProjectIntake, ScopeReduction


_COSTLY_FEATURES = [
    ("payments", "Payment processing"),
    ("auth", "Full authentication"),
    ("admin_panel", "Custom admin panel"),
    ("analytics", "Advanced analytics"),
    ("ai_features", "AI-powered features"),
    ("custom_dashboard", "Custom dashboard"),
    ("multi_user_roles", "Multi-role permissions"),
    ("documentation", "Expanded documentation package"),
    ("seo", "Expanded SEO work"),
]


@dataclass(slots=True)
class ScopeReducer:
    def reduce_to_budget(self, intake: ProjectIntake, estimate: Estimate, target_budget: float | None) -> ScopeReduction:
        if target_budget is None:
            return ScopeReduction(
                feasible=False,
                target_budget=None,
                summary="No target budget provided, so no reduced scope plan was generated.",
            )

        lower, _ = estimate.price_range
        retained_scope = self._base_scope(intake)
        removed = []
        phase_one = retained_scope.copy()

        if target_budget >= lower:
            return ScopeReduction(
                feasible=True,
                target_budget=target_budget,
                summary="Current target budget appears compatible with the estimated entry range.",
                retained_scope=retained_scope,
                recommended_phase_one=phase_one,
                notes=["No reduction required based on the current estimate range."],
            )

        flags = intake.feature_flags
        for attr, label in _COSTLY_FEATURES:
            if getattr(flags, attr, False):
                removed.append(label)
                if label in phase_one:
                    phase_one.remove(label)

            if self._rough_reduced_floor(intake, removed) <= target_budget:
                break

        feasible = self._rough_reduced_floor(intake, removed) <= target_budget

        if feasible:
            summary = "Target budget may fit a reduced MVP if some features are postponed."
            notes = ["Recommend locking a smaller phase 1 and delaying non-core features."]
        else:
            summary = "Target budget is likely too low for the requested scope, even after meaningful reduction."
            notes = ["Recommend either increasing budget or shrinking scope further before quoting."]

        return ScopeReduction(
            feasible=feasible,
            target_budget=target_budget,
            summary=summary,
            removed_or_deferred=removed,
            retained_scope=[item for item in retained_scope if item not in removed],
            recommended_phase_one=phase_one,
            notes=notes,
        )

    def _base_scope(self, intake: ProjectIntake) -> List[str]:
        flags = intake.feature_flags
        scope = []
        if flags.frontend:
            scope.append("Frontend")
        if flags.backend:
            scope.append("Backend")
        if flags.auth:
            scope.append("Full authentication")
        if flags.payments:
            scope.append("Payment processing")
        if flags.admin_panel:
            scope.append("Custom admin panel")
        if flags.analytics:
            scope.append("Advanced analytics")
        if flags.ai_features:
            scope.append("AI-powered features")
        if flags.custom_dashboard:
            scope.append("Custom dashboard")
        if flags.multi_user_roles:
            scope.append("Multi-role permissions")
        if flags.documentation:
            scope.append("Expanded documentation package")
        if flags.seo:
            scope.append("Expanded SEO work")
        return scope or ["Core build"]

    def _rough_reduced_floor(self, intake: ProjectIntake, removed: List[str]) -> float:
        floor = 300.0
        cost_map = {
            "Payment processing": 600.0,
            "Full authentication": 400.0,
            "Custom admin panel": 500.0,
            "Advanced analytics": 250.0,
            "AI-powered features": 700.0,
            "Custom dashboard": 500.0,
            "Multi-role permissions": 450.0,
            "Expanded documentation package": 150.0,
            "Expanded SEO work": 180.0,
        }
        active = self._base_scope(intake)
        total = floor + sum(cost_map.get(item, 220.0) for item in active if item not in removed)
        return total

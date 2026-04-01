from __future__ import annotations

from dataclasses import dataclass, field
from math import ceil
from typing import List, Tuple

from .config import PricingSettings
from .exceptions import PricingError
from .models import Estimate, Milestone, ProjectFeatureFlags, ProjectIntake


@dataclass(slots=True)
class PricingEngine:
    settings: PricingSettings = field(default_factory=PricingSettings)

    def estimate(self, intake: ProjectIntake) -> Estimate:
        if not intake.project_type:
            raise PricingError("project_type is required for pricing.")

        score = self._complexity_score(intake.feature_flags, intake)
        effort = self._effort_hours(score, intake)
        price_range = self._price_range(effort)
        budget_fit = self._budget_fit(intake.desired_budget, price_range)
        assumptions, exclusions = self._assumptions_and_exclusions(intake)
        milestones = self._milestones(intake, effort, price_range)

        warnings = []
        if intake.desired_budget is not None and intake.desired_budget < self.settings.minimum_project_floor:
            warnings.append("Desired budget is below the minimum project floor.")
        if intake.timeline_weeks is not None and intake.timeline_weeks <= 2 and score >= 10:
            warnings.append("Timeline is aggressive for the requested complexity.")

        return Estimate(
            package_tier=self._package_tier(score),
            effort_hours=effort,
            price_range=price_range,
            budget_fit=budget_fit,
            complexity_score=score,
            milestone_suggestion=milestones,
            assumptions=assumptions,
            exclusions=exclusions,
            warnings=warnings,
        )

    def _complexity_score(self, flags: ProjectFeatureFlags, intake: ProjectIntake) -> int:
        score = 1
        score += 2 if flags.frontend else 0
        score += 3 if flags.backend else 0
        score += 2 if flags.auth else 0
        score += 3 if flags.payments else 0
        score += 2 if flags.admin_panel else 0
        score += 1 if flags.analytics else 0
        score += 2 if flags.ai_features else 0
        score += 1 if flags.redesign else 0
        score += 1 if flags.seo else 0
        score += 1 if flags.documentation else 0
        score += 1 if flags.maintenance else 0
        score += min(flags.integrations, 4)
        score += 2 if flags.custom_dashboard else 0
        score += 2 if flags.multi_user_roles else 0
        score += max((intake.pages_or_views or 0) // 4, 0)

        if intake.repo_profile:
            repo_complexity_bonus = {"low": 0, "medium": 1, "high": 2, "very_high": 3}
            score += repo_complexity_bonus.get(intake.repo_profile.complexity, 0)
            score += 1 if intake.repo_profile.backend_present and intake.repo_profile.frontend_present else 0
            score += 1 if intake.repo_profile.payment_indicators else 0

        if intake.website_extraction and intake.website_extraction.pricing_mentions:
            score += 1

        return score

    def _effort_hours(self, score: int, intake: ProjectIntake) -> Tuple[int, int]:
        min_hours = max(6, score * 4)
        max_hours = max(min_hours + 6, ceil(min_hours * 1.6))
        if intake.timeline_weeks and intake.timeline_weeks <= 2:
            max_hours = ceil(max_hours * 1.15)
        return min_hours, max_hours

    def _price_range(self, effort: Tuple[int, int]) -> Tuple[float, float]:
        min_hours, max_hours = effort
        raw_min = max(self.settings.minimum_project_floor, min_hours * self.settings.min_hourly_rate)
        raw_max = max(raw_min, max_hours * self.settings.max_hourly_rate)
        contingency = 1 + self.settings.default_contingency_fraction
        return round(raw_min, 2), round(raw_max * contingency, 2)

    def _budget_fit(self, budget: float | None, price_range: Tuple[float, float]) -> str:
        if budget is None:
            return "unknown"
        lower, upper = price_range
        if budget < lower * self.settings.reject_if_budget_less_than_floor_fraction:
            return "far_below_range"
        if budget < lower:
            return "below_range"
        if lower <= budget <= upper:
            return "within_range"
        return "above_range"

    def _package_tier(self, score: int) -> str:
        if score <= 4:
            return "starter"
        if score <= 9:
            return "growth"
        return "advanced"

    def _assumptions_and_exclusions(self, intake: ProjectIntake) -> tuple[list[str], list[str]]:
        assumptions = [
            "Estimate assumes standard business-hour collaboration and one main decision-maker.",
            "Estimate assumes no major hidden legacy constraints beyond what was provided.",
        ]
        exclusions = [
            "Hosting, third-party subscriptions, and platform fees are excluded unless explicitly stated.",
            "Major scope changes after approval may change the estimate.",
        ]
        if intake.feature_flags.redesign:
            assumptions.append("Estimate assumes existing brand assets or rough design direction are available.")
        if intake.feature_flags.payments:
            exclusions.append("Payment processor fees and merchant account setup are excluded.")
        return assumptions, exclusions

    def _milestones(self, intake: ProjectIntake, effort: Tuple[int, int], price_range: Tuple[float, float]) -> List[Milestone]:
        low, high = price_range
        hours_low, hours_high = effort
        phase_one = (
            round(low * self.settings.phase_one_fraction, 2),
            round(high * self.settings.phase_one_fraction, 2),
        )
        milestones = [
            Milestone(
                name="Phase 1",
                summary="Scope lock, core implementation, and highest-priority path.",
                min_price=phase_one[0],
                max_price=phase_one[1],
                estimated_hours=(max(4, ceil(hours_low * 0.35)), max(8, ceil(hours_high * 0.35))),
            )
        ]
        if intake.feature_flags.backend or intake.feature_flags.admin_panel or intake.feature_flags.payments:
            milestones.append(
                Milestone(
                    name="Phase 2",
                    summary="Backend workflows, admin features, or payment-related work.",
                    min_price=round(low * 0.30, 2),
                    max_price=round(high * 0.35, 2),
                    estimated_hours=(max(4, ceil(hours_low * 0.25)), max(8, ceil(hours_high * 0.30))),
                )
            )
        milestones.append(
            Milestone(
                name="Final Polish",
                summary="QA, refinements, responsive fixes, and deployment support.",
                min_price=round(low * 0.15, 2),
                max_price=round(high * 0.20, 2),
                estimated_hours=(max(2, ceil(hours_low * 0.10)), max(4, ceil(hours_high * 0.15))),
            )
        )
        return milestones

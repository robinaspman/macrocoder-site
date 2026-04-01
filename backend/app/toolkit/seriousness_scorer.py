from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List

from .models import Estimate, ProjectIntake, SeriousnessScore


@dataclass(slots=True)
class SeriousnessScorer:
    def score(
        self,
        intake: ProjectIntake,
        estimate: Estimate | None = None,
        refinement_count: int = 0,
        answered_required_questions: int = 0,
    ) -> SeriousnessScore:
        score = 0
        reasons: List[str] = []

        if intake.title:
            score += 8
            reasons.append("Client provided a project title.")
        if intake.description and len(intake.description) > 60:
            score += 18
            reasons.append("Client provided a meaningful project description.")
        if intake.client_stated_scope:
            score += min(18, len(intake.client_stated_scope) * 3)
            reasons.append("Client provided concrete scope items.")
        if intake.desired_budget is not None:
            score += 14
            reasons.append("Client provided a budget.")
        if intake.timeline_weeks is not None:
            score += 12
            reasons.append("Client provided a timeline.")
        if answered_required_questions:
            score += min(16, answered_required_questions * 4)
            reasons.append("Client answered follow-up questions.")
        if refinement_count >= 1:
            score += min(10, refinement_count * 2)
            reasons.append("Client engaged with the estimate flow.")
        if estimate and estimate.budget_fit in {"within_range", "above_range"}:
            score += 10
            reasons.append("Budget appears viable relative to estimated range.")

        score = min(score, 100)
        if score >= 75:
            grade = "high"
        elif score >= 45:
            grade = "medium"
        else:
            grade = "low"
        return SeriousnessScore(score=score, grade=grade, reasons=reasons)

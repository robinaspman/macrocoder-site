from __future__ import annotations

from dataclasses import dataclass
from typing import List

from .models import Contradiction, ProjectIntake


@dataclass(slots=True)
class ContradictionDetector:
    def detect(self, intake: ProjectIntake) -> List[Contradiction]:
        issues: List[Contradiction] = []
        f = intake.feature_flags

        if intake.project_type.lower() in {"landing_page", "simple_site"} and (f.backend or f.payments or f.multi_user_roles):
            issues.append(
                Contradiction(
                    code="SIMPLE_SITE_COMPLEX_SCOPE",
                    message="Project is described as simple, but feature flags imply a more complex system.",
                    severity="high",
                )
            )

        if intake.desired_budget is not None and intake.desired_budget < 500 and (f.backend or f.payments or f.ai_features):
            issues.append(
                Contradiction(
                    code="BUDGET_SCOPE_MISMATCH",
                    message="Budget is very low relative to the requested features.",
                    severity="high",
                )
            )

        if intake.timeline_weeks is not None and intake.timeline_weeks <= 1 and (f.backend or f.admin_panel or f.payments):
            issues.append(
                Contradiction(
                    code="TIMELINE_SCOPE_MISMATCH",
                    message="Requested timeline is too short for the current feature mix.",
                    severity="high",
                )
            )

        if "mvp" in intake.description.lower() and f.multi_user_roles and f.ai_features and f.payments:
            issues.append(
                Contradiction(
                    code="MVP_OVERLOADED",
                    message="The scope is labeled MVP, but the requested feature mix is broad and expensive.",
                    severity="medium",
                )
            )
        return issues

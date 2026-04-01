from __future__ import annotations

from dataclasses import dataclass
from typing import List

from .models import Estimate, ProjectIntake, RedFlag


@dataclass(slots=True)
class RedFlagDetector:
    def detect(self, intake: ProjectIntake, estimate: Estimate | None = None) -> List[RedFlag]:
        flags: List[RedFlag] = []
        if intake.desired_budget is not None:
            if intake.desired_budget < 300:
                flags.append(RedFlag(code="BUDGET_TINY", severity="high", message="Budget is extremely low for most custom work."))
            elif estimate and intake.desired_budget < estimate.price_range[0]:
                flags.append(RedFlag(code="BUDGET_LOW", severity="medium", message="Budget is below the estimated entry range."))

        if intake.timeline_weeks is not None and intake.timeline_weeks <= 2:
            flags.append(RedFlag(code="TIMELINE_AGGRESSIVE", severity="medium", message="Timeline is aggressive and may increase delivery risk."))

        if len(intake.client_stated_scope) >= 8:
            flags.append(RedFlag(code="SCOPE_WIDE", severity="medium", message="Client scope list is broad and may need phasing."))

        f = intake.feature_flags
        if f.payments and not f.backend:
            flags.append(RedFlag(code="PAYMENTS_NO_BACKEND", severity="high", message="Payments without backend assumptions may be unrealistic."))

        if f.ai_features and intake.desired_budget is not None and intake.desired_budget < 1000:
            flags.append(RedFlag(code="AI_BUDGET_MISMATCH", severity="medium", message="AI-heavy scope may not fit the current budget."))

        if not intake.description and not intake.client_stated_scope:
            flags.append(RedFlag(code="SCOPE_VAGUE", severity="medium", message="Project scope is still vague."))

        return flags

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Iterable, List

from .models import IntentCategory, IntentDecision


_PATTERNS = {
    IntentCategory.FAQ: [r"\bwhat is this\b", r"\bis it free\b", r"\bhow does this work\b"],
    IntentCategory.PRICING_CHANGE: [r"\bprice\b", r"\bbudget\b", r"\bquote\b", r"\bcost\b"],
    IntentCategory.SCOPE_CHANGE: [r"\bremove\b", r"\bphase\b", r"\bmvp\b", r"\badd\b", r"\bscope\b"],
    IntentCategory.TIMELINE: [r"\bwhen\b", r"\bhow long\b", r"\btimeline\b", r"\bdeadline\b"],
    IntentCategory.PRIVACY: [r"\bprivacy\b", r"\bsensitive\b", r"\bsecure\b", r"\bconfidential\b"],
    IntentCategory.FEATURE_CLARIFICATION: [r"\bfeature\b", r"\bauth\b", r"\bpayment\b", r"\bintegration\b"],
    IntentCategory.UNRELATED: [r"\bweather\b", r"\bjoke\b", r"\bmovie\b"],
}


@dataclass(slots=True)
class IntentRouter:
    def route(self, question: str, prior_questions: Iterable[str] | None = None) -> IntentDecision:
        lowered = question.lower().strip()
        if not lowered:
            return IntentDecision(
                category=IntentCategory.UNRELATED,
                confidence=0.0,
                ai_required=False,
                explanation="Empty question.",
            )

        if prior_questions and any(lowered == prev.lower().strip() for prev in prior_questions):
            return IntentDecision(
                category=IntentCategory.REPEATED_QUESTION,
                confidence=0.98,
                ai_required=False,
                explanation="Question matches a previous question.",
                recommended_model_tier="none",
            )

        best_category = IntentCategory.DEEP_REASONING
        best_score = 0
        for category, patterns in _PATTERNS.items():
            score = sum(bool(re.search(pattern, lowered)) for pattern in patterns)
            if score > best_score:
                best_score = score
                best_category = category

        if best_score == 0:
            return IntentDecision(
                category=IntentCategory.DEEP_REASONING,
                confidence=0.55,
                ai_required=True,
                explanation="No strong deterministic match; route to AI or a human-authored answer.",
                recommended_model_tier="medium",
            )

        ai_required = best_category not in {
            IntentCategory.FAQ,
            IntentCategory.PRICING_CHANGE,
            IntentCategory.SCOPE_CHANGE,
            IntentCategory.TIMELINE,
            IntentCategory.PRIVACY,
            IntentCategory.REPEATED_QUESTION,
        }

        tier = "none"
        if ai_required:
            tier = "small" if best_category == IntentCategory.FEATURE_CLARIFICATION else "medium"

        return IntentDecision(
            category=best_category,
            confidence=min(0.99, 0.45 + best_score * 0.18),
            ai_required=ai_required,
            explanation=f"Matched route '{best_category.value}' via heuristic keyword detection.",
            recommended_model_tier=tier,
        )

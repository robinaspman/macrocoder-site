from __future__ import annotations

from dataclasses import dataclass, field

from .config import TokenBudgetSettings


@dataclass(slots=True)
class TokenBudgetRouter:
    settings: TokenBudgetSettings = field(default_factory=TokenBudgetSettings)

    def rough_token_estimate(self, text: str) -> int:
        return max(1, len(text) // 4)

    def choose(self, task_type: str, text: str) -> str:
        chars = len(text or "")
        tokens = self.rough_token_estimate(text)

        if chars <= self.settings.no_ai_threshold_chars and task_type in {"faq", "pricing_change", "scope_change"}:
            return "none"
        if tokens <= self.settings.small_model_max_tokens:
            return "small"
        if tokens <= self.settings.medium_model_max_tokens:
            return "medium"
        return "large"

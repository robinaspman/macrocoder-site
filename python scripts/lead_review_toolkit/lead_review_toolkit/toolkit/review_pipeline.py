from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict

from .cache_manager import DiskCache
from .contradiction_detector import ContradictionDetector
from .faq_rules import FAQRules
from .intent_router import IntentRouter
from .models import ProjectIntake
from .pricing_engine import PricingEngine
from .prompt_compressor import PromptCompressor
from .red_flag_detector import RedFlagDetector
from .scope_reducer import ScopeReducer
from .seriousness_scorer import SeriousnessScorer
from .token_budget_router import TokenBudgetRouter


@dataclass(slots=True)
class ReviewPipeline:
    pricing_engine: PricingEngine = field(default_factory=PricingEngine)
    red_flag_detector: RedFlagDetector = field(default_factory=RedFlagDetector)
    contradiction_detector: ContradictionDetector = field(default_factory=ContradictionDetector)
    seriousness_scorer: SeriousnessScorer = field(default_factory=SeriousnessScorer)
    scope_reducer: ScopeReducer = field(default_factory=ScopeReducer)
    prompt_compressor: PromptCompressor = field(default_factory=PromptCompressor)
    intent_router: IntentRouter = field(default_factory=IntentRouter)
    faq_rules: FAQRules = field(default_factory=FAQRules)
    token_budget_router: TokenBudgetRouter = field(default_factory=TokenBudgetRouter)
    cache: DiskCache = field(default_factory=DiskCache)

    def run(self, intake: ProjectIntake) -> Dict[str, Any]:
        cache_key = self.cache.key_for("review_pipeline", {
            "title": intake.title,
            "description": intake.description,
            "project_type": intake.project_type,
            "budget": intake.desired_budget,
            "timeline": intake.timeline_weeks,
            "feature_flags": {k: getattr(intake.feature_flags, k) for k in intake.feature_flags.__dataclass_fields__},
            "client_stated_scope": intake.client_stated_scope,
        })
        cached = self.cache.get(cache_key)
        if cached:
            return cached

        estimate = self.pricing_engine.estimate(intake)
        flags = self.red_flag_detector.detect(intake, estimate)
        contradictions = self.contradiction_detector.detect(intake)
        seriousness = self.seriousness_scorer.score(intake, estimate=estimate)
        reduced_scope = self.scope_reducer.reduce_to_budget(intake, estimate, intake.desired_budget)
        prompt = self.prompt_compressor.build(intake, estimate=estimate, red_flags=flags, seriousness=seriousness)

        result = {
            "estimate": estimate,
            "red_flags": flags,
            "contradictions": contradictions,
            "seriousness": seriousness,
            "reduced_scope": reduced_scope,
            "prompt_bundle": prompt,
            "recommended_model_tier": self.token_budget_router.choose("deep_reasoning", prompt.compact_text),
        }
        # Convert dataclasses to shallow dicts if needed by your API layer later.
        self.cache.set(cache_key, _to_jsonable(result))
        return self.cache.get(cache_key) or {}

def _to_jsonable(result: Dict[str, Any]) -> Dict[str, Any]:
    def convert(value: Any) -> Any:
        if hasattr(value, "__dataclass_fields__"):
            return {k: convert(getattr(value, k)) for k in value.__dataclass_fields__}
        if isinstance(value, list):
            return [convert(v) for v in value]
        if isinstance(value, dict):
            return {k: convert(v) for k, v in value.items()}
        return value
    return convert(result)

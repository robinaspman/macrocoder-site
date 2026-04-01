import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from toolkit.models import ProjectFeatureFlags, ProjectIntake
from toolkit.pricing_engine import PricingEngine
from toolkit.review_pipeline import ReviewPipeline


def test_pricing_smoke():
    intake = ProjectIntake(
        project_type="web_app",
        source_kind="manual",
        feature_flags=ProjectFeatureFlags(frontend=True, backend=True, auth=True),
    )
    estimate = PricingEngine().estimate(intake)
    assert estimate.price_range[0] > 0
    assert estimate.package_tier in {"starter", "growth", "advanced"}


def test_pipeline_smoke():
    intake = ProjectIntake(
        project_type="web_app",
        source_kind="manual",
        title="Demo",
        description="Need a clean MVP.",
        desired_budget=1500,
        timeline_weeks=4,
        feature_flags=ProjectFeatureFlags(frontend=True, backend=True),
    )
    result = ReviewPipeline().run(intake)
    assert "estimate" in result
    assert "recommended_model_tier" in result

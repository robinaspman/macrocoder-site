from toolkit.models import ProjectFeatureFlags, ProjectIntake
from toolkit.pricing_engine import PricingEngine
from toolkit.review_pipeline import ReviewPipeline


def main() -> None:
    intake = ProjectIntake(
        project_type="web_app",
        source_kind="website",
        title="Lead review MVP",
        description="Need a polished review and quote flow for websites, repos, and job posts.",
        feature_flags=ProjectFeatureFlags(
            frontend=True,
            backend=True,
            auth=True,
            admin_panel=True,
            ai_features=True,
            integrations=2,
            custom_dashboard=True,
        ),
        desired_budget=2800,
        timeline_weeks=5,
        client_stated_scope=["review flow", "quote engine", "milestones", "admin dashboard"],
    )

    pipeline = ReviewPipeline()
    result = pipeline.run(intake)
    print(result)


if __name__ == "__main__":
    main()

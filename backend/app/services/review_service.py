from __future__ import annotations

import json
from typing import Any, Dict

from app.toolkit.models import (
    ProjectIntake,
    ProjectFeatureFlags,
    RepoProfile,
    WebsiteExtraction,
    Estimate,
    ScopeReduction,
    RedFlag,
    SeriousnessScore,
    Contradiction,
    PromptBundle,
)
from app.toolkit.review_pipeline import ReviewPipeline
from app.toolkit.website_extractor import WebsiteExtractor
from app.toolkit.repo_profiler import RepoProfiler
from app.toolkit.job_post_extractor import JobPostExtractor
from app.toolkit.sensitive_data_scrubber import SensitiveDataScrubber
from app.toolkit.credit_guard import CreditGuard
from app.toolkit.abuse_guard import AbuseGuard
from app.toolkit.cache_manager import DiskCache

pipeline = ReviewPipeline()
website_extractor = WebsiteExtractor()
repo_profiler = RepoProfiler()
job_post_extractor = JobPostExtractor()
scrubber = SensitiveDataScrubber()
credit_guard = CreditGuard()
abuse_guard = AbuseGuard()
cache = DiskCache()


async def process_review(
    review_type: str,
    owner: str | None = None,
    repo: str | None = None,
    url: str | None = None,
    description: str | None = None,
) -> Dict[str, Any]:
    """Process a review request using the full toolkit pipeline."""
    # Abuse check
    abuse_result = abuse_guard.check(url or description or "")
    if abuse_result.blocked:
        raise ValueError(abuse_result.reason)

    # Build ProjectIntake from input
    intake = _build_intake(review_type, owner, repo, url, description)

    # Run the full review pipeline
    result = pipeline.run(intake)

    # Format response for frontend
    return _format_response(intake, result)


def _build_intake(
    review_type: str,
    owner: str | None,
    repo: str | None,
    url: str | None,
    description: str | None,
) -> ProjectIntake:
    """Build a ProjectIntake from the request parameters."""
    if review_type == "github" and owner and repo:
        repo_profile = _profile_github_repo(owner, repo)
        return ProjectIntake(
            project_type="github",
            source_kind="github",
            title=f"{owner}/{repo}",
            description=f"GitHub repository: {owner}/{repo}",
            repo_profile=repo_profile,
            feature_flags=_flags_from_repo(repo_profile),
        )

    if review_type == "website" and url:
        extraction = website_extractor.extract_from_url(url)
        return ProjectIntake(
            project_type="website",
            source_kind="website",
            title=extraction.title or url,
            description=extraction.meta_description or extraction.hero_text or url,
            website_extraction=extraction,
            feature_flags=_flags_from_website(extraction),
        )

    if review_type == "upwork" and description:
        extracted = job_post_extractor.extract(description)
        return ProjectIntake(
            project_type="upwork",
            source_kind="upwork",
            title=extracted.get("title", "Upwork Job Post"),
            description=extracted.get("description", description),
            desired_budget=extracted.get("budget"),
            timeline_weeks=extracted.get("timeline_weeks"),
            client_stated_scope=extracted.get("requirements", []),
            feature_flags=_flags_from_upwork(extracted),
        )

    raise ValueError("Invalid review request parameters")


def _profile_github_repo(owner: str, repo: str) -> RepoProfile | None:
    """Profile a GitHub repo if we have local access, otherwise return basic profile."""
    # For now, return a basic profile since we don't have the repo locally
    # In production, you'd clone or fetch the repo first
    return RepoProfile(
        path=f"{owner}/{repo}",
        file_count=0,
        line_count=0,
        complexity="medium",
    )


def _flags_from_repo(profile: RepoProfile | None) -> ProjectFeatureFlags:
    flags = ProjectFeatureFlags()
    if profile:
        flags.frontend = profile.frontend_present
        flags.backend = profile.backend_present
        flags.auth = bool(profile.auth_indicators)
        flags.payments = bool(profile.payment_indicators)
        flags.documentation = profile.tests_present
    return flags


def _flags_from_website(extraction: WebsiteExtraction) -> ProjectFeatureFlags:
    flags = ProjectFeatureFlags()
    text = " ".join(extraction.headings + extraction.primary_ctas + extraction.trust_signals).lower()
    flags.frontend = True
    flags.auth = any(kw in text for kw in ["login", "sign in", "auth", "account"])
    flags.payments = any(kw in text for kw in ["pricing", "payment", "stripe", "checkout", "buy"])
    flags.seo = bool(extraction.meta_description)
    flags.analytics = any(kw in text for kw in ["analytics", "tracking", "pixel"])
    return flags


def _flags_from_upwork(extracted: dict) -> ProjectFeatureFlags:
    flags = ProjectFeatureFlags()
    scope = " ".join(extracted.get("requirements", [])).lower()
    flags.frontend = any(kw in scope for kw in ["frontend", "ui", "react", "vue", "angular", "landing"])
    flags.backend = any(kw in scope for kw in ["backend", "api", "server", "database", "fastapi"])
    flags.auth = any(kw in scope for kw in ["auth", "login", "oauth", "jwt"])
    flags.payments = any(kw in scope for kw in ["payment", "stripe", "checkout"])
    flags.ai_features = any(kw in scope for kw in ["ai", "ml", "llm", "chatbot"])
    return flags


def _format_response(intake: ProjectIntake, result: Dict[str, Any]) -> Dict[str, Any]:
    """Format toolkit output for the frontend."""
    estimate = result.get("estimate")
    red_flags = result.get("red_flags", [])
    seriousness = result.get("seriousness")
    reduced_scope = result.get("reduced_scope")

    # Build verdict
    verdict_parts = []
    if estimate:
        verdict_parts.append(
            f"This is a {estimate.complexity_score}/10 complexity project "
            f"estimated at {estimate.effort_hours[0]}-{estimate.effort_hours[1]} hours."
        )
    if seriousness:
        verdict_parts.append(
            f"Client seriousness: {seriousness.grade} ({seriousness.score}/100)."
        )
    if red_flags:
        flag_msgs = [f.flag for f in red_flags[:3]] if hasattr(red_flags[0], 'flag') else red_flags[:3]
        verdict_parts.append(f"Red flags: {'; '.join(str(f) for f in flag_msgs)}.")

    verdict = " ".join(verdict_parts) or "Analysis complete. Review the details below."

    # Build fixes
    fixes = []
    if reduced_scope and reduced_scope.removed_or_deferred:
        fixes.extend(reduced_scope.removed_or_deferred[:3])
    if red_flags:
        fixes.extend([str(f) for f in red_flags[:2]])
    if not fixes:
        fixes = [
            "Review the scope and prioritize core features first.",
            "Consider starting with a minimal viable product.",
            "Plan for iterative improvements based on feedback.",
        ]

    # Build direction
    direction = f"Recommended: {estimate.package_tier} package" if estimate else "Review completed."
    if reduced_scope and reduced_scope.summary:
        direction += f". {reduced_scope.summary}"

    return {
        "verdict": verdict,
        "fixes": fixes[:3],
        "direction": direction,
        "estimate": _serialize_estimate(estimate) if estimate else None,
        "red_flags": [str(f) for f in red_flags],
        "seriousness": seriousness.score if seriousness else None,
    }


def _serialize_estimate(estimate: Estimate) -> Dict[str, Any]:
    return {
        "package_tier": estimate.package_tier,
        "effort_hours": list(estimate.effort_hours),
        "price_range": list(estimate.price_range),
        "budget_fit": estimate.budget_fit,
        "complexity_score": estimate.complexity_score,
        "milestones": [
            {
                "name": m.name,
                "summary": m.summary,
                "min_price": m.min_price,
                "max_price": m.max_price,
                "estimated_hours": list(m.estimated_hours),
            }
            for m in estimate.milestone_suggestion
        ],
        "assumptions": estimate.assumptions,
        "exclusions": estimate.exclusions,
        "warnings": estimate.warnings,
    }

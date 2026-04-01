from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List

from .models import Estimate, PromptBundle, ProjectIntake, RedFlag, SeriousnessScore
from .utils.text import truncate


@dataclass(slots=True)
class PromptCompressor:
    def build(
        self,
        intake: ProjectIntake,
        estimate: Estimate | None = None,
        red_flags: List[RedFlag] | None = None,
        seriousness: SeriousnessScore | None = None,
    ) -> PromptBundle:
        structured: Dict[str, object] = {
            "project_type": intake.project_type,
            "source_kind": intake.source_kind,
            "title": intake.title,
            "budget": intake.desired_budget,
            "timeline_weeks": intake.timeline_weeks,
            "client_scope": intake.client_stated_scope[:8],
            "features": {
                k: v
                for k, v in {k: getattr(intake.feature_flags, k) for k in intake.feature_flags.__dataclass_fields__}.items()
                if v not in (False, None, 0, "")
            },
        }

        lines = [
            f"Project type: {intake.project_type}",
            f"Source kind: {intake.source_kind}",
        ]

        if intake.title:
            lines.append(f"Title: {truncate(intake.title, 120)}")
        if intake.description:
            lines.append(f"Description: {truncate(intake.description, 260)}")

        if intake.website_extraction:
            structured["website"] = {
                "title": intake.website_extraction.title,
                "hero_text": intake.website_extraction.hero_text,
                "ctas": intake.website_extraction.primary_ctas[:5],
                "pricing_mentions": intake.website_extraction.pricing_mentions[:4],
            }
            lines.append(f"Website title: {truncate(intake.website_extraction.title, 100)}")
            if intake.website_extraction.hero_text:
                lines.append(f"Hero: {truncate(intake.website_extraction.hero_text, 180)}")
            if intake.website_extraction.primary_ctas:
                lines.append("Primary CTAs: " + ", ".join(intake.website_extraction.primary_ctas[:4]))

        if intake.repo_profile:
            structured["repo"] = {
                "frameworks": intake.repo_profile.frameworks[:6],
                "languages": intake.repo_profile.languages,
                "complexity": intake.repo_profile.complexity,
                "backend_present": intake.repo_profile.backend_present,
                "frontend_present": intake.repo_profile.frontend_present,
            }
            lines.append(f"Repo complexity: {intake.repo_profile.complexity}")
            if intake.repo_profile.frameworks:
                lines.append("Frameworks: " + ", ".join(intake.repo_profile.frameworks[:5]))

        if estimate:
            structured["estimate"] = {
                "package_tier": estimate.package_tier,
                "price_range": estimate.price_range,
                "budget_fit": estimate.budget_fit,
                "complexity_score": estimate.complexity_score,
            }
            lines.append(
                f"Estimate: {estimate.package_tier}, {estimate.budget_fit}, price range {estimate.price_range[0]}-{estimate.price_range[1]}"
            )

        if red_flags:
            structured["red_flags"] = [{k: getattr(flag, k) for k in flag.__dataclass_fields__} for flag in red_flags]
            lines.append("Red flags: " + "; ".join(flag.message for flag in red_flags[:4]))

        if seriousness:
            structured["seriousness"] = {k: getattr(seriousness, k) for k in seriousness.__dataclass_fields__}
            lines.append(f"Seriousness: {seriousness.grade} ({seriousness.score}/100)")

        return PromptBundle(compact_text="\n".join(lines), structured=structured)

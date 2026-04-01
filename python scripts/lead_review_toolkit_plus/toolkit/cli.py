from __future__ import annotations

import argparse
import json
from pathlib import Path

from .repo_profiler import RepoProfiler
from .review_pipeline import ReviewPipeline
from .url_guard import URLGuard
from .website_extractor import WebsiteExtractor
from .models import ProjectFeatureFlags, ProjectIntake


def main() -> None:
    parser = argparse.ArgumentParser(description="Lead Review Toolkit CLI")
    sub = parser.add_subparsers(dest="command", required=True)

    guard_p = sub.add_parser("classify-url", help="Normalize and classify a URL")
    guard_p.add_argument("url")

    site_p = sub.add_parser("extract-website", help="Fetch and extract website signals")
    site_p.add_argument("url")

    repo_p = sub.add_parser("profile-repo", help="Profile a local repository")
    repo_p.add_argument("path")

    estimate_p = sub.add_parser("estimate", help="Run pricing + screening on a basic intake")
    estimate_p.add_argument("--project-type", required=True)
    estimate_p.add_argument("--budget", type=float, default=None)
    estimate_p.add_argument("--timeline-weeks", type=int, default=None)
    estimate_p.add_argument("--frontend", action="store_true")
    estimate_p.add_argument("--backend", action="store_true")
    estimate_p.add_argument("--auth", action="store_true")
    estimate_p.add_argument("--payments", action="store_true")
    estimate_p.add_argument("--admin-panel", action="store_true")
    estimate_p.add_argument("--ai-features", action="store_true")
    estimate_p.add_argument("--title", default="")
    estimate_p.add_argument("--description", default="")

    args = parser.parse_args()

    if args.command == "classify-url":
        guard = URLGuard()
        normalized = guard.validate_url(args.url)
        print(json.dumps({"normalized": normalized, "kind": guard.classify_url(normalized).value}, indent=2))
        return

    if args.command == "extract-website":
        extraction = WebsiteExtractor().extract_from_url(args.url)
        print(json.dumps({k: getattr(extraction, k) for k in extraction.__dataclass_fields__}, ensure_ascii=False, indent=2))
        return

    if args.command == "profile-repo":
        profile = RepoProfiler().profile(Path(args.path))
        print(json.dumps({k: getattr(profile, k) for k in profile.__dataclass_fields__}, ensure_ascii=False, indent=2))
        return

    if args.command == "estimate":
        intake = ProjectIntake(
            project_type=args.project_type,
            source_kind="manual",
            title=args.title,
            description=args.description,
            desired_budget=args.budget,
            timeline_weeks=args.timeline_weeks,
            feature_flags=ProjectFeatureFlags(
                frontend=args.frontend,
                backend=args.backend,
                auth=args.auth,
                payments=args.payments,
                admin_panel=args.admin_panel,
                ai_features=args.ai_features,
            ),
        )
        result = ReviewPipeline().run(intake)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return


if __name__ == "__main__":
    main()

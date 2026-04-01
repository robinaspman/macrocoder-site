from __future__ import annotations

import argparse
import json
from pathlib import Path

from .config import AnalysisSettings, ExportSettings
from .pipeline import PostHirePipeline


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run post-hire project analysis.")
    parser.add_argument("root", help="Project root path")
    parser.add_argument("--notes", help="Optional meeting notes file")
    parser.add_argument("--issues", help="Optional issues/backlog JSON file")
    parser.add_argument("--output-dir", default="analysis_output", help="Where JSON reports should be written")
    parser.add_argument("--export-endpoint", default="", help="Optional Hetzner/Rust analysis endpoint")
    parser.add_argument("--export-token", default="", help="Bearer token for the export endpoint")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    settings = AnalysisSettings(root=Path(args.root), output_dir=Path(args.output_dir))
    pipeline = PostHirePipeline(settings)
    reports = pipeline.run(notes_path=Path(args.notes) if args.notes else None, issues_path=Path(args.issues) if args.issues else None)
    bundle_path = pipeline.write_reports(reports)
    print(f"Wrote reports to {bundle_path}")

    if args.export_endpoint:
        response = pipeline.export_for_rust_analysis(
            reports,
            ExportSettings(endpoint_url=args.export_endpoint, bearer_token=args.export_token),
        )
        print(json.dumps(response, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

from __future__ import annotations

import json
import tempfile
from pathlib import Path
from typing import Any, Dict, Optional

from app.toolkit.post_hire.config import AnalysisSettings, ExportSettings
from app.toolkit.post_hire.exceptions import ToolkitError
from app.toolkit.post_hire.hetzner_exporter import make_rust_friendly_payload, send_json_to_hetzner, write_export_bundle
from app.toolkit.post_hire.pipeline import PostHirePipeline
from app.core.logging import logger


class PostHireService:
    def __init__(self):
        self._active_pipelines: Dict[str, PostHirePipeline] = {}

    async def run_analysis(
        self,
        project_path: str,
        notes_path: Optional[str] = None,
        issues_path: Optional[str] = None,
        output_dir: Optional[str] = None,
    ) -> Dict[str, Any]:
        root = Path(project_path).resolve()
        if not root.exists():
            raise ToolkitError(f"Project path does not exist: {project_path}")
        if not root.is_dir():
            raise ToolkitError(f"Project path is not a directory: {project_path}")

        out = Path(output_dir) if output_dir else Path(tempfile.mkdtemp(prefix="posthire_"))

        settings = AnalysisSettings(root=root, output_dir=out)
        pipeline = PostHirePipeline(settings)

        notes_p = Path(notes_path) if notes_path else None
        issues_p = Path(issues_path) if issues_path else None

        logger.info("post_hire_analysis_start", project=root.name, output_dir=str(out))

        reports = pipeline.run(notes_path=notes_p, issues_path=issues_p)
        bundle_path = pipeline.write_reports(reports)

        logger.info("post_hire_analysis_complete", project=root.name, bundle=str(bundle_path))

        return {
            "project_id": root.name,
            "bundle_path": str(bundle_path),
            "output_dir": str(out),
            "reports": reports,
        }

    async def export_for_rust(
        self,
        project_path: str,
        reports: Dict[str, Any],
        endpoint_url: str,
        bearer_token: Optional[str] = None,
        export_dir: Optional[str] = None,
    ) -> Dict[str, Any]:
        root = Path(project_path).resolve()
        out = Path(export_dir) if export_dir else Path(tempfile.mkdtemp(prefix="posthire_export_"))

        export_settings = ExportSettings(
            endpoint_url=endpoint_url,
            bearer_token=bearer_token or "",
            export_dir=out,
        )

        project_id = root.name
        payload = make_rust_friendly_payload(project_id, reports)
        write_export_bundle(payload, out, project_id)

        if endpoint_url:
            result = send_json_to_hetzner(payload, export_settings)
            logger.info("post_hire_export_sent", project=project_id, endpoint=endpoint_url)
            return {"project_id": project_id, "export_result": result, "payload": payload}

        logger.info("post_hire_export_local_only", project=project_id, export_dir=str(out))
        return {"project_id": project_id, "payload": payload, "export_dir": str(out)}

    def get_report_summary(self, reports: Dict[str, Any]) -> Dict[str, Any]:
        summary = {}
        report_keys = {
            "inventory": ["repo_name", "total_files", "languages", "frameworks"],
            "architecture": ["api_routes", "frontend_routes", "services"],
            "dependencies": ["frontend_dependencies", "backend_dependencies"],
            "env_surface": ["env_vars_detected", "providers"],
            "database": ["database_type", "tables"],
            "security": ["issues", "strengths"],
            "risk_register": ["technical_risks", "delivery_risks", "confidence_score"],
            "implementation_plan": ["quick_wins", "phase_1", "blockers"],
            "upsell_opportunities": ["easy_upsells", "high_value_upsells"],
        }
        for key, fields in report_keys.items():
            if key in reports and reports[key]:
                summary[key] = {f: reports[key].get(f) for f in fields if f in reports[key]}
        return summary


post_hire_service = PostHireService()

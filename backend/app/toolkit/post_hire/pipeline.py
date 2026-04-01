from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

from .architecture_mapper import map_architecture
from .api_contract_extractor import extract_api_contracts
from .client_context_builder import build_client_context
from .config import AnalysisSettings, ExportSettings
from .database_schema_extractor import extract_database_schema
from .decision_log_extractor import extract_decision_log
from .dependency_audit import audit_dependencies
from .docs_digest import digest_docs
from .env_surface_mapper import map_env_surface
from .hetzner_exporter import make_rust_friendly_payload, send_json_to_hetzner, write_export_bundle
from .frontend_component_map import map_frontend_components
from .issue_backlog_parser import parse_issue_backlog
from .meeting_notes_to_json import notes_file_to_json
from .performance_hotspot_finder import find_hotspots
from .project_inventory import build_project_inventory
from .risk_register_generator import generate_risk_register
from .security_posture_snapshot import snapshot_security
from .test_coverage_profiler import profile_tests
from .implementation_plan_builder import build_implementation_plan
from .models import as_serializable_dict
from .upsell_opportunity_finder import find_upsell_opportunities


class PostHirePipeline:
    def __init__(self, settings: AnalysisSettings):
        self.settings = settings

    def run(self, notes_path: Path | None = None, issues_path: Path | None = None) -> Dict[str, Any]:
        inventory = build_project_inventory(self.settings)
        architecture = map_architecture(self.settings)
        dependencies = audit_dependencies(self.settings)
        env_surface = map_env_surface(self.settings)
        database = extract_database_schema(self.settings)
        api_contracts = extract_api_contracts(self.settings)
        frontend = map_frontend_components(self.settings)
        tests = profile_tests(self.settings)
        hotspots = find_hotspots(self.settings)
        security = snapshot_security(self.settings)
        docs = digest_docs(self.settings)
        backlog = parse_issue_backlog(self.settings, issues_path)
        notes = notes_file_to_json(notes_path) if notes_path and notes_path.exists() else None
        risk = generate_risk_register(dependencies, tests, hotspots, security, docs, backlog)
        plan = build_implementation_plan(architecture, dependencies, hotspots, security, risk)
        upsell = find_upsell_opportunities(inventory, tests, security, docs)
        context = build_client_context(inventory, backlog, notes, risk) if notes else None
        decision_log = extract_decision_log("\n".join(notes.decisions)) if notes else None

        return {
            "inventory": as_serializable_dict(inventory),
            "architecture": as_serializable_dict(architecture),
            "dependencies": as_serializable_dict(dependencies),
            "env_surface": as_serializable_dict(env_surface),
            "database": as_serializable_dict(database),
            "api_contracts": as_serializable_dict(api_contracts),
            "frontend": as_serializable_dict(frontend),
            "tests": as_serializable_dict(tests),
            "hotspots": as_serializable_dict(hotspots),
            "security": as_serializable_dict(security),
            "docs": as_serializable_dict(docs),
            "backlog": as_serializable_dict(backlog),
            "meeting_notes": as_serializable_dict(notes) if notes else None,
            "risk_register": as_serializable_dict(risk),
            "implementation_plan": as_serializable_dict(plan),
            "client_context": as_serializable_dict(context) if context else None,
            "decision_log": as_serializable_dict(decision_log) if decision_log else None,
            "upsell_opportunities": as_serializable_dict(upsell),
        }

    def write_reports(self, reports: Dict[str, Any]) -> Path:
        out_dir = self.settings.output_dir
        out_dir.mkdir(parents=True, exist_ok=True)
        for name, payload in reports.items():
            if payload is None:
                continue
            path = out_dir / f"{name}.json"
            path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
        bundle_path = out_dir / "all_reports.json"
        bundle_path.write_text(json.dumps(reports, indent=2, ensure_ascii=False), encoding="utf-8")
        return bundle_path

    def export_for_rust_analysis(self, reports: Dict[str, Any], export_settings: ExportSettings) -> Dict[str, Any]:
        project_id = self.settings.root.name
        payload = make_rust_friendly_payload(project_id, reports)
        write_export_bundle(payload, export_settings.export_dir, project_id)
        return send_json_to_hetzner(payload, export_settings)

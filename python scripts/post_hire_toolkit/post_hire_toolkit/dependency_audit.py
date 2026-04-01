from __future__ import annotations

import json
import re
from pathlib import Path

from .config import AnalysisSettings
from .models import DependencyAuditReport


SUSPICIOUS = {"left-pad", "request", "node-sass", "moment"}
DUPLICATE_GROUPS = [
    {"axios", "ky", "got", "node-fetch", "cross-fetch"},
    {"react-query", "@tanstack/react-query", "swr"},
    {"jest", "vitest", "mocha"},
]


def _parse_requirements(path: Path) -> dict[str, str]:
    deps: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "==" in line:
            name, version = line.split("==", 1)
        elif ">=" in line:
            name, version = line.split(">=", 1)
        else:
            name, version = line, ""
        deps[name.strip()] = version.strip()
    return deps


def audit_dependencies(settings: AnalysisSettings) -> DependencyAuditReport:
    root = settings.root
    frontend: dict[str, str] = {}
    backend: dict[str, str] = {}
    dev: dict[str, str] = {}
    suspicious: set[str] = set()
    notes: list[str] = []

    package_json = root / "package.json"
    if package_json.exists():
        try:
            data = json.loads(package_json.read_text(encoding="utf-8", errors="ignore"))
            frontend.update(data.get("dependencies", {}))
            dev.update(data.get("devDependencies", {}))
        except json.JSONDecodeError:
            notes.append("package.json could not be parsed cleanly.")

    for req_name in ("requirements.txt", "requirements-dev.txt"):
        req = root / req_name
        if req.exists():
            backend.update(_parse_requirements(req))

    pyproject = root / "pyproject.toml"
    if pyproject.exists():
        text = pyproject.read_text(encoding="utf-8", errors="ignore")
        for match in re.finditer(r'([A-Za-z0-9_\-]+)\s*=\s*"([^"]+)"', text):
            name, version = match.groups()
            if name.lower() not in {"name", "version", "description", "requires-python"}:
                backend.setdefault(name, version)

    all_deps = {**frontend, **backend, **dev}
    for dep in all_deps:
        if dep in SUSPICIOUS:
            suspicious.add(dep)

    duplicates = []
    dep_names = set(all_deps)
    for group in DUPLICATE_GROUPS:
        present = sorted(dep_names.intersection(group))
        if len(present) > 1:
            duplicates.append(", ".join(present))

    return DependencyAuditReport(
        frontend_dependencies=dict(sorted(frontend.items())),
        backend_dependencies=dict(sorted(backend.items())),
        dev_dependencies=dict(sorted(dev.items())),
        possible_duplicates=duplicates,
        suspicious_dependencies=sorted(suspicious),
        notes=notes,
    )

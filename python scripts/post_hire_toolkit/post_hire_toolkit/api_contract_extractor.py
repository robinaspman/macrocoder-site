from __future__ import annotations

import re

from .config import AnalysisSettings
from .models import APIContractReport
from .utils.fs import iter_project_files, relative_posix
from .utils.text import read_text_safe


EXPRESS_RE = re.compile(r"app\.(get|post|put|patch|delete)\(['\"]([^'\"]+)['\"]")
FASTAPI_RE = re.compile(r"@(?:router|app)\.(get|post|put|patch|delete)\(['\"]([^'\"]+)['\"]")
PARAM_RE = re.compile(r"(body|query|params|request\.json|Depends\()")
AUTH_RE = re.compile(r"(Authorization|Bearer|jwt|session|clerk|auth)", re.I)
ERROR_RE = re.compile(r"(raise HTTPException|res\.status\(|throw new Error|except\s+[A-Za-z_]+)")


def extract_api_contracts(settings: AnalysisSettings) -> APIContractReport:
    endpoints: list[dict] = []
    auth_patterns: set[str] = set()
    response_patterns: set[str] = set()
    error_patterns: set[str] = set()

    for path in iter_project_files(settings.root, settings):
        if path.suffix.lower() not in {".py", ".ts", ".tsx", ".js", ".jsx"}:
            continue
        rel = relative_posix(settings.root, path)
        text = read_text_safe(path, settings.sample_text_bytes)
        for regex in (EXPRESS_RE, FASTAPI_RE):
            for method, route in regex.findall(text):
                endpoints.append({
                    "path": route,
                    "method": method.upper(),
                    "auth": bool(AUTH_RE.search(text)),
                    "params_detected": bool(PARAM_RE.search(text)),
                    "source": rel,
                })
        if AUTH_RE.search(text):
            auth_patterns.add(rel)
        if "json(" in text or "JSONResponse" in text:
            response_patterns.add(rel)
        if ERROR_RE.search(text):
            error_patterns.add(rel)

    return APIContractReport(
        endpoints=endpoints[:300],
        auth_patterns=sorted(auth_patterns),
        response_patterns=sorted(response_patterns),
        error_patterns=sorted(error_patterns),
    )

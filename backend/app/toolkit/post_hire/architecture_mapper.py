from __future__ import annotations

import re
from pathlib import Path

from .config import AnalysisSettings
from .models import ArchitectureMap
from .utils.fs import iter_project_files, relative_posix
from .utils.text import read_text_safe


ROUTE_HINTS = [
    re.compile(r"app/([^/]+)/page\.(tsx|jsx|js|ts)$"),
    re.compile(r"pages/([^/]+)\.(tsx|jsx|js|ts)$"),
]
API_ROUTE_RE = re.compile(r"(GET|POST|PUT|PATCH|DELETE)\s*\(?[^\n]{0,40}(\/[A-Za-z0-9_\-/{}:]+)?")
EXPRESS_RE = re.compile(r"app\.(get|post|put|patch|delete)\(['\"]([^'\"]+)['\"]")
FASTAPI_RE = re.compile(r"@app\.(get|post|put|patch|delete)\(['\"]([^'\"]+)['\"]")
CRON_RE = re.compile(r"(cron|schedule|celery|apscheduler|bullmq)", re.I)
WEBHOOK_RE = re.compile(r"webhook", re.I)
MODEL_RE = re.compile(r"class\s+([A-Z][A-Za-z0-9_]+)\((Base|models\.Model|SQLModel)")
MIDDLEWARE_RE = re.compile(r"middleware|rateLimit|helmet|cors|authMiddleware", re.I)


def map_architecture(settings: AnalysisSettings) -> ArchitectureMap:
    routes: set[str] = set()
    api_routes: list[dict] = []
    middleware: set[str] = set()
    jobs: set[str] = set()
    webhooks: set[str] = set()
    cron_jobs: set[str] = set()
    services: set[str] = set()
    models: set[str] = set()
    notes: list[str] = []

    for path in iter_project_files(settings.root, settings):
        rel = relative_posix(settings.root, path)
        low_rel = rel.lower()

        for route_re in ROUTE_HINTS:
            match = route_re.search(rel)
            if match:
                slug = match.group(1).replace("index", "")
                routes.add("/" + slug.strip("/"))

        if "/api/" in low_rel or path.name.endswith((".py", ".ts", ".js")):
            text = read_text_safe(path, settings.sample_text_bytes)
            for m in EXPRESS_RE.finditer(text):
                api_routes.append({"method": m.group(1).upper(), "path": m.group(2), "source": rel})
            for m in FASTAPI_RE.finditer(text):
                api_routes.append({"method": m.group(1).upper(), "path": m.group(2), "source": rel})

            if MIDDLEWARE_RE.search(text):
                middleware.add(rel)
            if CRON_RE.search(text):
                cron_jobs.add(rel)
            if WEBHOOK_RE.search(text) or "webhook" in low_rel:
                webhooks.add(rel)
            if "service" in low_rel:
                services.add(rel)
            for model_match in MODEL_RE.finditer(text):
                models.add(model_match.group(1))
            if "queue" in low_rel or "worker" in low_rel:
                jobs.add(rel)

    if not api_routes:
        notes.append("No explicit API route decorators or handlers were detected.")
    return ArchitectureMap(
        frontend_routes=sorted(x for x in routes if x != "/"),
        api_routes=api_routes[:250],
        middleware=sorted(middleware),
        background_jobs=sorted(jobs),
        webhooks=sorted(webhooks),
        cron_jobs=sorted(cron_jobs),
        services=sorted(services),
        models=sorted(models),
        notes=notes,
    )

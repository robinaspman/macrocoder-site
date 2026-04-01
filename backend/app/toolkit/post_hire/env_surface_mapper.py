from __future__ import annotations

import re

from .config import AnalysisSettings
from .models import EnvSurfaceReport
from .utils.fs import iter_project_files, relative_posix
from .utils.text import read_text_safe


ENV_USE_RE = re.compile(r"(?:process\.env|os\.environ\.get|os\.getenv|env\[['\"])([A-Z][A-Z0-9_]{2,})")
ENV_DECL_RE = re.compile(r"^([A-Z][A-Z0-9_]{2,})=", re.M)
HARDCODED_SECRET_RE = re.compile(
    r"(api[_-]?key|secret|token|password)\s*[:=]\s*['\"]([^'\"]{8,})['\"]", re.I
)


def map_env_surface(settings: AnalysisSettings) -> EnvSurfaceReport:
    used: set[str] = set()
    example: set[str] = set()
    hardcoded: list[dict] = []
    providers: set[str] = set()
    notes: list[str] = []

    for path in iter_project_files(settings.root, settings):
        rel = relative_posix(settings.root, path)
        text = read_text_safe(path, settings.sample_text_bytes)
        if ".env.example" in rel or "example.env" in rel.lower():
            example.update(ENV_DECL_RE.findall(text))
        used.update(ENV_USE_RE.findall(text))
        for m in HARDCODED_SECRET_RE.finditer(text):
            hardcoded.append({"path": rel, "key": m.group(1), "value_preview": m.group(2)[:4] + "..."})
        low = text.lower()
        for provider in ("stripe", "supabase", "openai", "anthropic", "resend", "sendgrid", "postgres", "s3"):
            if provider in low:
                providers.add(provider)

    missing = sorted(used - example)
    if missing:
        notes.append("Some used environment variables were not found in an example file.")
    return EnvSurfaceReport(
        env_vars_detected=sorted(used),
        env_example_vars=sorted(example),
        missing_in_example_file=missing,
        hardcoded_secret_risks=hardcoded[:50],
        providers=sorted(providers),
        notes=notes,
    )

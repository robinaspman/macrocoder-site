from __future__ import annotations

from pathlib import Path

from .config import AnalysisSettings
from .models import DocsDigestReport
from .utils.fs import iter_project_files, relative_posix
from .utils.text import compact_ws, read_text_safe


def digest_docs(settings: AnalysisSettings) -> DocsDigestReport:
    summaries: dict[str, str] = {}
    docs: list[str] = []
    contradictions: list[str] = []

    for path in iter_project_files(settings.root, settings):
        rel = relative_posix(settings.root, path)
        if path.suffix.lower() not in {".md", ".txt"}:
            continue
        if "readme" in rel.lower() or "docs/" in rel.lower():
            docs.append(rel)
            text = read_text_safe(path, 20_000)
            summaries[rel] = compact_ws(text)[:300]

    docs_present = bool(docs)
    quality = "high" if len(docs) >= 4 else "medium" if len(docs) >= 2 else "low" if docs else "none"
    missing = []
    names = " ".join(docs).lower()
    if "deploy" not in names:
        missing.append("deployment runbook")
    if "env" not in names and "setup" not in names:
        missing.append("environment setup guide")
    if "architecture" not in names:
        missing.append("architecture overview")

    readme_summary = " ".join(v.lower() for k, v in summaries.items() if "readme" in k.lower())
    if "vercel" in readme_summary and any("docker" in x.lower() for x in docs):
        contradictions.append("README mentions Vercel while docs also reference Docker deployment.")
    return DocsDigestReport(
        docs_present=docs_present,
        onboarding_quality=quality,
        summaries=summaries,
        missing_docs=missing,
        contradictions=contradictions,
    )

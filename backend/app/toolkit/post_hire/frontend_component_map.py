from __future__ import annotations

import re

from .config import AnalysisSettings
from .models import FrontendComponentReport
from .utils.fs import iter_project_files, relative_posix
from .utils.text import read_text_safe


COMPONENT_RE = re.compile(r"export default function\s+([A-Z][A-Za-z0-9_]+)|function\s+([A-Z][A-Za-z0-9_]+)")
FORM_RE = re.compile(r"<form|useForm|react-hook-form", re.I)
LAYOUT_RE = re.compile(r"Layout", re.I)
PATTERN_HINTS = {
    "accordion": "accordion",
    "modal": "modal",
    "pricing": "pricing cards",
    "faq": "faq",
    "table": "tables",
    "dashboard": "dashboard surfaces",
}


def map_frontend_components(settings: AnalysisSettings) -> FrontendComponentReport:
    shared: set[str] = set()
    layouts: set[str] = set()
    pages: set[str] = set()
    forms: set[str] = set()
    patterns: set[str] = set()
    notes: list[str] = []

    for path in iter_project_files(settings.root, settings):
        if path.suffix.lower() not in {".tsx", ".jsx", ".js", ".ts"}:
            continue
        rel = relative_posix(settings.root, path)
        text = read_text_safe(path, settings.sample_text_bytes)
        for m in COMPONENT_RE.finditer(text):
            name = m.group(1) or m.group(2)
            if not name:
                continue
            if "component" in rel.lower() or "/ui/" in rel.lower():
                shared.add(name)
            if LAYOUT_RE.search(name):
                layouts.add(name)
        if "page." in rel or rel.startswith("pages/"):
            pages.add(rel)
        if FORM_RE.search(text):
            forms.add(rel)
        low = text.lower() + " " + rel.lower()
        for needle, label in PATTERN_HINTS.items():
            if needle in low:
                patterns.add(label)

    if not shared:
        notes.append("No obvious shared component library detected.")
    return FrontendComponentReport(
        shared_components=sorted(shared),
        layout_components=sorted(layouts),
        pages_or_views=sorted(pages),
        repeated_ui_patterns=sorted(patterns),
        form_views=sorted(forms),
        notes=notes,
    )

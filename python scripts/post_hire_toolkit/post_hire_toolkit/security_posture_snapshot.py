from __future__ import annotations

import re

from .config import AnalysisSettings
from .models import SecuritySnapshot
from .utils.fs import iter_project_files, relative_posix
from .utils.text import read_text_safe


CORS_RE = re.compile(r"cors\((.*?)\)", re.S | re.I)
WEBHOOK_SIG_RE = re.compile(r"(stripe|webhook).*(signature|sig)", re.I)
FILE_UPLOAD_RE = re.compile(r"(multer|upload|file)", re.I)


def snapshot_security(settings: AnalysisSettings) -> SecuritySnapshot:
    issues: list[dict] = []
    strengths: set[str] = set()
    notes: list[str] = []

    for path in iter_project_files(settings.root, settings):
        rel = relative_posix(settings.root, path)
        if path.suffix.lower() not in {".py", ".ts", ".tsx", ".js", ".jsx"}:
            continue
        text = read_text_safe(path, settings.sample_text_bytes)
        low = text.lower()
        if "cors(" in low and ("*" in low or "allow_origins=['*']" in low.replace('"', "'")):
            issues.append({"severity": "medium", "issue": "overly broad CORS policy", "source": rel})
        if "webhook" in low and not WEBHOOK_SIG_RE.search(text):
            issues.append({"severity": "high", "issue": "webhook without obvious signature verification", "source": rel})
        if FILE_UPLOAD_RE.search(text) and "content-type" not in low and "mime" not in low:
            issues.append({"severity": "medium", "issue": "file upload without obvious content validation", "source": rel})
        if "helmet(" in low or "secure_headers" in low:
            strengths.add("secure headers present")
        if "csrf" in low:
            strengths.add("csrf protection referenced")
        if "rateLimit" in text or "slowapi" in low:
            strengths.add("rate limiting referenced")

    if not strengths:
        notes.append("No obvious hardening middleware was detected from static analysis.")
    return SecuritySnapshot(issues=issues[:100], strengths=sorted(strengths), notes=notes)

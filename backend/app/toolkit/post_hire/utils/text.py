from __future__ import annotations

import re
from pathlib import Path
from typing import Iterable


WHITESPACE_RE = re.compile(r"\s+")
SECRET_PATTERNS = [
    re.compile(r"(api[_-]?key\s*[:=]\s*)(['\"]?)[A-Za-z0-9_\-]{12,}\2", re.I),
    re.compile(r"(secret\s*[:=]\s*)(['\"]?)[A-Za-z0-9_\-]{8,}\2", re.I),
    re.compile(r"(token\s*[:=]\s*)(['\"]?)[A-Za-z0-9_\-]{8,}\2", re.I),
]


def compact_ws(value: str) -> str:
    return WHITESPACE_RE.sub(" ", value).strip()


def summarize_lines(lines: Iterable[str], limit: int = 3) -> str:
    cleaned = [compact_ws(x) for x in lines if compact_ws(x)]
    return " | ".join(cleaned[:limit])


def read_text_safe(path: Path, max_bytes: int) -> str:
    with path.open("rb") as fh:
        data = fh.read(max_bytes + 1)
    if len(data) > max_bytes:
        data = data[:max_bytes]
    return data.decode("utf-8", errors="replace")


def redact_secrets(value: str) -> str:
    redacted = value
    for pattern in SECRET_PATTERNS:
        redacted = pattern.sub(lambda m: f"{m.group(1)}<redacted>", redacted)
    return redacted

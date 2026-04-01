from __future__ import annotations

import re
from pathlib import Path

from .models import DecisionLog
from .utils.text import compact_ws


DECISION_RE = re.compile(
    r"(?P<prefix>decision:|decided:|we decided|approved|rejected)\s*(?P<body>[^\n.]{3,200})",
    re.I,
)


def extract_decision_log(text: str) -> DecisionLog:
    decisions = []
    for match in DECISION_RE.finditer(text):
        decisions.append({"decision": compact_ws(match.group("body")), "source": compact_ws(match.group("prefix"))})
    return DecisionLog(decisions=decisions[:50])


def extract_decision_log_from_file(path: Path) -> DecisionLog:
    return extract_decision_log(path.read_text(encoding="utf-8", errors="ignore"))

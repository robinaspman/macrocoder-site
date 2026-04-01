from __future__ import annotations

import re
from pathlib import Path

from .models import MeetingNotesReport
from .utils.text import compact_ws


REQ_RE = re.compile(r"\b(need|must|should|want|require)\b[^.:\n]{0,120}", re.I)
BUDGET_RE = re.compile(r"(\$|€|£)?\s?\d[\d,]*(?:\s?(?:usd|eur|sek|dollars?))?", re.I)
DATE_RE = re.compile(r"\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}/\d{1,2}/\d{2,4}|q[1-4]|week \d+|in \d+ weeks?)\b", re.I)
QUESTION_RE = re.compile(r"[^.?!\n]*\?+")
NAME_RE = re.compile(r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b")


def notes_to_json(text: str) -> MeetingNotesReport:
    requirements = [compact_ws(x.group(0)) for x in REQ_RE.finditer(text)]
    constraints = [line.strip("-• ").strip() for line in text.splitlines() if "constraint" in line.lower() or "cannot" in line.lower()]
    budgets = [compact_ws(x.group(0)) for x in BUDGET_RE.finditer(text)]
    deadlines = [compact_ws(x.group(0)) for x in DATE_RE.finditer(text)]
    questions = [compact_ws(x.group(0)) for x in QUESTION_RE.finditer(text)]
    decisions = [line.strip("-• ").strip() for line in text.splitlines() if line.lower().startswith(("decision:", "decided:", "we decided"))]
    stakeholders = sorted({x.group(0) for x in NAME_RE.finditer(text) if len(x.group(0).split()) <= 2})[:15]

    return MeetingNotesReport(
        requirements=requirements[:30],
        constraints=constraints[:20],
        budget_mentions=budgets[:20],
        deadlines=deadlines[:20],
        stakeholders=stakeholders,
        unresolved_questions=questions[:20],
        decisions=decisions[:20],
    )


def notes_file_to_json(path: Path) -> MeetingNotesReport:
    return notes_to_json(path.read_text(encoding="utf-8", errors="ignore"))

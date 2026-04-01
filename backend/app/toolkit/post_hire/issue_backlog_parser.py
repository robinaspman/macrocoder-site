from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

from .config import AnalysisSettings
from .models import IssueBacklogReport
from .utils.text import compact_ws


BUG_WORDS = {"bug", "error", "broken", "fail", "issue", "crash"}
FEATURE_WORDS = {"feature", "add", "support", "implement", "new"}
INFRA_WORDS = {"deploy", "docker", "ci", "infra", "server", "uptime", "scale"}


def parse_issue_backlog(settings: AnalysisSettings, backlog_path: Path | None = None) -> IssueBacklogReport:
    path = backlog_path or settings.root / "issues.json"
    samples: list[dict] = []
    theme_counter: Counter[str] = Counter()
    bugs = features = infra = 0

    if not path.exists():
        return IssueBacklogReport()

    raw = path.read_text(encoding="utf-8", errors="ignore")
    data = json.loads(raw) if raw.strip().startswith("[") else [{"title": x} for x in raw.splitlines() if x.strip()]
    for item in data[: settings.issue_backlog_limit]:
        title = compact_ws(str(item.get("title", "")))
        body = compact_ws(str(item.get("body", "")))
        text = f"{title} {body}".lower()
        samples.append({"title": title, "state": item.get("state", "unknown")})
        if any(word in text for word in BUG_WORDS):
            bugs += 1
        if any(word in text for word in FEATURE_WORDS):
            features += 1
        if any(word in text for word in INFRA_WORDS):
            infra += 1
        for token in re.findall(r"[a-z]{4,}", text):
            if token not in BUG_WORDS | FEATURE_WORDS | INFRA_WORDS:
                theme_counter[token] += 1

    themes = [word for word, _ in theme_counter.most_common(10)]
    return IssueBacklogReport(
        bug_count=bugs,
        feature_count=features,
        infra_count=infra,
        top_repeated_themes=themes,
        issue_samples=samples[:20],
    )

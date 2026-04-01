from __future__ import annotations

from .config import AnalysisSettings
from .models import HotspotReport
from .utils.fs import iter_project_files, relative_posix
from .utils.text import read_text_safe


def find_hotspots(settings: AnalysisSettings) -> HotspotReport:
    hotspots: list[dict] = []
    for path in iter_project_files(settings.root, settings):
        rel = relative_posix(settings.root, path)
        try:
            size = path.stat().st_size
        except OSError:
            continue
        text = ""
        if path.suffix.lower() in settings.security.allowed_text_extensions:
            text = read_text_safe(path, min(settings.sample_text_bytes, 80_000))
        reason_parts = []
        if size > 120_000 and path.suffix.lower() in {".tsx", ".ts", ".js", ".jsx", ".py"}:
            reason_parts.append("large source file")
        if text.count("fetch(") >= 4 or text.count("axios.") >= 4:
            reason_parts.append("many request calls")
        if "SELECT" in text and "for " in text:
            reason_parts.append("possible query loop")
        if "useEffect(" in text and text.count("useState(") >= 8:
            reason_parts.append("complex client state")
        if "synchronously" in text.lower():
            reason_parts.append("sync work hint")
        if reason_parts:
            hotspots.append({"file": rel, "reason": ", ".join(reason_parts), "bytes": size})

    hotspots.sort(key=lambda x: (len(x["reason"]), x["bytes"]), reverse=True)
    return HotspotReport(hotspots=hotspots[: settings.top_hotspots], notes=[])

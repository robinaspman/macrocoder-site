from __future__ import annotations

import gzip
import json
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict, Iterable

from .config import ExportSettings
from .exceptions import ExportError
from .models import ExportManifest, as_serializable_dict
from .utils.hash import sha256_file, stable_json_hash


def write_export_bundle(payload: Dict[str, Any], out_dir: Path, project_id: str) -> tuple[Path, ExportManifest]:
    out_dir.mkdir(parents=True, exist_ok=True)
    json_path = out_dir / f"{project_id}.analysis.json"
    json_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    checksum = sha256_file(json_path)
    manifest = ExportManifest(
        project_id=project_id,
        generated_files=[json_path.name],
        checksum=checksum,
        compressed=False,
        sent_to=None,
    )
    manifest_path = out_dir / f"{project_id}.manifest.json"
    manifest_path.write_text(json.dumps(as_serializable_dict(manifest), indent=2), encoding="utf-8")
    return json_path, manifest


def send_json_to_hetzner(payload: Dict[str, Any], settings: ExportSettings) -> Dict[str, Any]:
    if not settings.endpoint_url:
        raise ExportError("endpoint_url is required to send data to Hetzner")
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "X-Payload-Hash": stable_json_hash(payload),
    }
    if settings.bearer_token:
        headers["Authorization"] = f"Bearer {settings.bearer_token}"
    if settings.gzip_payload:
        body = gzip.compress(body)
        headers["Content-Encoding"] = "gzip"

    request = urllib.request.Request(settings.endpoint_url, data=body, headers=headers, method="POST")
    last_error: Exception | None = None
    for attempt in range(settings.retries + 1):
        try:
            with urllib.request.urlopen(request, timeout=settings.timeout_seconds) as response:
                raw = response.read().decode("utf-8", errors="replace")
                try:
                    return json.loads(raw) if raw.strip() else {"status": "ok", "http_status": response.status}
                except json.JSONDecodeError:
                    return {"status": "ok", "http_status": response.status, "raw": raw}
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            last_error = exc
            if attempt >= settings.retries:
                break
            time.sleep(0.6 * (attempt + 1))
    raise ExportError(f"Hetzner export failed: {last_error}")


def make_rust_friendly_payload(project_id: str, reports: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "project_id": project_id,
        "generated_at": int(time.time()),
        "schema_version": 1,
        "reports": reports,
    }

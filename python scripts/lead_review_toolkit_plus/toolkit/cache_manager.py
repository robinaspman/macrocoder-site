from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .config import CacheSettings
from .utils.hash import fingerprint_data


@dataclass(slots=True)
class DiskCache:
    settings: CacheSettings = field(default_factory=CacheSettings)

    def __post_init__(self) -> None:
        self.settings.cache_dir.mkdir(parents=True, exist_ok=True)

    def key_for(self, namespace: str, payload: Any) -> str:
        return f"{namespace}:{fingerprint_data(payload)}"

    def _path_for(self, key: str) -> Path:
        digest = fingerprint_data(key)
        return self.settings.cache_dir / f"{digest}.json"

    def get(self, key: str) -> Any | None:
        path = self._path_for(key)
        if not path.exists():
            return None
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return None
        expires_at = payload.get("expires_at")
        if expires_at and time.time() > expires_at:
            try:
                path.unlink(missing_ok=True)
            except OSError:
                pass
            return None
        return payload.get("value")

    def set(self, key: str, value: Any, ttl_seconds: int | None = None) -> None:
        ttl = ttl_seconds or self.settings.default_ttl_seconds
        payload = {
            "created_at": time.time(),
            "expires_at": time.time() + ttl if ttl else None,
            "value": value,
        }
        path = self._path_for(key)
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

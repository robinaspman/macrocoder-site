from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .exceptions import QuoteVersionError
from .models import Estimate, QuoteRecord, as_serializable_dict
from .utils.hash import fingerprint_data, sign_text
from .utils.text import json_dumps_canonical


@dataclass(slots=True)
class QuoteVersioner:
    storage_dir: Path = Path(".quotes")
    secret: str = "change-me-in-production"

    def __post_init__(self) -> None:
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def create_or_update(self, quote_id: str, inputs: Any, estimate: Estimate) -> QuoteRecord:
        if not quote_id.strip():
            raise QuoteVersionError("quote_id cannot be empty.")
        record_dir = self.storage_dir / quote_id
        record_dir.mkdir(parents=True, exist_ok=True)

        versions = sorted(p for p in record_dir.glob("v*.json"))
        next_version = len(versions) + 1
        inputs_fingerprint = fingerprint_data(inputs)
        created_at = datetime.now(timezone.utc).isoformat()

        base_payload = {
            "quote_id": quote_id,
            "version": next_version,
            "created_at": created_at,
            "price_range": estimate.price_range,
            "package_tier": estimate.package_tier,
            "assumptions": estimate.assumptions,
            "exclusions": estimate.exclusions,
            "milestone_suggestion": [as_serializable_dict(m) for m in estimate.milestone_suggestion],
            "inputs_fingerprint": inputs_fingerprint,
        }
        signature = sign_text(self.secret, json_dumps_canonical(base_payload))
        base_payload["signature"] = signature

        path = record_dir / f"v{next_version}.json"
        path.write_text(json.dumps(base_payload, ensure_ascii=False, indent=2), encoding="utf-8")

        return QuoteRecord(
            quote_id=quote_id,
            version=next_version,
            created_at=created_at,
            price_range=estimate.price_range,
            package_tier=estimate.package_tier,
            assumptions=estimate.assumptions,
            exclusions=estimate.exclusions,
            milestone_suggestion=estimate.milestone_suggestion,
            inputs_fingerprint=inputs_fingerprint,
            signature=signature,
        )

    def verify(self, quote_id: str, version: int) -> bool:
        path = self.storage_dir / quote_id / f"v{version}.json"
        if not path.exists():
            raise QuoteVersionError("Quote version not found.")
        payload = json.loads(path.read_text(encoding="utf-8"))
        signature = payload.pop("signature", "")
        expected = sign_text(self.secret, json_dumps_canonical(payload))
        return signature == expected

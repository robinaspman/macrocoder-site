from __future__ import annotations

import hashlib
import hmac
from typing import Any

from .text import json_dumps_canonical


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def fingerprint_data(data: Any) -> str:
    return sha256_text(json_dumps_canonical(data))


def sign_text(secret: str, text: str) -> str:
    return hmac.new(secret.encode("utf-8"), text.encode("utf-8"), hashlib.sha256).hexdigest()

from __future__ import annotations

import copy
import re
from dataclasses import dataclass, field
from typing import Any

from .utils.text import normalize_whitespace

_EMAIL_RE = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)
_PHONE_RE = re.compile(r"(?:(?<=\s)|^)(?:\+?\d[\d\s().-]{7,}\d)(?=\s|$)")
_BEARER_RE = re.compile(r"\bBearer\s+[A-Za-z0-9._~+/=-]{8,}\b", re.IGNORECASE)
_JWT_RE = re.compile(r"\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9._-]{8,}\.[A-Za-z0-9._-]{8,}\b")
_IP_RE = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")
_GH_TOKEN_RE = re.compile(r"\bgh[pousr]_[A-Za-z0-9]{20,}\b")
_OPENAI_KEY_RE = re.compile(r"\bsk-[A-Za-z0-9]{20,}\b")
_STRIPE_KEY_RE = re.compile(r"\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9]{16,}\b")
_GENERIC_SECRET_RE = re.compile(
    r"(?i)(api[_-]?key|secret|token|password)\s*[:=]\s*['\"]?([A-Za-z0-9_./+=-]{8,})['\"]?"
)


@dataclass(slots=True)
class SensitiveDataScrubber:
    replace_email_with: str = "[redacted-email]"
    replace_phone_with: str = "[redacted-phone]"
    replace_token_with: str = "[redacted-token]"
    replace_ip_with: str = "[redacted-ip]"
    normalize: bool = True
    preserve_shape: bool = False
    patterns: list[tuple[re.Pattern[str], str]] = field(init=False)

    def __post_init__(self) -> None:
        self.patterns = [
            (_EMAIL_RE, self.replace_email_with),
            (_PHONE_RE, self.replace_phone_with),
            (_BEARER_RE, self.replace_token_with),
            (_JWT_RE, self.replace_token_with),
            (_GH_TOKEN_RE, self.replace_token_with),
            (_OPENAI_KEY_RE, self.replace_token_with),
            (_STRIPE_KEY_RE, self.replace_token_with),
            (_IP_RE, self.replace_ip_with),
        ]

    def _mask(self, replacement: str, original: str) -> str:
        if not self.preserve_shape:
            return replacement
        visible = min(3, len(original))
        return f"{replacement}:{original[:visible]}…"

    def scrub_text(self, text: str) -> str:
        if not text:
            return ""
        cleaned = text
        for pattern, replacement in self.patterns:
            cleaned = pattern.sub(lambda m: self._mask(replacement, m.group(0)), cleaned)

        def generic_secret_repl(match: re.Match[str]) -> str:
            key_name = match.group(1)
            secret = match.group(2)
            return f"{key_name}={self._mask(self.replace_token_with, secret)}"

        cleaned = _GENERIC_SECRET_RE.sub(generic_secret_repl, cleaned)
        return normalize_whitespace(cleaned) if self.normalize else cleaned

    def scrub(self, data: Any) -> Any:
        if isinstance(data, str):
            return self.scrub_text(data)
        if isinstance(data, dict):
            return {str(k): self.scrub(v) for k, v in data.items()}
        if isinstance(data, (list, tuple, set)):
            values = [self.scrub(v) for v in data]
            if isinstance(data, tuple):
                return tuple(values)
            if isinstance(data, set):
                return set(values)
            return values
        if hasattr(data, "__dict__"):
            clone = copy.deepcopy(data)
            for key, value in vars(clone).items():
                setattr(clone, key, self.scrub(value))
            return clone
        return data

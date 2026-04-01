from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from pathlib import Path

from .utils.hash import fingerprint_data


@dataclass(slots=True)
class CreditDecision:
    allowed: bool
    reason: str
    projected_cost_usd: float
    remaining_budget_usd: float
    remaining_requests: int


@dataclass(slots=True)
class CreditGuard:
    storage_dir: Path = Path('.credits')
    default_session_budget_usd: float = 1.5
    default_daily_budget_usd: float = 25.0
    max_requests_per_session: int = 12
    pricing_by_tier_per_1k_tokens: dict[str, float] = field(default_factory=lambda: {
        'small': 0.0025,
        'medium': 0.01,
        'large': 0.04,
    })

    def __post_init__(self) -> None:
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def _path(self, tenant_id: str) -> Path:
        return self.storage_dir / f"{fingerprint_data(tenant_id)}.json"

    def _load(self, tenant_id: str) -> dict:
        path = self._path(tenant_id)
        if not path.exists():
            return {"sessions": {}, "days": {}}
        try:
            return json.loads(path.read_text(encoding='utf-8'))
        except (OSError, json.JSONDecodeError):
            return {"sessions": {}, "days": {}}

    def _save(self, tenant_id: str, payload: dict) -> None:
        self._path(tenant_id).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')

    def estimate_cost_usd(self, model_tier: str, prompt_tokens: int, completion_tokens: int = 0) -> float:
        total = max(0, prompt_tokens) + max(0, completion_tokens)
        rate = self.pricing_by_tier_per_1k_tokens.get(model_tier, self.pricing_by_tier_per_1k_tokens['medium'])
        return round((total / 1000.0) * rate, 6)

    def allow_request(
        self,
        tenant_id: str,
        session_id: str,
        model_tier: str,
        prompt_tokens: int,
        completion_tokens: int = 0,
        session_budget_usd: float | None = None,
        daily_budget_usd: float | None = None,
    ) -> CreditDecision:
        now = time.time()
        day_key = time.strftime('%Y-%m-%d', time.gmtime(now))
        payload = self._load(tenant_id)
        sessions = payload.setdefault('sessions', {})
        days = payload.setdefault('days', {})

        session = sessions.setdefault(session_id, {'cost_usd': 0.0, 'requests': 0, 'updated_at': now})
        day = days.setdefault(day_key, {'cost_usd': 0.0, 'requests': 0})

        projected = self.estimate_cost_usd(model_tier, prompt_tokens, completion_tokens)
        sess_limit = session_budget_usd or self.default_session_budget_usd
        day_limit = daily_budget_usd or self.default_daily_budget_usd

        if session['requests'] >= self.max_requests_per_session:
            return CreditDecision(False, 'Session request cap reached.', projected, max(0.0, sess_limit - session['cost_usd']), 0)
        if session['cost_usd'] + projected > sess_limit:
            return CreditDecision(False, 'Session credit budget exceeded.', projected, max(0.0, sess_limit - session['cost_usd']), max(0, self.max_requests_per_session - session['requests']))
        if day['cost_usd'] + projected > day_limit:
            return CreditDecision(False, 'Daily credit budget exceeded.', projected, max(0.0, day_limit - day['cost_usd']), max(0, self.max_requests_per_session - session['requests']))

        session['cost_usd'] += projected
        session['requests'] += 1
        session['updated_at'] = now
        day['cost_usd'] += projected
        day['requests'] += 1
        self._save(tenant_id, payload)

        return CreditDecision(True, 'Allowed.', projected, max(0.0, sess_limit - session['cost_usd']), max(0, self.max_requests_per_session - session['requests']))

from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from pathlib import Path

from .utils.hash import fingerprint_data


@dataclass(slots=True)
class AbuseDecision:
    allowed: bool
    risk_score: int
    reason: str
    cooldown_seconds: int = 0


@dataclass(slots=True)
class AbuseGuard:
    storage_dir: Path = Path('.abuse')
    burst_window_seconds: int = 60
    burst_limit: int = 8
    duplicate_payload_limit: int = 4
    quote_recalc_limit: int = 6
    cooldown_seconds: int = 300

    def __post_init__(self) -> None:
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def _path(self, actor_id: str) -> Path:
        return self.storage_dir / f"{fingerprint_data(actor_id)}.json"

    def _load(self, actor_id: str) -> dict:
        path = self._path(actor_id)
        if not path.exists():
            return {'events': []}
        try:
            return json.loads(path.read_text(encoding='utf-8'))
        except (OSError, json.JSONDecodeError):
            return {'events': []}

    def _save(self, actor_id: str, payload: dict) -> None:
        self._path(actor_id).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')

    def evaluate(self, actor_id: str, action: str, payload: str = '') -> AbuseDecision:
        now = int(time.time())
        state = self._load(actor_id)
        events = state.setdefault('events', [])
        payload_fp = fingerprint_data({'action': action, 'payload': payload}) if payload else None

        # prune older than 1 day
        events = [e for e in events if now - int(e.get('ts', now)) <= 86400]
        state['events'] = events

        recent = [e for e in events if now - int(e.get('ts', now)) <= self.burst_window_seconds]
        burst_count = len(recent)
        dup_count = sum(1 for e in recent if payload_fp and e.get('payload_fp') == payload_fp)
        recalc_count = sum(1 for e in recent if e.get('action') == 'quote_recalc')

        risk = 0
        reasons: list[str] = []
        if burst_count >= self.burst_limit:
            risk += 45
            reasons.append('Burst limit exceeded')
        if dup_count >= self.duplicate_payload_limit:
            risk += 35
            reasons.append('Repeated identical payloads')
        if action == 'quote_recalc' and recalc_count >= self.quote_recalc_limit:
            risk += 65
            reasons.append('Too many quote recalculations')

        decision = AbuseDecision(True, risk, 'Allowed.')
        if risk >= 60:
            decision = AbuseDecision(False, risk, '; '.join(reasons) or 'High abuse risk.', self.cooldown_seconds)

        events.append({'ts': now, 'action': action, 'payload_fp': payload_fp})
        state['events'] = events
        self._save(actor_id, state)
        return decision

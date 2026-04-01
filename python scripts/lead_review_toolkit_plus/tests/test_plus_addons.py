import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from toolkit.abuse_guard import AbuseGuard
from toolkit.credit_guard import CreditGuard
from toolkit.job_post_extractor import JobPostExtractor
from toolkit.sensitive_data_scrubber import SensitiveDataScrubber


def test_scrubber_redacts_common_secrets():
    s = SensitiveDataScrubber()
    text = 'Contact me at test@example.com or +46 70 123 45 67, token=sk-1234567890ABCDEFGHIJ'
    cleaned = s.scrub_text(text)
    assert '[redacted-email]' in cleaned
    assert '[redacted-phone]' in cleaned
    assert '[redacted-token]' in cleaned


def test_job_post_extractor_finds_budget_and_skills():
    raw = 'Build a React + FastAPI MVP. Budget: $1500-2500. Timeline: 3 weeks. Skills: React, FastAPI, PostgreSQL.'
    result = JobPostExtractor().extract(raw)
    assert result.budget_min == 1500
    assert result.budget_max == 2500
    assert 'react' in [s.lower() for s in result.skills]


def test_credit_guard_allows_small_request(tmp_path):
    guard = CreditGuard(storage_dir=tmp_path / '.credits')
    decision = guard.allow_request('tenant-a', 'sess-1', 'small', 500, 200)
    assert decision.allowed is True


def test_abuse_guard_blocks_repetitive_recalc(tmp_path):
    guard = AbuseGuard(storage_dir=tmp_path / '.abuse', burst_limit=100, duplicate_payload_limit=100, quote_recalc_limit=2, cooldown_seconds=5)
    guard.evaluate('actor-a', 'quote_recalc', 'same')
    guard.evaluate('actor-a', 'quote_recalc', 'same')
    decision = guard.evaluate('actor-a', 'quote_recalc', 'same')
    assert decision.allowed is False

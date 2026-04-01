from post_hire_toolkit.meeting_notes_to_json import notes_to_json
from post_hire_toolkit.models import DependencyAuditReport, DocsDigestReport, HotspotReport, IssueBacklogReport, SecuritySnapshot, TestCoverageReport
from post_hire_toolkit.risk_register_generator import generate_risk_register


def test_notes_parser() -> None:
    report = notes_to_json("We need login. Budget is $5000. Decision: ship MVP. Can we do it in 2 weeks?")
    assert report.requirements
    assert report.budget_mentions
    assert report.unresolved_questions


def test_risk_register() -> None:
    risk = generate_risk_register(
        DependencyAuditReport(suspicious_dependencies=["request"]),
        TestCoverageReport(unit_tests=False, e2e_tests=False),
        HotspotReport(hotspots=[{"file": "a.ts", "reason": "large file"}]),
        SecuritySnapshot(issues=[{"severity": "high", "issue": "bad webhook"}]),
        DocsDigestReport(missing_docs=["deployment runbook"]),
        IssueBacklogReport(bug_count=10, feature_count=2),
    )
    assert risk.technical_risks
    assert 0 <= risk.confidence_score <= 1

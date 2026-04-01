from __future__ import annotations

from .models import (
    ClientContext,
    IssueBacklogReport,
    MeetingNotesReport,
    RiskRegister,
)
from .project_inventory import InventoryReport


def build_client_context(
    inventory: InventoryReport,
    backlog: IssueBacklogReport,
    notes: MeetingNotesReport,
    risks: RiskRegister,
) -> ClientContext:
    repo_signals = inventory.frameworks + inventory.integrations[:5]
    issue_signals = backlog.top_repeated_themes[:8]
    project_summary = (
        f"{inventory.repo_name}: {', '.join(inventory.frameworks[:4]) or 'unknown stack'} "
        f"with {inventory.total_files} files and {backlog.bug_count} bug-like backlog items."
    )
    return ClientContext(
        project_summary=project_summary,
        scope_signals=notes.requirements[:10],
        budget_signals=notes.budget_mentions[:10],
        urgency_signals=notes.deadlines[:10],
        repo_signals=repo_signals,
        issue_signals=issue_signals,
        open_questions=notes.unresolved_questions[:10] + risks.business_risks[:3],
    )

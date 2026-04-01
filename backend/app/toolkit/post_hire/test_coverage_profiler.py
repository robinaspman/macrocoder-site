from __future__ import annotations

from .config import AnalysisSettings
from .models import TestCoverageReport
from .utils.fs import iter_project_files, relative_posix


def profile_tests(settings: AnalysisSettings) -> TestCoverageReport:
    frameworks: set[str] = set()
    unit = integration = e2e = False
    notes: list[str] = []
    critical_untested: list[str] = []

    files = [relative_posix(settings.root, p) for p in iter_project_files(settings.root, settings)]
    text_blob = " ".join(files).lower()

    if "pytest" in text_blob:
        frameworks.add("pytest")
    if "vitest" in text_blob:
        frameworks.add("vitest")
    if "jest" in text_blob:
        frameworks.add("jest")
    if "playwright" in text_blob or "cypress" in text_blob:
        frameworks.add("playwright/cypress")

    for rel in files:
        low = rel.lower()
        if "test" in low or "spec" in low:
            unit = True
        if "integration" in low:
            integration = True
        if "e2e" in low or "playwright" in low or "cypress" in low:
            e2e = True

    if not unit:
        critical_untested.extend(["core logic", "api flows"])
    if not e2e:
        critical_untested.append("full user journeys")
    if not frameworks:
        notes.append("No obvious test framework files found.")

    return TestCoverageReport(
        test_frameworks=sorted(frameworks),
        unit_tests=unit,
        integration_tests=integration,
        e2e_tests=e2e,
        critical_untested_areas=critical_untested,
        notes=notes,
    )

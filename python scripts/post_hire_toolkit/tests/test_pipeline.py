from pathlib import Path

from post_hire_toolkit.config import AnalysisSettings
from post_hire_toolkit.pipeline import PostHirePipeline


def _make_sample_project(root: Path) -> None:
    (root / "app" / "dashboard").mkdir(parents=True)
    (root / "api").mkdir(parents=True)
    (root / "docs").mkdir(parents=True)
    (root / "tests").mkdir(parents=True)
    (root / "package.json").write_text(
        '{"dependencies":{"next":"14.0.0","react":"18.2.0","stripe":"1.2.3"},"devDependencies":{"vitest":"1.0.0"}}',
        encoding="utf-8",
    )
    (root / "requirements.txt").write_text("fastapi==0.110.0\nsqlalchemy==2.0.0\n", encoding="utf-8")
    (root / "app" / "dashboard" / "page.tsx").write_text(
        "export default function DashboardPage(){ return <form><button>Save</button></form> }",
        encoding="utf-8",
    )
    (root / "api" / "main.py").write_text(
        "@app.post('/api/quotes')\n"
        "def create_quote():\n"
        "    return {'ok': True}\n",
        encoding="utf-8",
    )
    (root / "schema.prisma").write_text(
        'datasource db { provider = "postgresql" }\nmodel User { id Int @id }\n',
        encoding="utf-8",
    )
    (root / "docs" / "README.md").write_text("# Project\nDeploy with Docker", encoding="utf-8")
    (root / ".env.example").write_text("DATABASE_URL=\nSTRIPE_SECRET_KEY=\n", encoding="utf-8")
    (root / "notes.txt").write_text(
        "We need an admin dashboard. Budget is $3000. Decision: start with MVP. Can we launch in 3 weeks?",
        encoding="utf-8",
    )
    (root / "issues.json").write_text(
        '[{"title":"Bug: login fails intermittently"},{"title":"Feature: add analytics"},{"title":"Deploy docker update"}]',
        encoding="utf-8",
    )
    (root / "tests" / "test_main.py").write_text("def test_ok(): assert True", encoding="utf-8")


def test_pipeline_outputs(tmp_path: Path) -> None:
    _make_sample_project(tmp_path)
    settings = AnalysisSettings(root=tmp_path, output_dir=tmp_path / "out")
    pipeline = PostHirePipeline(settings)
    reports = pipeline.run(notes_path=tmp_path / "notes.txt", issues_path=tmp_path / "issues.json")
    assert reports["inventory"]["repo_name"] == tmp_path.name
    assert reports["database"]["database_type"] in {"postgres", "supabase/postgres", "unknown"}
    assert reports["meeting_notes"]["budget_mentions"]
    bundle = pipeline.write_reports(reports)
    assert bundle.exists()

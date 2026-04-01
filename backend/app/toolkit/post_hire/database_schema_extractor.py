from __future__ import annotations

import re

from .config import AnalysisSettings
from .models import DatabaseSchemaReport
from .utils.fs import iter_project_files, relative_posix
from .utils.text import read_text_safe


PRISMA_MODEL_RE = re.compile(r"model\s+([A-Z][A-Za-z0-9_]+)\s*\{")
SQL_CREATE_RE = re.compile(r"CREATE TABLE\s+([A-Za-z0-9_\".]+)", re.I)
SQLALCHEMY_RE = re.compile(r"__tablename__\s*=\s*['\"]([A-Za-z0-9_]+)['\"]")
FOREIGN_KEY_RE = re.compile(r"ForeignKey\(['\"]([A-Za-z0-9_.]+)['\"]\)")
DRIZZLE_TABLE_RE = re.compile(r"pgTable\(['\"]([A-Za-z0-9_]+)['\"]")


def extract_database_schema(settings: AnalysisSettings) -> DatabaseSchemaReport:
    db_type = "unknown"
    tables: set[str] = set()
    models: set[str] = set()
    relationships: list[dict] = []
    migrations: list[str] = []
    notes: list[str] = []

    for path in iter_project_files(settings.root, settings):
        rel = relative_posix(settings.root, path)
        text = read_text_safe(path, settings.sample_text_bytes)

        if path.name == "schema.prisma":
            db_type = "postgres" if "postgresql" in text.lower() else "unknown"
            models.update(PRISMA_MODEL_RE.findall(text))
        if path.suffix.lower() == ".sql":
            tables.update(x.strip('"') for x in SQL_CREATE_RE.findall(text))
            if "migration" in rel.lower():
                migrations.append(rel)
        if "__tablename__" in text:
            models.update(SQLALCHEMY_RE.findall(text))
            if db_type == "unknown":
                db_type = "sqlalchemy"
        for target in FOREIGN_KEY_RE.findall(text):
            relationships.append({"to": target, "source": rel})
        tables.update(DRIZZLE_TABLE_RE.findall(text))
        if "supabase" in rel.lower() and db_type == "unknown":
            db_type = "supabase/postgres"

    if not tables and not models:
        notes.append("No obvious schema models or SQL tables detected.")
    return DatabaseSchemaReport(
        database_type=db_type,
        tables=sorted(tables),
        models=sorted(models),
        relationships=relationships[:200],
        migration_files=sorted(migrations),
        notes=notes,
    )

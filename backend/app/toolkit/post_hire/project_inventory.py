from __future__ import annotations

from collections import Counter
from pathlib import Path

from .config import AnalysisSettings
from .models import InventoryReport
from .utils.fs import iter_project_files, relative_posix


FRAMEWORK_HINTS = {
    "next": "Next.js",
    "react": "React",
    "vite": "Vite",
    "nuxt": "Nuxt",
    "svelte": "Svelte",
    "fastapi": "FastAPI",
    "flask": "Flask",
    "django": "Django",
    "express": "Express",
    "nestjs": "NestJS",
    "tailwindcss": "Tailwind CSS",
    "prisma": "Prisma",
    "drizzle": "Drizzle",
}

PACKAGE_MANAGER_FILES = {
    "package-lock.json": "npm",
    "pnpm-lock.yaml": "pnpm",
    "yarn.lock": "yarn",
    "poetry.lock": "poetry",
    "requirements.txt": "pip",
    "Pipfile.lock": "pipenv",
    "Cargo.lock": "cargo",
}

INTEGRATION_HINTS = {
    "stripe": "stripe",
    "supabase": "supabase",
    "resend": "resend",
    "sendgrid": "sendgrid",
    "openai": "openai",
    "anthropic": "anthropic",
    "clerk": "clerk",
    "auth0": "auth0",
    "sentry": "sentry",
}


def build_project_inventory(settings: AnalysisSettings) -> InventoryReport:
    root = settings.root
    lang_counter: Counter[str] = Counter()
    frameworks: set[str] = set()
    package_managers: set[str] = set()
    integrations: set[str] = set()
    env_files: list[str] = []
    ci_files: list[str] = []
    docker_files: list[str] = []
    docs_files: list[str] = []
    largest: list[tuple[int, str]] = []

    total_files = sum(1 for _ in root.rglob("*") if _.is_file())

    for path in iter_project_files(root, settings):
        rel = relative_posix(root, path)
        suffix = path.suffix.lower()
        lang_counter[suffix or "<noext>"] += 1

        if path.name in PACKAGE_MANAGER_FILES:
            package_managers.add(PACKAGE_MANAGER_FILES[path.name])

        if path.name.lower().startswith(".env") or ".env" in path.name.lower():
            env_files.append(rel)

        if path.name in {"Dockerfile", "docker-compose.yml", "docker-compose.yaml"}:
            docker_files.append(rel)

        if ".github/workflows" in rel or "gitlab-ci" in rel.lower():
            ci_files.append(rel)

        if path.name.lower().startswith("readme") or "docs/" in rel:
            docs_files.append(rel)

        try:
            size = path.stat().st_size
        except OSError:
            size = 0
        largest.append((size, rel))

        low_rel = rel.lower()
        for key, label in FRAMEWORK_HINTS.items():
            if key in low_rel:
                frameworks.add(label)
        for key, label in INTEGRATION_HINTS.items():
            if key in low_rel:
                integrations.add(label)

        if path.name == "package.json":
            try:
                text = path.read_text(encoding="utf-8", errors="ignore").lower()
            except OSError:
                text = ""
            for key, label in FRAMEWORK_HINTS.items():
                if f'"{key}"' in text:
                    frameworks.add(label)
            for key, label in INTEGRATION_HINTS.items():
                if f'"{key}"' in text:
                    integrations.add(label)

    largest_files = [
        {"path": rel, "bytes": size}
        for size, rel in sorted(largest, reverse=True)[:10]
    ]
    notes = []
    if not docs_files:
        notes.append("No obvious documentation files detected.")
    if "docker" not in "".join(x.lower() for x in docker_files):
        notes.append("No Docker build files detected.")

    return InventoryReport(
        repo_name=root.name,
        root_path=str(root),
        total_files=total_files,
        scanned_files=sum(lang_counter.values()),
        languages=dict(lang_counter.most_common()),
        frameworks=sorted(frameworks),
        package_managers=sorted(package_managers),
        integrations=sorted(integrations),
        env_files=sorted(env_files),
        ci_files=sorted(ci_files),
        docker_files=sorted(docker_files),
        docs_files=sorted(docs_files),
        largest_files=largest_files,
        notes=notes,
    )

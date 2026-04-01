from __future__ import annotations

import json
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List

from .exceptions import RepoProfileError
from .models import RepoProfile
from .utils.text import normalize_whitespace

_IGNORE_DIRS = {
    ".git",
    ".next",
    ".nuxt",
    "dist",
    "build",
    "target",
    "coverage",
    ".venv",
    "venv",
    "node_modules",
    "__pycache__",
}

_LANG_BY_EXT = {
    ".py": "Python",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".go": "Go",
    ".rs": "Rust",
    ".java": "Java",
    ".kt": "Kotlin",
    ".php": "PHP",
    ".rb": "Ruby",
    ".swift": "Swift",
    ".c": "C",
    ".cpp": "C++",
    ".cs": "C#",
    ".html": "HTML",
    ".css": "CSS",
    ".scss": "SCSS",
    ".sql": "SQL",
    ".sh": "Shell",
}

_AUTH_HINTS = ("next-auth", "auth0", "clerk", "supabase/auth", "firebase/auth", "passport", "django-allauth")
_PAYMENT_HINTS = ("stripe", "paypal", "braintree", "checkout", "lemonsqueezy", "shopify")
_DB_HINTS = ("postgres", "mysql", "sqlite", "mongodb", "prisma", "drizzle", "sqlalchemy", "redis")
_CI_HINTS = (".github/workflows", ".gitlab-ci.yml", "circleci", "azure-pipelines", "vercel.json")


@dataclass(slots=True)
class RepoProfiler:
    max_files_to_scan: int = 2500
    max_text_file_bytes: int = 200_000

    def profile(self, repo_path: str | Path) -> RepoProfile:
        path = Path(repo_path)
        if not path.exists():
            raise RepoProfileError(f"Path does not exist: {path}")
        if not path.is_dir():
            raise RepoProfileError(f"Path is not a directory: {path}")

        files = list(self._iter_files(path))
        if not files:
            raise RepoProfileError("Repository appears empty after filtering ignored directories.")

        language_counter: Counter[str] = Counter()
        frameworks: List[str] = []
        package_managers: List[str] = []
        databases: List[str] = []
        auth_indicators: List[str] = []
        payment_indicators: List[str] = []
        ci_indicators: List[str] = []
        tests_present = False
        docker = False
        env_files_present = False
        backend_present = False
        frontend_present = False
        notes: List[str] = []
        line_count = 0

        for file in files:
            suffix = file.suffix.lower()
            if suffix in _LANG_BY_EXT:
                language_counter[_LANG_BY_EXT[suffix]] += 1

            lower_name = file.name.lower()
            rel = str(file.relative_to(path)).lower()

            if "test" in rel or "spec" in rel:
                tests_present = True
            if lower_name.startswith(".env"):
                env_files_present = True
            if lower_name == "dockerfile" or lower_name in {"docker-compose.yml", "docker-compose.yaml"}:
                docker = True
            if any(ci_hint in rel for ci_hint in _CI_HINTS):
                ci_indicators.append(rel)

            if lower_name == "package.json":
                package_managers.append("npm")
                frameworks.extend(self._frameworks_from_package_json(file))
                deps_blob = self._safe_read_text(file)
                auth_indicators.extend([hint for hint in _AUTH_HINTS if hint in deps_blob])
                payment_indicators.extend([hint for hint in _PAYMENT_HINTS if hint in deps_blob])
                databases.extend([hint for hint in _DB_HINTS if hint in deps_blob])

            if lower_name == "pnpm-lock.yaml":
                package_managers.append("pnpm")
            if lower_name == "yarn.lock":
                package_managers.append("yarn")
            if lower_name == "poetry.lock":
                package_managers.append("poetry")
            if lower_name in {"requirements.txt", "pyproject.toml"}:
                package_managers.append("pip/pyproject")
                text = self._safe_read_text(file)
                if "fastapi" in text:
                    frameworks.append("FastAPI")
                if "django" in text:
                    frameworks.append("Django")
                if "flask" in text:
                    frameworks.append("Flask")
                databases.extend([hint for hint in _DB_HINTS if hint in text])
                auth_indicators.extend([hint for hint in _AUTH_HINTS if hint in text])

            if lower_name in {"vercel.json", "next.config.js", "next.config.mjs", "next.config.ts"}:
                frameworks.append("Next.js")
            if lower_name in {"vite.config.ts", "vite.config.js"}:
                frameworks.append("Vite")
            if lower_name in {"astro.config.mjs", "astro.config.ts"}:
                frameworks.append("Astro")
            if lower_name in {"tailwind.config.js", "tailwind.config.ts"}:
                frameworks.append("Tailwind CSS")

            if suffix in {".py", ".go", ".rs", ".java", ".php", ".rb", ".cs"}:
                backend_present = True
            if suffix in {".tsx", ".jsx", ".html", ".css", ".scss"}:
                frontend_present = True

            line_count += self._line_count(file)

        complexity_score = 0
        complexity_score += min(len(files) // 40, 10)
        complexity_score += min(len(set(frameworks)), 5)
        complexity_score += 2 if backend_present and frontend_present else 0
        complexity_score += 2 if docker else 0
        complexity_score += 2 if tests_present else 0
        complexity_score += 2 if auth_indicators else 0
        complexity_score += 2 if payment_indicators else 0
        complexity = self._complexity_label(complexity_score)

        if env_files_present:
            notes.append("Environment files detected. Ensure secrets are never exposed in frontend bundles.")

        return RepoProfile(
            path=str(path),
            frameworks=sorted(set(frameworks)),
            languages=dict(language_counter.most_common()),
            package_managers=sorted(set(package_managers)),
            databases=sorted(set(databases)),
            auth_indicators=sorted(set(auth_indicators)),
            payment_indicators=sorted(set(payment_indicators)),
            ci_indicators=sorted(set(ci_indicators)),
            docker=docker,
            tests_present=tests_present,
            env_files_present=env_files_present,
            line_count=line_count,
            file_count=len(files),
            complexity=complexity,
            backend_present=backend_present,
            frontend_present=frontend_present,
            notes=notes,
        )

    def _iter_files(self, root: Path) -> Iterable[Path]:
        count = 0
        for path in root.rglob("*"):
            if count >= self.max_files_to_scan:
                break
            if any(part in _IGNORE_DIRS for part in path.parts):
                continue
            if path.is_file():
                count += 1
                yield path

    def _safe_read_text(self, file: Path) -> str:
        try:
            if file.stat().st_size > self.max_text_file_bytes:
                return ""
            return file.read_text(encoding="utf-8", errors="ignore").lower()
        except OSError:
            return ""

    def _frameworks_from_package_json(self, file: Path) -> List[str]:
        text = self._safe_read_text(file)
        frameworks = []
        if "next" in text:
            frameworks.append("Next.js")
        if '"react"' in text or "'react'" in text:
            frameworks.append("React")
        if "vue" in text:
            frameworks.append("Vue")
        if "svelte" in text:
            frameworks.append("Svelte")
        if "astro" in text:
            frameworks.append("Astro")
        if "tailwindcss" in text:
            frameworks.append("Tailwind CSS")
        return frameworks

    def _line_count(self, file: Path) -> int:
        try:
            if file.stat().st_size > self.max_text_file_bytes:
                return 0
            return sum(1 for _ in file.open("r", encoding="utf-8", errors="ignore"))
        except OSError:
            return 0

    def _complexity_label(self, score: int) -> str:
        if score <= 4:
            return "low"
        if score <= 9:
            return "medium"
        if score <= 14:
            return "high"
        return "very_high"

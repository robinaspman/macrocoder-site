from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Set


@dataclass(slots=True)
class SecuritySettings:
    max_files_scanned: int = 20_000
    max_file_bytes: int = 2_000_000
    skip_dirs: Set[str] = field(
        default_factory=lambda: {
            ".git", ".next", "node_modules", "dist", "build", ".venv", "venv",
            "__pycache__", ".pytest_cache", ".mypy_cache", ".turbo", ".cache",
            ".idea", ".vscode", "coverage", ".nuxt", ".svelte-kit",
        }
    )
    allowed_text_extensions: Set[str] = field(
        default_factory=lambda: {
            ".py", ".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".txt", ".yml",
            ".yaml", ".toml", ".ini", ".env", ".sql", ".sh", ".rs", ".go", ".java",
            ".kt", ".c", ".h", ".cpp", ".cs", ".php", ".rb", ".swift", ".scala",
        }
    )
    binary_extensions: Set[str] = field(
        default_factory=lambda: {
            ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".pdf",
            ".zip", ".tar", ".gz", ".7z", ".woff", ".woff2", ".ttf", ".eot",
            ".mp4", ".mov", ".avi", ".mp3", ".wav", ".db", ".sqlite",
        }
    )
    redact_secret_values: bool = True


@dataclass(slots=True)
class AnalysisSettings:
    root: Path
    output_dir: Path = Path("analysis_output")
    top_hotspots: int = 15
    sample_text_bytes: int = 120_000
    issue_backlog_limit: int = 2_000
    file_chunk_lines: int = 120
    security: SecuritySettings = field(default_factory=SecuritySettings)


@dataclass(slots=True)
class ExportSettings:
    endpoint_url: str = ""
    bearer_token: str = ""
    timeout_seconds: float = 10.0
    gzip_payload: bool = True
    retries: int = 2
    verify_tls: bool = True
    export_dir: Path = Path("analysis_output/export")
    include_raw_json: bool = True

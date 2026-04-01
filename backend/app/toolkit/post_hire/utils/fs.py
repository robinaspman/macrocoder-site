from __future__ import annotations

from pathlib import Path
from typing import Generator, Iterable

from ..config import AnalysisSettings


def iter_project_files(root: Path, settings: AnalysisSettings) -> Generator[Path, None, None]:
    count = 0
    for path in root.rglob("*"):
        if count >= settings.security.max_files_scanned:
            break
        if path.is_dir():
            if path.name in settings.security.skip_dirs:
                dirs = [x for x in path.iterdir() if x.is_dir()]
                # noop; root.rglob will still walk, so just continue and rely on skip check below.
            continue
        if any(part in settings.security.skip_dirs for part in path.parts):
            continue
        if path.suffix.lower() in settings.security.binary_extensions:
            continue
        try:
            size = path.stat().st_size
        except OSError:
            continue
        if size > settings.security.max_file_bytes:
            continue
        count += 1
        yield path


def relative_posix(root: Path, path: Path) -> str:
    return path.relative_to(root).as_posix()

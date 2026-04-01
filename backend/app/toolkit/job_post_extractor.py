from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

from bs4 import BeautifulSoup

from .utils.text import normalize_whitespace, truncate

_BUDGET_RE = re.compile(r"(?:budget|fixed price|price)\s*[:\-]?\s*(?:USD|US\$|\$)?\s*(\d{2,6})(?:\s*[-–to]+\s*(?:USD|US\$|\$)?\s*(\d{2,6}))?", re.IGNORECASE)
_HOURLY_RE = re.compile(r"(?:hourly|rate)\s*[:\-]?\s*(?:USD|US\$|\$)?\s*(\d{1,4})(?:\s*[-–to]+\s*(?:USD|US\$|\$)?\s*(\d{1,4}))?", re.IGNORECASE)
_TIMELINE_RE = re.compile(r"\b(\d{1,2})\s*(day|days|week|weeks|month|months)\b", re.IGNORECASE)
_EXPERIENCE_RE = re.compile(r"\b(entry|intermediate|expert|senior)\b", re.IGNORECASE)
_SKILLS_RE = re.compile(r"\b(?:skills?|stack|tech stack|required skills?)\b[:\-]?\s*(.+)", re.IGNORECASE)


@dataclass(slots=True)
class JobPostExtraction:
    title: str = ""
    body: str = ""
    budget_type: str = "unknown"
    budget_min: float | None = None
    budget_max: float | None = None
    hourly_min: float | None = None
    hourly_max: float | None = None
    timeline: str = ""
    experience_level: str = ""
    skills: list[str] = field(default_factory=list)
    deliverables: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    structured_summary: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class JobPostExtractor:
    max_body_chars: int = 6000

    def _visible_text(self, raw: str) -> str:
        raw = raw or ""
        if "<" in raw and ">" in raw:
            soup = BeautifulSoup(raw, "html.parser")
            text = soup.get_text(" ", strip=True)
        else:
            text = raw
        return normalize_whitespace(text)

    def _extract_title(self, raw: str, text: str) -> str:
        if "<" in raw and ">" in raw:
            soup = BeautifulSoup(raw, "html.parser")
            title = (soup.title.get_text(strip=True) if soup.title else "")
            if title:
                return title
            h1 = soup.find("h1")
            if h1:
                return normalize_whitespace(h1.get_text(" ", strip=True))
        first_line = next((line.strip() for line in raw.splitlines() if line.strip()), "")
        return truncate(first_line or text[:120], 120)

    def _extract_budget(self, text: str) -> tuple[str, float | None, float | None, float | None, float | None]:
        fixed = _BUDGET_RE.search(text)
        hourly = _HOURLY_RE.search(text)
        if fixed:
            low = float(fixed.group(1))
            high = float(fixed.group(2)) if fixed.group(2) else low
            return "fixed", low, high, None, None
        if hourly:
            low = float(hourly.group(1))
            high = float(hourly.group(2)) if hourly.group(2) else low
            return "hourly", None, None, low, high
        return "unknown", None, None, None, None

    def _extract_timeline(self, text: str) -> str:
        match = _TIMELINE_RE.search(text)
        return f"{match.group(1)} {match.group(2).lower()}" if match else ""

    def _extract_experience(self, text: str) -> str:
        match = _EXPERIENCE_RE.search(text)
        return match.group(1).lower() if match else ""

    def _extract_skills(self, text: str) -> list[str]:
        skills: list[str] = []
        for line in text.split("."):
            line = line.strip()
            if _SKILLS_RE.search(line):
                pieces = re.split(r",|/|\||\u2022", line.split(":", 1)[-1])
                skills.extend(p.strip() for p in pieces if p.strip())
        if not skills:
            common = [
                "react", "next.js", "vue", "angular", "python", "fastapi", "django",
                "node", "typescript", "tailwind", "postgres", "supabase", "firebase",
                "stripe", "openai", "aws", "docker"
            ]
            lowered = text.lower()
            skills = [s for s in common if s in lowered]
        return sorted(dict.fromkeys(skills))[:15]

    def _extract_deliverables(self, text: str) -> list[str]:
        verbs = ["build", "design", "fix", "integrate", "deploy", "refactor", "audit", "review", "create"]
        items: list[str] = []
        for sentence in re.split(r"(?<=[.!?])\s+", text):
            s = normalize_whitespace(sentence)
            if any(v in s.lower() for v in verbs) and 12 <= len(s) <= 180:
                items.append(s)
        return items[:8]

    def extract(self, raw: str) -> JobPostExtraction:
        text = self._visible_text(raw)
        title = self._extract_title(raw, text)
        budget_type, budget_min, budget_max, hourly_min, hourly_max = self._extract_budget(text)
        timeline = self._extract_timeline(text)
        experience = self._extract_experience(text)
        skills = self._extract_skills(text)
        deliverables = self._extract_deliverables(text)
        warnings: list[str] = []
        if budget_type == "unknown":
            warnings.append("No clear budget detected.")
        if not timeline:
            warnings.append("No clear timeline detected.")
        if not skills:
            warnings.append("Few explicit skills detected.")

        structured = {
            "title": title,
            "budget_type": budget_type,
            "budget_min": budget_min,
            "budget_max": budget_max,
            "hourly_min": hourly_min,
            "hourly_max": hourly_max,
            "timeline": timeline,
            "experience_level": experience,
            "skills": skills,
            "deliverables": deliverables,
            "body_sample": truncate(text, 700),
        }

        return JobPostExtraction(
            title=title,
            body=truncate(text, self.max_body_chars),
            budget_type=budget_type,
            budget_min=budget_min,
            budget_max=budget_max,
            hourly_min=hourly_min,
            hourly_max=hourly_max,
            timeline=timeline,
            experience_level=experience,
            skills=skills,
            deliverables=deliverables,
            warnings=warnings,
            structured_summary=structured,
        )

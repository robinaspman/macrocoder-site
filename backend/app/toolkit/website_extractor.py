from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import List, Set

from bs4 import BeautifulSoup

from .exceptions import ExtractionError
from .models import WebsiteExtraction
from .url_guard import URLGuard
from .utils.text import normalize_whitespace, strip_tags, truncate


_PRICING_RE = re.compile(r"(\$|€|£|sek|usd|eur)\s?\d[\d,.\s]*", re.IGNORECASE)
_TRUST_RE = re.compile(
    r"(trusted by|no sign[- ]?up|free trial|money[- ]?back|secure|encrypted|gdpr|privacy|used by|clients|customers)",
    re.IGNORECASE,
)


@dataclass(slots=True)
class WebsiteExtractor:
    url_guard: URLGuard = field(default_factory=URLGuard)

    def extract_from_url(self, url: str) -> WebsiteExtraction:
        fetched = self.url_guard.safe_fetch_text(url)
        return self.extract_from_html(fetched.text, url=fetched.url, final_url=fetched.final_url, inherited_warnings=fetched.warnings)

    def extract_from_html(
        self,
        html: str,
        *,
        url: str = "",
        final_url: str = "",
        inherited_warnings: List[str] | None = None,
    ) -> WebsiteExtraction:
        if not html or not html.strip():
            raise ExtractionError("HTML input is empty.")

        soup = BeautifulSoup(html, "html.parser")
        for tag in soup(["script", "style", "noscript", "svg"]):
            tag.decompose()

        title = normalize_whitespace(soup.title.get_text(" ", strip=True)) if soup.title else ""
        meta_description = ""
        meta = soup.find("meta", attrs={"name": "description"})
        if meta and meta.get("content"):
            meta_description = normalize_whitespace(meta["content"])

        headings = self._collect_unique_text(soup.find_all(re.compile("^h[1-3]$")), limit=16)
        buttons = self._collect_unique_text(soup.find_all(["button"]), limit=10)
        links = self._collect_unique_text(soup.find_all("a"), limit=20)
        nav_labels = self._collect_unique_text(soup.select("nav a"), limit=16)
        forms = self._collect_forms(soup)
        visible_text = normalize_whitespace(soup.get_text(" ", strip=True))

        primary_ctas = self._extract_primary_ctas(buttons, links)
        trust_signals = self._extract_trust_signals(visible_text, headings, buttons, links)
        pricing_mentions = self._extract_pricing_mentions(visible_text)
        hero_text = self._extract_hero_text(headings, soup)

        return WebsiteExtraction(
            url=url,
            final_url=final_url or url,
            title=title,
            meta_description=meta_description,
            headings=headings,
            primary_ctas=primary_ctas,
            nav_labels=nav_labels,
            trust_signals=trust_signals,
            pricing_mentions=pricing_mentions,
            forms=forms,
            hero_text=hero_text,
            visible_text_sample=truncate(visible_text, 1200),
            warnings=list(inherited_warnings or []),
        )

    def _collect_unique_text(self, tags, limit: int = 20) -> List[str]:
        seen: Set[str] = set()
        items: List[str] = []
        for tag in tags:
            text = normalize_whitespace(tag.get_text(" ", strip=True))
            if not text or len(text) < 2:
                continue
            if text.lower() in seen:
                continue
            seen.add(text.lower())
            items.append(text)
            if len(items) >= limit:
                break
        return items

    def _extract_primary_ctas(self, buttons: List[str], links: List[str]) -> List[str]:
        candidates = buttons + links
        high_signal = []
        seen = set()
        for text in candidates:
            lowered = text.lower()
            if any(keyword in lowered for keyword in ["start", "book", "schedule", "get", "try", "hire", "analyze", "review", "contact", "work together"]):
                if lowered not in seen:
                    seen.add(lowered)
                    high_signal.append(text)
            if len(high_signal) >= 8:
                break
        return high_signal or candidates[:6]

    def _extract_trust_signals(self, visible_text: str, headings: List[str], buttons: List[str], links: List[str]) -> List[str]:
        text_pool = "\n".join(headings + buttons + links + [visible_text[:1500]])
        signals = sorted({m.group(0) for m in _TRUST_RE.finditer(text_pool)})
        return [normalize_whitespace(s) for s in signals[:10]]

    def _extract_pricing_mentions(self, visible_text: str) -> List[str]:
        return sorted({normalize_whitespace(m.group(0)) for m in _PRICING_RE.finditer(visible_text)})[:12]

    def _collect_forms(self, soup: BeautifulSoup) -> List[str]:
        outputs = []
        for form in soup.find_all("form"):
            names = []
            for field in form.find_all(["input", "textarea", "select"]):
                label = field.get("name") or field.get("id") or field.get("type") or field.name
                if label:
                    names.append(label)
            outputs.append(", ".join(names[:8]) if names else "generic_form")
        return outputs[:8]

    def _extract_hero_text(self, headings: List[str], soup: BeautifulSoup) -> str:
        if headings:
            first_h = headings[0]
            p = soup.find("p")
            if p:
                return truncate(f"{first_h} — {normalize_whitespace(p.get_text(' ', strip=True))}", 260)
            return truncate(first_h, 260)
        return ""

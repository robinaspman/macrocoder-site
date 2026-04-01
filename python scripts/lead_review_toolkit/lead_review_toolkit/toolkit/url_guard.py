from __future__ import annotations

import ipaddress
import socket
from dataclasses import dataclass, field
from typing import Dict, List, Tuple
from urllib.parse import parse_qsl, urlencode, urljoin, urlparse, urlunparse

import requests

from .config import SecuritySettings
from .exceptions import FetchError, URLValidationError
from .models import FetchedContent, InputKind


_TRACKING_PARAMS = {
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "gclid",
    "fbclid",
    "mc_cid",
    "mc_eid",
}


@dataclass(slots=True)
class URLGuard:
    settings: SecuritySettings = field(default_factory=SecuritySettings)

    def normalize_url(self, url: str) -> str:
        if not url or not url.strip():
            raise URLValidationError("URL is empty.")
        url = url.strip()
        parsed = urlparse(url if "://" in url else f"https://{url}")
        if parsed.scheme.lower() not in self.settings.allowed_schemes:
            raise URLValidationError(f"Scheme '{parsed.scheme}' is not allowed.")
        if not parsed.netloc:
            raise URLValidationError("URL is missing a hostname.")

        clean_qs = [
            (k, v)
            for k, v in parse_qsl(parsed.query, keep_blank_values=True)
            if k.lower() not in _TRACKING_PARAMS
        ]
        normalized = parsed._replace(
            scheme=parsed.scheme.lower(),
            netloc=parsed.netloc.lower(),
            fragment="",
            query=urlencode(clean_qs),
        )
        return urlunparse(normalized)

    def classify_url(self, url: str) -> InputKind:
        host = urlparse(url).netloc.lower()
        if "github.com" in host:
            return InputKind.GITHUB
        if "upwork.com" in host:
            return InputKind.UPWORK
        if host:
            return InputKind.WEBSITE
        return InputKind.UNKNOWN

    def _resolve_host(self, hostname: str) -> List[str]:
        try:
            infos = socket.getaddrinfo(hostname, None)
        except socket.gaierror as exc:
            raise URLValidationError(f"Could not resolve hostname: {hostname}") from exc
        ips = sorted({info[4][0] for info in infos})
        if not ips:
            raise URLValidationError(f"No IPs resolved for hostname: {hostname}")
        return ips

    def _assert_ip_safe(self, hostname: str) -> None:
        lowered = hostname.lower().strip("[]")
        if lowered in self.settings.blocked_hostnames:
            raise URLValidationError(f"Hostname '{hostname}' is blocked.")

        try:
            ip = ipaddress.ip_address(lowered)
            ips = [str(ip)]
        except ValueError:
            ips = self._resolve_host(lowered)

        for ip_str in ips:
            ip = ipaddress.ip_address(ip_str)
            if (
                ip.is_private
                or ip.is_loopback
                or ip.is_link_local
                or ip.is_multicast
                or ip.is_reserved
                or ip.is_unspecified
            ):
                raise URLValidationError(f"Resolved IP '{ip_str}' is not allowed.")

    def validate_url(self, url: str) -> str:
        normalized = self.normalize_url(url)
        parsed = urlparse(normalized)
        self._assert_ip_safe(parsed.hostname or "")
        kind = self.classify_url(normalized)
        if kind == InputKind.GITHUB and not self.settings.allow_github:
            raise URLValidationError("GitHub URLs are disabled.")
        if kind == InputKind.UPWORK and not self.settings.allow_upwork:
            raise URLValidationError("Upwork URLs are disabled.")
        return normalized

    def safe_fetch_text(self, url: str) -> FetchedContent:
        current_url = self.validate_url(url)
        warnings: List[str] = []

        session = requests.Session()
        session.headers.update({"User-Agent": self.settings.user_agent})

        redirects = 0
        response = None
        while True:
            try:
                response = session.get(
                    current_url,
                    stream=True,
                    timeout=(self.settings.connect_timeout_seconds, self.settings.read_timeout_seconds),
                    allow_redirects=False,
                )
            except requests.RequestException as exc:
                raise FetchError(f"Failed to fetch URL: {current_url}") from exc

            if 300 <= response.status_code < 400 and "Location" in response.headers:
                redirects += 1
                if redirects > self.settings.max_redirects:
                    raise FetchError("Too many redirects.")
                next_url = urljoin(current_url, response.headers["Location"])
                current_url = self.validate_url(next_url)
                warnings.append(f"Redirected to {current_url}")
                continue
            break

        if response is None:
            raise FetchError("No response received.")

        content_type = response.headers.get("Content-Type", "").split(";")[0].strip().lower()
        if content_type and content_type not in self.settings.allowed_text_content_types:
            raise FetchError(f"Unsupported content type: {content_type}")

        chunks: List[bytes] = []
        bytes_downloaded = 0
        try:
            for chunk in response.iter_content(chunk_size=8192):
                if not chunk:
                    continue
                bytes_downloaded += len(chunk)
                if bytes_downloaded > self.settings.max_download_bytes:
                    raise FetchError("Downloaded content exceeded the maximum allowed size.")
                chunks.append(chunk)
        finally:
            response.close()

        raw = b"".join(chunks)
        encoding = response.encoding or "utf-8"
        text = raw.decode(encoding, errors="replace")

        return FetchedContent(
            url=url,
            final_url=current_url,
            status_code=response.status_code,
            content_type=content_type or "text/plain",
            text=text,
            bytes_downloaded=bytes_downloaded,
            response_headers={k: v for k, v in response.headers.items()},
            warnings=warnings,
        )

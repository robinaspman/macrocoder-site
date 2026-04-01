import ipaddress
import socket
from urllib.parse import urlparse
from fastapi import HTTPException

ALLOWED_SCHEMES = {"http", "https"}
BLOCKED_HOSTNAMES = {"localhost", "127.0.0.1", "0.0.0.0", "::1"}
BLOCKED_IP_RANGES = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fe80::/10"),
    ipaddress.ip_network("fc00::/7"),
]

GITHUB_HOST = "github.com"
UPWORK_HOST = "www.upwork.com"


def validate_url(url: str, allowed_hosts: set[str] | None = None) -> str:
    """Validate a URL for SSRF. Returns the cleaned URL or raises HTTPException."""
    try:
        parsed = urlparse(url)
    except Exception:
        raise HTTPException(400, "Invalid URL format")

    if parsed.scheme not in ALLOWED_SCHEMES:
        raise HTTPException(400, "Only http/https URLs are allowed")

    hostname = parsed.hostname
    if not hostname:
        raise HTTPException(400, "No hostname found in URL")

    if hostname.lower() in {h.lower() for h in BLOCKED_HOSTNAMES}:
        raise HTTPException(400, "Localhost URLs are not allowed")

    if allowed_hosts and hostname.lower() not in {h.lower() for h in allowed_hosts}:
        raise HTTPException(400, f"Host not allowed: {hostname}")

    try:
        resolved = socket.getaddrinfo(hostname, parsed.port or (443 if parsed.scheme == "https" else 80))
        for family, _, _, _, sockaddr in resolved:
            ip = sockaddr[0]
            try:
                ip_obj = ipaddress.ip_address(ip)
                for blocked in BLOCKED_IP_RANGES:
                    if ip_obj in blocked:
                        raise HTTPException(400, f"URL resolves to a blocked IP range: {ip}")
            except ValueError:
                pass
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(400, "Could not resolve hostname")

    return url


def validate_github_repo(owner: str, repo: str) -> tuple[str, str]:
    """Validate GitHub owner/repo names."""
    if not owner or not repo:
        raise HTTPException(400, "Owner and repo are required")
    if not all(c.isalnum() or c in "-_." for c in owner):
        raise HTTPException(400, "Invalid owner name")
    if not all(c.isalnum() or c in "-_." for c in repo):
        raise HTTPException(400, "Invalid repo name")
    if len(owner) > 39 or len(repo) > 100:
        raise HTTPException(400, "Owner/repo name too long")
    return owner, repo


def validate_upwork_job_id(job_id: str) -> str:
    """Validate Upwork job ID format."""
    if not job_id or not job_id.startswith("~"):
        raise HTTPException(400, "Invalid Upwork job ID")
    if len(job_id) > 50:
        raise HTTPException(400, "Job ID too long")
    return job_id

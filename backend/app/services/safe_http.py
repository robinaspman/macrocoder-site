import httpx
from app.services.ssrf import validate_url

MAX_REDIRECTS = 3
FETCH_TIMEOUT = 15.0
MAX_RESPONSE_SIZE = 5 * 1024 * 1024  # 5MB


def get_safe_client(allowed_hosts: set[str] | None = None) -> httpx.AsyncClient:
    """Create an httpx client with SSRF protections."""
    return httpx.AsyncClient(
        follow_redirects=True,
        max_redirects=MAX_REDIRECTS,
        timeout=httpx.Timeout(FETCH_TIMEOUT, connect=5.0),
        limits=httpx.Limits(max_connections=10, max_keepalive_connections=5),
    )


async def safe_get(url: str, allowed_hosts: set[str] | None = None) -> httpx.Response:
    """Fetch a URL with SSRF validation, timeout, and size limits."""
    validate_url(url, allowed_hosts)

    async with get_safe_client(allowed_hosts) as client:
        resp = await client.get(url)

        # Check content length
        content_length = resp.headers.get("content-length")
        if content_length and int(content_length) > MAX_RESPONSE_SIZE:
            raise ValueError(f"Response too large: {content_length} bytes")

        # Check actual content size
        if len(resp.content) > MAX_RESPONSE_SIZE:
            raise ValueError("Response body exceeds size limit")

        return resp


async def safe_fetch_text(url: str, max_chars: int = 10000) -> str:
    """Fetch URL and return truncated text content."""
    resp = await safe_get(url)
    resp.raise_for_status()

    # Simple HTML-to-text extraction
    import re
    text = re.sub(r"<[^>]+>", " ", resp.text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:max_chars]

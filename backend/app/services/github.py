import base64
import httpx
from app.core.config import settings
from app.services.cache import cache_get_or_set, cache_set

GITHUB_API = "https://api.github.com"
HEADERS = {
    "Authorization": f"Bearer {settings.GITHUB_TOKEN}",
    "Accept": "application/vnd.github.v3+json"
}


async def fetch_repo_info(owner: str, repo: str) -> dict:
    """Fetch repo metadata including commit SHA."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{GITHUB_API}/repos/{owner}/{repo}", headers=HEADERS)
        resp.raise_for_status()
        return resp.json()


async def fetch_repo_tree(owner: str, repo: str) -> list[dict]:
    """Fetch repository file tree with caching."""
    cache_key = f"github:tree:{owner}/{repo}"

    async def _fetch():
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{GITHUB_API}/repos/{owner}/{repo}", headers=HEADERS)
            resp.raise_for_status()
            default_branch = resp.json().get("default_branch", "main")

            resp = await client.get(
                f"{GITHUB_API}/repos/{owner}/{repo}/git/trees/{default_branch}?recursive=1",
                headers=HEADERS
            )
            if resp.status_code != 200:
                return []
            return resp.json().get("tree", [])

    return await cache_get_or_set(cache_key, _fetch, ttl_seconds=300)


async def fetch_file_content(owner: str, repo: str, path: str) -> str | None:
    """Fetch a single file's content with caching."""
    cache_key = f"github:file:{owner}/{repo}/{path}"

    async def _fetch():
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{GITHUB_API}/repos/{owner}/{repo}/contents/{path}",
                headers=HEADERS
            )
            if resp.status_code != 200:
                return None
            data = resp.json()
            return base64.b64decode(data.get("content", "")).decode("utf-8")

    return await cache_get_or_set(cache_key, _fetch, ttl_seconds=3600)


async def fetch_key_files(owner: str, repo: str, tree: list[dict]) -> dict[str, str]:
    """Fetch important config files for analysis."""
    key_paths = [
        "package.json", "requirements.txt", "Cargo.toml",
        "pyproject.toml", "go.mod", "Dockerfile", "docker-compose.yml",
        "README.md", "Makefile", "tsconfig.json"
    ]
    existing = {item["path"] for item in tree}
    results = {}
    for path in key_paths:
        if path in existing:
            content = await fetch_file_content(owner, repo, path)
            if content:
                results[path] = content
    return results

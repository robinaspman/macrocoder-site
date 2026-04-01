import json
import uuid
import hashlib
import httpx
import sqlalchemy as sa
from datetime import datetime, timezone
from arq import ArqRedis
from arq.connections import RedisSettings
from app.core.config import settings
from app.services.github import fetch_repo_tree, fetch_key_files, fetch_repo_info
from app.services.agent import analyze_repo, analyze_website, analyze_upwork_job
from app.services.safe_http import safe_fetch_text
from app.core.database import async_session
from app.models import Analysis, AnalysisStatus, AnalysisChunk
from app.core.logging import logger
from app.services.cache import cache_get, cache_set


async def run_analysis_job(ctx: dict, job_data: dict) -> dict:
    """ARQ job: analyze GitHub repo, website, or Upwork job post."""
    analysis_id = uuid.UUID(job_data["analysis_id"])
    analysis_type = job_data.get("type", "github")

    redis: ArqRedis = ctx["redis"]

    try:
        async with async_session() as session:
            result = await session.execute(sa.select(Analysis).where(Analysis.id == analysis_id))
            analysis = result.scalar_one()
            analysis.status = AnalysisStatus.FETCHING
            await session.commit()

        if analysis_type == "github":
            full_result = await _analyze_github(redis, analysis_id, job_data)
        elif analysis_type == "website":
            full_result = await _analyze_website(redis, analysis_id, job_data)
        else:
            full_result = await _analyze_upwork(redis, analysis_id, job_data)

        # Mark complete
        async with async_session() as session:
            result = await session.execute(sa.select(Analysis).where(Analysis.id == analysis_id))
            analysis = result.scalar_one()
            analysis.status = AnalysisStatus.COMPLETE
            analysis.result = {"full_text": full_result}
            analysis.completed_at = datetime.now(timezone.utc)
            await session.commit()

        await emit_log(redis, analysis_id, "> Analysis complete")

        return {"status": "complete", "analysis_id": str(analysis_id)}

    except Exception as e:
        logger.error("analysis_failed", analysis_id=str(analysis_id), error=str(e))

        async with async_session() as session:
            result = await session.execute(sa.select(Analysis).where(Analysis.id == analysis_id))
            analysis = result.scalar_one()
            analysis.status = AnalysisStatus.FAILED
            analysis.error_message = str(e)
            await session.commit()

        await emit_error(redis, analysis_id, str(e))
        raise


async def _analyze_github(redis: ArqRedis, analysis_id: uuid.UUID, job_data: dict) -> str:
    """Analyze a GitHub repository."""
    owner = job_data["owner"]
    repo = job_data["repo"]

    await emit_log(redis, analysis_id, "> Fetching repository tree...")

    repo_info = await fetch_repo_info(owner, repo)
    commit_sha = repo_info.get("default_branch", "main")

    # Check cache
    cache_key = f"analysis:{owner}/{repo}:{commit_sha}"
    cached = await cache_get(cache_key)
    if cached:
        await emit_log(redis, analysis_id, "> Using cached analysis result")
        full_result = cached.get("full_text", "")
        for line in full_result.split("\n"):
            await emit_result(redis, analysis_id, line + "\n")
        return full_result

    tree = await fetch_repo_tree(owner, repo)
    tree_summary = "\n".join(item.get("path", "") for item in tree[:200])

    async with async_session() as session:
        result = await session.execute(sa.select(Analysis).where(Analysis.id == analysis_id))
        analysis = result.scalar_one()
        analysis.status = AnalysisStatus.ANALYZING
        analysis.file_count = len(tree)
        await session.commit()

    await emit_log(redis, analysis_id, f"> Found {len(tree)} files")
    await emit_log(redis, analysis_id, "> Fetching key configuration files...")

    key_files = await fetch_key_files(owner, repo, tree)

    async with async_session() as session:
        result = await session.execute(sa.select(Analysis).where(Analysis.id == analysis_id))
        analysis = result.scalar_one()
        analysis.key_files_loaded = len(key_files)
        await session.commit()

    await emit_log(redis, analysis_id, f"> Loaded {len(key_files)} key files")
    await emit_log(redis, analysis_id, "> Starting AI agent analysis...")

    full_result = ""
    section_buffer = ""
    section_order = 0

    async for chunk in analyze_repo(tree_summary, key_files):
        full_result += chunk
        section_buffer += chunk

        if chunk.startswith("#") or "\n#" in chunk:
            if section_buffer.strip():
                await save_chunk(analysis_id, section_buffer, section_order)
                section_order += 1
                section_buffer = ""

        await emit_result(redis, analysis_id, chunk)

    if section_buffer.strip():
        await save_chunk(analysis_id, section_buffer, section_order)

    await cache_set(cache_key, {"full_text": full_result}, ttl_seconds=7 * 24 * 3600)
    return full_result


async def _analyze_website(redis: ArqRedis, analysis_id: uuid.UUID, job_data: dict) -> str:
    """Analyze a website by scraping its content with SSRF protection."""
    url = job_data["url"]

    await emit_log(redis, analysis_id, f"> Fetching {url}...")

    cache_key = f"analysis:website:{url}"
    cached = await cache_get(cache_key)
    if cached:
        await emit_log(redis, analysis_id, "> Using cached analysis result")
        full_result = cached.get("full_text", "")
        for line in full_result.split("\n"):
            await emit_result(redis, analysis_id, line + "\n")
        return full_result

    # Safe fetch with SSRF protection, timeout, size limits
    try:
        text = await safe_fetch_text(url, max_chars=10000)
    except ValueError as e:
        raise ValueError(f"Website fetch failed: {e}")
    except httpx.HTTPStatusError as e:
        raise ValueError(f"Website returned error: {e.response.status_code}")
    except Exception as e:
        raise ValueError(f"Failed to fetch website: {e}")

    # Get headers for tech detection
    async with httpx.AsyncClient(follow_redirects=True, timeout=15, max_redirects=3) as client:
        resp = await client.get(url)
        tech_stack = []
        headers_lower = {k.lower(): v.lower() for k, v in resp.headers.items()}
        if "x-powered-by" in headers_lower:
            tech_stack.append(f"X-Powered-By: {headers_lower['x-powered-by']}")
        if "server" in headers_lower:
            tech_stack.append(f"Server: {headers_lower['server']}")
        if "x-generator" in headers_lower:
            tech_stack.append(f"Generator: {headers_lower['x-generator']}")
        if "wordpress" in text.lower():
            tech_stack.append("WordPress detected")
        if "react" in text.lower():
            tech_stack.append("React detected")
        if "next.js" in text.lower() or "__next" in text.lower():
            tech_stack.append("Next.js detected")

    async with async_session() as session:
        result = await session.execute(sa.select(Analysis).where(Analysis.id == analysis_id))
        analysis = result.scalar_one()
        analysis.status = AnalysisStatus.ANALYZING
        analysis.file_count = len(text)
        await session.commit()

    await emit_log(redis, analysis_id, f"> Scraped {len(text)} characters")
    await emit_log(redis, analysis_id, f"> Detected: {', '.join(tech_stack) if tech_stack else 'No specific tech detected'}")
    await emit_log(redis, analysis_id, "> Starting AI agent analysis...")

    full_result = ""
    async for chunk in analyze_website(url, text, tech_stack):
        full_result += chunk
        await emit_result(redis, analysis_id, chunk)

    await cache_set(cache_key, {"full_text": full_result}, ttl_seconds=24 * 3600)
    return full_result


async def _analyze_upwork(redis: ArqRedis, analysis_id: uuid.UUID, job_data: dict) -> str:
    """Analyze an Upwork job post from pasted description."""
    description = job_data.get("description", "")
    job_id = job_data.get("job_id", "")

    if not description and not job_id:
        raise ValueError("No job description or ID provided")

    if job_id:
        await emit_log(redis, analysis_id, f"> Analyzing Upwork job {job_id}...")
    else:
        await emit_log(redis, analysis_id, "> Analyzing pasted job description...")

    cache_key = f"analysis:upwork:{job_id or hashlib.md5(description.encode()).hexdigest()[:12]}"
    cached = await cache_get(cache_key)
    if cached:
        await emit_log(redis, analysis_id, "> Using cached analysis result")
        full_result = cached.get("full_text", "")
        for line in full_result.split("\n"):
            await emit_result(redis, analysis_id, line + "\n")
        return full_result

    async with async_session() as session:
        result = await session.execute(sa.select(Analysis).where(Analysis.id == analysis_id))
        analysis = result.scalar_one()
        analysis.status = AnalysisStatus.ANALYZING
        await session.commit()

    await emit_log(redis, analysis_id, f"> Processing {len(description)} characters of job description")
    await emit_log(redis, analysis_id, "> Starting AI agent analysis...")

    full_result = ""
    async for chunk in analyze_upwork_job(job_id or "pasted", "", description):
        full_result += chunk
        await emit_result(redis, analysis_id, chunk)

    await cache_set(cache_key, {"full_text": full_result}, ttl_seconds=3 * 24 * 3600)
    return full_result


async def emit_log(redis: ArqRedis, analysis_id: uuid.UUID, message: str):
    await redis.publish(f"analysis:{analysis_id}:log", json.dumps({"type": "log", "data": message}))


async def emit_result(redis: ArqRedis, analysis_id: uuid.UUID, chunk: str):
    await redis.publish(f"analysis:{analysis_id}:result", json.dumps({"type": "result", "data": chunk}))


async def emit_error(redis: ArqRedis, analysis_id: uuid.UUID, error: str):
    await redis.publish(f"analysis:{analysis_id}:error", json.dumps({"type": "error", "data": error}))


async def save_chunk(analysis_id: uuid.UUID, content: str, order: int):
    chunk = AnalysisChunk(analysis_id=analysis_id, section="analysis", content=content, order=order)
    async with async_session() as session:
        session.add(chunk)
        await session.commit()


class WorkerSettings:
    functions = [run_analysis_job]
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
    max_jobs = 5
    job_timeout = 600
    health_check_interval = 10

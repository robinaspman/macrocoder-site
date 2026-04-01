import json
import uuid
import hashlib
from typing import Literal, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from arq.connections import ArqRedis
from app.core.database import get_db
from app.core.logging import logger
from app.core.config import settings
from app.models import Analysis, AnalysisStatus, User
from app.services.auth import get_current_user
from app.services.cache import cache_get, cache_set
from app.services.worker import run_analysis_job
from app.services.ssrf import validate_url, validate_github_repo, validate_upwork_job_id
from app.services.rate_limit import check_rate_limit, check_session_cap, generate_quote_id
from app.services.safe_http import safe_fetch_text
from app.services.review_service import process_review

router = APIRouter(prefix="/api", tags=["analysis"])

MAX_ANALYSIS_TOKENS = 4096
MAX_TURNS = 3


class AnalyzeRequest(BaseModel):
    type: Literal["github", "website", "upwork"] = "github"
    owner: Optional[str] = None
    repo: Optional[str] = None
    url: Optional[str] = None
    job_id: Optional[str] = None
    description: Optional[str] = None


@router.post("/review")
async def start_review(
    request: Request,
    body: AnalyzeRequest,
    db: AsyncSession = Depends(get_db),
):
    """Submit a review request with full SSRF protection and rate limiting.
    Uses the lead_review_toolkit_plus pipeline for analysis."""
    session_id = request.client.host if request.client else "unknown"

    try:
        check_rate_limit(session_id)
        check_session_cap(session_id)
    except ValueError as e:
        raise HTTPException(429, str(e))

    if body.type == "github":
        if not body.owner or not body.repo:
            raise HTTPException(400, "owner and repo required for github review")
        owner, repo = validate_github_repo(body.owner, body.repo)
        source = f"{owner}/{repo}"
        review_type = "github"
    elif body.type == "website":
        if not body.url:
            raise HTTPException(400, "url required for website review")
        validate_url(body.url, allowed_hosts=None)
        source = body.url
        review_type = "website"
    elif body.type == "upwork":
        if body.job_id:
            validate_upwork_job_id(body.job_id)
            source = f"upwork:{body.job_id}"
        elif body.description:
            if len(body.description) > 10000:
                raise HTTPException(400, "Description too long (max 10000 chars)")
            source = "upwork:description"
        else:
            raise HTTPException(400, "job_id or description required for upwork review")
        review_type = "upwork"
    else:
        raise HTTPException(400, "Invalid review type")

    try:
        review_result = await process_review(
            review_type=review_type,
            owner=body.owner,
            repo=body.repo,
            url=body.url,
            description=body.description,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        logger.error("review_failed", error=str(e))
        raise HTTPException(500, f"Review failed: {str(e)}")

    analysis = Analysis(
        user_id=uuid.uuid4(),
        repo_owner=review_type,
        repo_name=source,
        status=AnalysisStatus.COMPLETE,
        result=review_result,
    )
    db.add(analysis)
    await db.flush()

    logger.info(
        "review_completed",
        analysis_id=str(analysis.id),
        type=review_type,
        source=source,
        session_id=session_id,
    )

    return review_result


@router.get("/review/{analysis_id}")
async def get_review_status(
    analysis_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get review status and results."""
    result = await db.execute(
        select(Analysis).where(Analysis.id == uuid.UUID(analysis_id))
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(404, "Review not found")

    response = {
        "id": str(analysis.id),
        "type": analysis.repo_owner,
        "source": analysis.repo_name,
        "status": analysis.status.value,
        "file_count": analysis.file_count,
        "key_files_loaded": analysis.key_files_loaded,
        "error_message": analysis.error_message,
        "created_at": analysis.created_at.isoformat() if analysis.created_at else None,
        "completed_at": analysis.completed_at.isoformat() if analysis.completed_at else None,
    }

    if analysis.status == AnalysisStatus.COMPLETE and analysis.result:
        response["result"] = analysis.result

    return response


@router.get("/review/{analysis_id}/stream")
async def stream_review(analysis_id: str):
    """SSE endpoint for real-time review progress."""
    from sse_starlette.sse import EventSourceResponse
    import redis.asyncio as redis

    async def event_generator():
        r = redis.from_url(settings.REDIS_URL, decode_responses=True)
        pubsub = r.pubsub()
        await pubsub.subscribe(
            f"analysis:{analysis_id}:log",
            f"analysis:{analysis_id}:result",
            f"analysis:{analysis_id}:error",
        )

        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    channel = message["channel"]
                    data = message["data"]
                    event_type = channel.split(":")[-1]
                    yield {"event": event_type, "data": data}

                    if event_type == "error" or (event_type == "log" and "complete" in data):
                        break
        finally:
            await pubsub.unsubscribe()
            await pubsub.close()

    return EventSourceResponse(event_generator())


@router.get("/reviews")
async def list_reviews(
    db: AsyncSession = Depends(get_db),
):
    """List recent reviews (last 50)."""
    result = await db.execute(
        select(Analysis)
        .order_by(Analysis.created_at.desc())
        .limit(50)
    )
    analyses = result.scalars().all()

    return [
        {
            "id": str(a.id),
            "type": a.repo_owner,
            "source": a.repo_name,
            "status": a.status.value,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "completed_at": a.completed_at.isoformat() if a.completed_at else None,
        }
        for a in analyses
    ]


@router.post("/quote/{analysis_id}")
async def generate_quote(
    analysis_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Generate a signed, immutable quote for a completed review."""
    result = await db.execute(
        select(Analysis).where(Analysis.id == uuid.UUID(analysis_id))
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(404, "Review not found")

    if analysis.status != AnalysisStatus.COMPLETE:
        raise HTTPException(400, "Review not complete yet")

    assumptions = [
        f"Based on {analysis.repo_owner} analysis of {analysis.repo_name}",
        f"Files analyzed: {analysis.file_count or 'unknown'}",
        f"Key files loaded: {analysis.key_files_loaded or 'unknown'}",
    ]

    milestones = [
        "Phase 1: Architecture review and planning",
        "Phase 2: Core implementation",
        "Phase 3: Testing and deployment",
    ]

    price_range = ("$500", "$2000")

    quote = generate_quote_id(
        analysis_id=str(analysis.id),
        assumptions=assumptions,
        milestones=milestones,
        price_range=price_range,
    )

    if analysis.result:
        analysis.result["quote"] = quote
    else:
        analysis.result = {"quote": quote}
    await db.commit()

    return quote

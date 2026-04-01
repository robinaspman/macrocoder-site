import json
import uuid
import sqlalchemy as sa
from datetime import datetime, timezone
from arq import ArqRedis
from arq.connections import RedisSettings
from app.core.config import settings
from app.services.review_service import process_review
from app.core.database import async_session
from app.models import Analysis, AnalysisStatus
from app.core.logging import logger


async def run_analysis_job(ctx: dict, job_data: dict) -> dict:
    """ARQ job: analyze GitHub repo, website, or Upwork job post.
    Uses the toolkit pipeline (process_review) for consistent results."""
    analysis_id = uuid.UUID(job_data["analysis_id"])
    analysis_type = job_data.get("type", "github")

    redis: ArqRedis = ctx["redis"]

    try:
        async with async_session() as session:
            result = await session.execute(sa.select(Analysis).where(Analysis.id == analysis_id))
            analysis = result.scalar_one()
            analysis.status = AnalysisStatus.FETCHING
            await session.commit()

        await emit_log(redis, analysis_id, f"> Starting {analysis_type} analysis...")

        # Use the same toolkit pipeline as the sync path
        review_result = await process_review(
            review_type=analysis_type,
            owner=job_data.get("owner"),
            repo=job_data.get("repo"),
            url=job_data.get("url"),
            description=job_data.get("description"),
        )

        await emit_log(redis, analysis_id, "> Analysis complete")

        async with async_session() as session:
            result = await session.execute(sa.select(Analysis).where(Analysis.id == analysis_id))
            analysis = result.scalar_one()
            analysis.status = AnalysisStatus.COMPLETE
            analysis.result = review_result
            analysis.completed_at = datetime.now(timezone.utc)
            await session.commit()

        await emit_result(redis, analysis_id, json.dumps(review_result))

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


async def emit_log(redis: ArqRedis, analysis_id: uuid.UUID, message: str):
    await redis.publish(f"analysis:{analysis_id}:log", json.dumps({"type": "log", "data": message}))


async def emit_result(redis: ArqRedis, analysis_id: uuid.UUID, chunk: str):
    await redis.publish(f"analysis:{analysis_id}:result", json.dumps({"type": "result", "data": chunk}))


async def emit_error(redis: ArqRedis, analysis_id: uuid.UUID, error: str):
    await redis.publish(f"analysis:{analysis_id}:error", json.dumps({"type": "error", "data": error}))


class WorkerSettings:
    functions = [run_analysis_job]
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
    max_jobs = 5
    job_timeout = 600
    health_check_interval = 10

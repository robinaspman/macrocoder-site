from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.services.post_hire_service import post_hire_service
from app.toolkit.post_hire.exceptions import ToolkitError

router = APIRouter(prefix="/api/post-hire", tags=["post-hire-analysis"])


class PostHireAnalysisRequest(BaseModel):
    project_path: str
    notes_path: Optional[str] = None
    issues_path: Optional[str] = None
    output_dir: Optional[str] = None


class PostHireExportRequest(BaseModel):
    project_path: str
    endpoint_url: str
    bearer_token: Optional[str] = None
    export_dir: Optional[str] = None


@router.post("/analyze")
async def analyze_project(body: PostHireAnalysisRequest):
    try:
        result = await post_hire_service.run_analysis(
            project_path=body.project_path,
            notes_path=body.notes_path,
            issues_path=body.issues_path,
            output_dir=body.output_dir,
        )
        return result
    except ToolkitError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Analysis failed: {str(e)}")


@router.post("/export")
async def export_analysis(body: PostHireExportRequest):
    try:
        result = await post_hire_service.export_for_rust(
            project_path=body.project_path,
            reports={},
            endpoint_url=body.endpoint_url,
            bearer_token=body.bearer_token,
            export_dir=body.export_dir,
        )
        return result
    except ToolkitError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Export failed: {str(e)}")


@router.post("/analyze-and-export")
async def analyze_and_export(
    analysis: PostHireAnalysisRequest,
    endpoint_url: str,
    bearer_token: Optional[str] = None,
):
    try:
        analysis_result = await post_hire_service.run_analysis(
            project_path=analysis.project_path,
            notes_path=analysis.notes_path,
            issues_path=analysis.issues_path,
            output_dir=analysis.output_dir,
        )

        export_result = await post_hire_service.export_for_rust(
            project_path=analysis.project_path,
            reports=analysis_result["reports"],
            endpoint_url=endpoint_url,
            bearer_token=bearer_token,
        )

        return {
            "analysis": analysis_result,
            "export": export_result,
        }
    except ToolkitError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Pipeline failed: {str(e)}")


@router.post("/summary")
async def get_summary(body: PostHireAnalysisRequest):
    try:
        result = await post_hire_service.run_analysis(
            project_path=body.project_path,
            notes_path=body.notes_path,
            issues_path=body.issues_path,
            output_dir=body.output_dir,
        )
        summary = post_hire_service.get_report_summary(result["reports"])
        return {"project_id": result["project_id"], "summary": summary}
    except ToolkitError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Summary generation failed: {str(e)}")

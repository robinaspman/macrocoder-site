from pathlib import Path

from post_hire_toolkit.config import AnalysisSettings
from post_hire_toolkit.pipeline import PostHirePipeline

settings = AnalysisSettings(root=Path("."), output_dir=Path("./analysis_output"))
pipeline = PostHirePipeline(settings)
reports = pipeline.run()
bundle = pipeline.write_reports(reports)
print("Wrote:", bundle)

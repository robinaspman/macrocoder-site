# Lead Review Toolkit

A backend-oriented Python toolkit for review, scoping, pricing, screening, caching, and quote versioning.

## What is included

- **Safer URL handling** with SSRF-style checks, redirect limits, hostname/IP screening, and content-size caps
- **Website extraction** into structured JSON for AI-efficient analysis
- **Local repo profiling** for framework, stack, complexity, and risk detection
- **Pricing engine** with deterministic effort bands and milestone suggestions
- **Scope reducer** to fit oversized requests into MVP-friendly phases
- **Prompt compressor** to build compact AI contexts
- **Disk cache** with fingerprints and TTL support
- **Intent router** for follow-up questions
- **Quote versioner** with HMAC signing
- **Red-flag + contradiction + seriousness scoring**
- **FAQ rules engine**
- **Token budget router** to reduce unnecessary model spend

## Install

```bash
pip install -r requirements.txt
```

## Quick example

```python
from toolkit.models import ProjectIntake, ProjectFeatureFlags
from toolkit.pricing_engine import PricingEngine
from toolkit.scope_reducer import ScopeReducer

intake = ProjectIntake(
    project_type="web_app",
    source_kind="website",
    title="SaaS MVP",
    feature_flags=ProjectFeatureFlags(
        frontend=True,
        backend=True,
        auth=True,
        payments=False,
        admin_panel=True,
        analytics=False,
        ai_features=True,
    ),
    desired_budget=2500,
    timeline_weeks=4,
)

estimate = PricingEngine().estimate(intake)
print(estimate.package_tier, estimate.budget_fit, estimate.price_range)

reduced = ScopeReducer().reduce_to_budget(intake, estimate, target_budget=1800)
print(reduced.summary)
```

## Security notes

This toolkit treats **all frontend input as untrusted**.

Important:
- Only trust backend-generated quotes
- Keep API keys server-side
- Use `URLGuard` before fetching user-submitted URLs
- Use `QuoteVersioner` to generate immutable quote records
- Use `DiskCache` and `TokenBudgetRouter` to cut down model usage
- Do not expose raw pricing logic to the frontend

## Suggested backend wiring

- `URLGuard` -> classify + safely fetch
- `WebsiteExtractor` or `RepoProfiler` -> structured facts
- `ContradictionDetector` + `RedFlagDetector` + `SeriousnessScorer`
- `PricingEngine`
- `ScopeReducer`
- `PromptCompressor`
- `IntentRouter`
- `QuoteVersioner`

## Files

- `toolkit/url_guard.py`
- `toolkit/website_extractor.py`
- `toolkit/repo_profiler.py`
- `toolkit/pricing_engine.py`
- `toolkit/scope_reducer.py`
- `toolkit/prompt_compressor.py`
- `toolkit/cache_manager.py`
- `toolkit/intent_router.py`
- `toolkit/quote_versioner.py`
- `toolkit/red_flag_detector.py`
- `toolkit/seriousness_scorer.py`
- `toolkit/token_budget_router.py`
- `toolkit/contradiction_detector.py`
- `toolkit/faq_rules.py`
- `toolkit/review_pipeline.py`

## Production advice

- Remove source maps in production if you want lighter frontend exposure
- Keep pricing, quotes, and quote signatures strictly backend-side
- Add rate limiting and auth in your API layer
- Prefer scope-based negotiation over open-ended price haggling


## Plus edition: the last 4 extras worth adding

This package includes four **final practical additions** that are worth having before this becomes overengineered:

- **SensitiveDataScrubber** (`toolkit/sensitive_data_scrubber.py`)
  - Redacts emails, phone numbers, obvious API keys, bearer tokens, JWT-like strings, and IP addresses before sending content to AI.
  - Best used in privacy-sensitive mode and before prompt construction.

- **JobPostExtractor** (`toolkit/job_post_extractor.py`)
  - Turns pasted job post text or job-post HTML into structured fields like budget, timeline, skills, deliverables, and seniority.
  - Useful because Upwork job posts are one of your key inputs.

- **CreditGuard** (`toolkit/credit_guard.py`)
  - Enforces per-session / per-client AI usage caps with rough token and dollar accounting.
  - Prevents endless quote haggling from burning credits.

- **AbuseGuard** (`toolkit/abuse_guard.py`)
  - Scores repetitive quote recalculations, bursty requests, and suspicious repetition.
  - Helps you slow down bad actors before they become expensive.

### Why I would stop here

After these four, the next additions start sliding into **framework concerns** or **premature complexity**:
- queue workers
- custom vector memory
- browser automation for every source
- heavy anomaly models
- advanced bot fingerprinting
- multi-tenant billing engines

Those can come later if real traffic justifies them. For now, this is the practical ceiling before it becomes overkill.

from typing import AsyncGenerator
from anthropic import AsyncAnthropic
from app.core.config import ANTHROPIC_API_KEY, ANTHROPIC_MODEL

client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY)

ANALYSIS_PROMPT = """You are an expert autonomous AI code reviewer. Analyze the following GitHub repository and provide:

1. **Architecture Overview** - What does this codebase do? What's the tech stack?
2. **Code Quality** - Rate the overall quality (1-10) with specific observations
3. **Key Strengths** - What's done well
4. **Critical Issues** - Bugs, security risks, anti-patterns
5. **Improvement Suggestions** - Actionable recommendations
6. **Dependency Health** - Outdated packages, unused deps, vulnerabilities
7. **Complexity Hotspots** - Files that are too complex or tightly coupled

Be direct, specific, and actionable. Reference actual files and patterns you see."""

WEBSITE_PROMPT = """You are an expert web analyst. Analyze the following website and provide:

1. **Tech Stack Detection** - What technologies, frameworks, and tools are used?
2. **SEO & Performance** - How well is the site optimized? Any obvious issues?
3. **Content Quality** - Is the messaging clear, professional, and conversion-focused?
4. **Security Observations** - Any visible security concerns (mixed content, missing headers)?
5. **UX/Design Assessment** - How does the site structure and content layout feel?
6. **Competitive Positioning** - What does this site communicate about the business?
7. **Actionable Recommendations** - What should be improved, prioritized by impact?

Be direct, specific, and actionable."""

UPWORK_PROMPT = """You are an expert technical project manager and developer. Analyze this Upwork job post and provide:

1. **Project Summary** - What is the client actually asking for? (translate client-speak to technical requirements)
2. **Technical Requirements** - What skills, technologies, and experience are needed?
3. **Scope Assessment** - Is this a small fix, medium project, or large engagement? Estimate effort.
4. **Red Flags** - Vague requirements, unrealistic expectations, budget mismatches
5. **Opportunity Assessment** - Is this a good fit? What's the potential for long-term work?
6. **Proposal Strategy** - How should you position your response? What to emphasize?
7. **Questions to Ask** - What clarifying questions would you ask before committing?

Be direct, specific, and actionable. Help the freelancer win this job."""


async def analyze_repo(tree_summary: str, key_files: dict[str, str]) -> AsyncGenerator[str, None]:
    """Stream AI analysis of a GitHub repository via Anthropic API."""
    file_context = "\n\n".join(
        f"--- {path} ---\n{content[:3000]}" for path, content in key_files.items()
    )

    message = f"""Repository structure:
{tree_summary}

Key files:
{file_context}

Analyze this codebase."""

    stream = await client.messages.create(
        model=ANTHROPIC_MODEL,
        max_tokens=4096,
        system=ANALYSIS_PROMPT,
        messages=[{"role": "user", "content": message}],
        stream=True
    )

    async for chunk in stream:
        if chunk.type == "content_block_delta" and chunk.delta.type == "text_delta":
            yield chunk.delta.text


async def analyze_website(url: str, content: str, tech_stack: list[str]) -> AsyncGenerator[str, None]:
    """Stream AI analysis of a website."""
    tech_info = "\n".join(tech_stack) if tech_stack else "No specific technologies detected"

    message = f"""URL: {url}

Detected technologies:
{tech_info}

Page content (first 10000 chars):
{content[:10000]}

Analyze this website."""

    stream = await client.messages.create(
        model=ANTHROPIC_MODEL,
        max_tokens=4096,
        system=WEBSITE_PROMPT,
        messages=[{"role": "user", "content": message}],
        stream=True
    )

    async for chunk in stream:
        if chunk.type == "content_block_delta" and chunk.delta.type == "text_delta":
            yield chunk.delta.text


async def analyze_upwork_job(job_id: str, url: str, content: str) -> AsyncGenerator[str, None]:
    """Stream AI analysis of an Upwork job post."""
    message = f"""Job ID: {job_id}
URL: {url}

Job post content:
{content[:15000]}

Analyze this job post."""

    stream = await client.messages.create(
        model=ANTHROPIC_MODEL,
        max_tokens=4096,
        system=UPWORK_PROMPT,
        messages=[{"role": "user", "content": message}],
        stream=True
    )

    async for chunk in stream:
        if chunk.type == "content_block_delta" and chunk.delta.type == "text_delta":
            yield chunk.delta.text

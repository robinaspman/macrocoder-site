# Post-Hire Analysis Toolkit

A companion toolkit for the **after-hire** phase of your platform.

This package turns a client project into structured JSON so you can:
- inspect the stack quickly
- build a delivery plan
- surface risks and hotspots
- produce client dossiers
- export the whole bundle to a Hetzner-hosted Rust AI backend

## What is included

- `project_inventory.py` — repo and stack inventory
- `architecture_mapper.py` — routes, jobs, middleware, services, webhooks
- `dependency_audit.py` — dependency extraction and overlap hints
- `env_surface_mapper.py` — env vars, missing example vars, hardcoded secret hints
- `database_schema_extractor.py` — Prisma / SQLAlchemy / SQL / Drizzle clues
- `api_contract_extractor.py` — endpoints and auth/error patterns
- `frontend_component_map.py` — components, layouts, form-heavy views
- `test_coverage_profiler.py` — test framework presence and obvious gaps
- `performance_hotspot_finder.py` — large files and request-heavy surfaces
- `security_posture_snapshot.py` — static security issue hints
- `docs_digest.py` — docs summaries and missing docs
- `issue_backlog_parser.py` — bug / feature / infra theme extraction
- `meeting_notes_to_json.py` — convert notes/transcripts into JSON
- `risk_register_generator.py` — technical / delivery / business risk summary
- `implementation_plan_builder.py` — quick wins, phases, blockers, milestones
- `client_context_builder.py` — one dossier JSON for yourself
- `decision_log_extractor.py` — decision harvesting
- `upsell_opportunity_finder.py` — useful post-hire upsell ideas
- `hetzner_exporter.py` — bundle JSON and POST to your Hetzner Rust service

## Why this is enough

For the stage you described, this is already the important set.

You do **not** need more unless you later want:
- AST-grade parsers for every language
- real dependency vulnerability feeds
- queue workers and distributed scans
- source graph embeddings everywhere
- browser automation for every docs system

That would be overkill right now.

## Basic usage

```bash
python -m post_hire_toolkit.cli /path/to/project --notes notes.txt --issues issues.json
```

This writes all JSON files into `analysis_output/`.

## Hetzner / Rust analysis export

The pipeline can prepare a Rust-friendly payload and send it to a backend endpoint on your Hetzner server.

```bash
python -m post_hire_toolkit.cli /path/to/project \
  --export-endpoint https://your-domain.example/analyze/intake \
  --export-token YOUR_TOKEN
```

The exporter:
- writes a local bundle
- computes a checksum
- gzip-compresses the payload by default
- sends a JSON payload shaped like:

```json
{
  "project_id": "client-project",
  "generated_at": 1710000000,
  "schema_version": 1,
  "reports": {
    "...": "..."
  }
}
```

This is easy for a Rust service to deserialize with `serde`.

## Security / guardrails

The scanner skips common heavy/generated directories:
- `.git`
- `node_modules`
- `dist`
- `build`
- `.venv`
- cache folders

It also:
- avoids binary file types
- limits max file size per scan
- reports obvious hardcoded secret patterns instead of trusting them silently

## Notes

This toolkit uses **static heuristics**. It is meant to create excellent JSON context cheaply and quickly.  
Then your AI or Rust backend can reason over that context.

## Tests

```bash
python -m pytest
```

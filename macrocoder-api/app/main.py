from fastapi import FastAPI, Depends, HTTPException, Header, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import httpx
import os
import json
import asyncio

app = FastAPI(title="MacroCoder API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

HETZNER_API_KEY = os.getenv("HETZNER_API_KEY", "")
HETZNER_API_URL = "https://api.hetzner.cloud/v1"

# --- Demo fallback data ---

DEMO_SESSIONS = [
    {
        "id": "deploying", "mode": "DEPLOY", "icon": "▲", "status": "running",
        "command": "macrocoder deploy --env production --region eu-w...",
        "color": "#f97316", "description": "Zero-downtime production deployment",
    },
    {
        "id": "debugging", "mode": "DEBUG", "icon": "›", "status": "running",
        "command": "macrocoder diagnose --trace",
        "color": "#f97316", "description": "Incident response resolved in 47 seconds",
    },
    {
        "id": "building", "mode": "BUILD", "icon": "●", "status": "running",
        "command": "macrocoder build dashboard --from-spec",
        "color": "#f97316", "description": "Dashboard generated from a single prompt",
    },
    {
        "id": "migrating", "mode": "MIGRATE", "icon": "◇", "status": "running",
        "command": "macrocoder migrate --from express --to edge-func...",
        "color": "#3b82f6", "description": "Express migrated to Edge Functions with no manual patching",
    },
    {
        "id": "securing", "mode": "SECURE", "icon": "□", "status": "running",
        "command": "macrocoder audit --fix --strict",
        "color": "#ef4444", "description": "Security audit and patch pass completed automatically",
    },
    {
        "id": "optimizing", "mode": "OPTIMIZE", "icon": "●", "status": "running",
        "command": "macrocoder optimize --target lighthouse",
        "color": "#22c55e", "description": "Lighthouse improved from 34 to 98 in one pass",
    },
]

DEMO_LINES = {
    "deploying": [
        {"type": "command", "text": "$ macrocoder deploy --env production", "delay": 0},
        {"type": "output", "text": "", "delay": 200},
        {"type": "output", "text": "◎ Authenticating...", "delay": 400},
        {"type": "credential", "text": "Token: sk-proj-████████████████████████", "delay": 600},
        {"type": "success", "text": "✓ Authenticated", "delay": 500},
        {"type": "output", "text": "", "delay": 300},
        {"type": "output", "text": "» Building production bundle...", "delay": 600},
        {"type": "success", "text": "├── Compiling 847 modules", "delay": 800},
        {"type": "success", "text": "├── Tree-shaking", "delay": 400},
        {"type": "success", "text": "└── Minifying 2.4MB → 412KB", "delay": 500},
    ],
    "debugging": [
        {"type": "command", "text": "$ macrocoder diagnose --trace", "delay": 0},
        {"type": "output", "text": "", "delay": 200},
        {"type": "output", "text": "◎ Loading trace from Sentry...", "delay": 400},
        {"type": "success", "text": "✓ Trace loaded (247 events)", "delay": 600},
        {"type": "output", "text": "  Analyzing stack trace...", "delay": 500},
        {"type": "success", "text": "  ✓ Root cause: null reference in user_service.ts:47", "delay": 700},
    ],
    "building": [
        {"type": "command", "text": "$ macrocoder build dashboard --from-spec", "delay": 0},
        {"type": "output", "text": "", "delay": 200},
        {"type": "output", "text": "◎ Parsing spec: dashboard.yaml", "delay": 400},
        {"type": "success", "text": "✓ Found 23 components", "delay": 600},
        {"type": "success", "text": "✓ Generated React components", "delay": 800},
        {"type": "success", "text": "✓ Generated API routes", "delay": 500},
    ],
    "migrating": [
        {"type": "command", "text": "$ macrocoder migrate --from express", "delay": 0},
        {"type": "output", "text": "", "delay": 200},
        {"type": "output", "text": "◎ Analyzing Express routes...", "delay": 400},
        {"type": "success", "text": "✓ Found 14 routes, 8 middleware", "delay": 600},
        {"type": "output", "text": "  Converting to Edge Functions...", "delay": 800},
    ],
    "securing": [
        {"type": "command", "text": "$ macrocoder audit --fix --strict", "delay": 0},
        {"type": "output", "text": "", "delay": 200},
        {"type": "output", "text": "◎ Scanning for vulnerabilities...", "delay": 400},
        {"type": "error", "text": "  ✗ SQL injection in src/db/user.ts:42", "delay": 600},
        {"type": "success", "text": "  → Fixed: parameterized query", "delay": 500},
    ],
    "optimizing": [
        {"type": "command", "text": "$ macrocoder optimize --target lighthouse", "delay": 0},
        {"type": "output", "text": "", "delay": 200},
        {"type": "output", "text": "◎ Running Lighthouse audit...", "delay": 400},
        {"type": "success", "text": "  Performance: 34 → 98", "delay": 800},
        {"type": "success", "text": "  Accessibility: 100 ✓", "delay": 300},
    ],
}

DEMO_STATS = {
    "uptime": "99.97%",
    "response_time": "12ms",
    "deployments": 147,
    "files_changed": 2847,
    "tests_passing": "100%",
    "migrations": 23,
    "security_score": "96/100",
    "active_agents": 6,
}

DEMO_ACTIVITY = [
    {"time": "now", "event": "Deployed v2.4.1 to production", "detail": "Zero-downtime rolling deploy", "status": "done", "sessionId": "deploying"},
    {"time": "2m ago", "event": "Fixed currency mismatch in checkout", "detail": "API + Stripe webhook sync", "status": "done", "sessionId": "debugging"},
    {"time": "5m ago", "event": "Migrated 14 Express routes", "detail": "Next.js Edge Functions", "status": "done", "sessionId": "migrating"},
    {"time": "8m ago", "event": "Security audit — 4 issues patched", "detail": "SQL injection + exposed keys", "status": "done", "sessionId": "securing"},
]

DEMO_JOURNAL = [
    {"id": "j7-1", "day": 7, "time": "14:22", "title": "Zero-downtime strategy locked in", "body": "Client's on managed Postgres. Blue-green swap strategy.", "expandedThought": "// Decision made: Use blue-green for zero-downtime.\n// Risk: Low — both versions run simultaneously.\n// Timeline: 2 hours for full switchover.\n// [REDACTED] client-specific config", "sessionId": "deploying"},
    {"id": "j6-2", "day": 6, "time": "10:15", "title": "Express → Edge migration path", "body": "Found 14 routes, 8 middleware to convert.", "expandedThought": "// Analysis: 87% can auto-convert\n// Manual work: 13% — custom auth middleware\n// [REDACTED] client's proprietary auth flow", "sessionId": "migrating"},
]

# --- Auth ---

def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != HETZNER_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return x_api_key

# --- Hetzner client ---

async def hetzner_get(path: str):
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{HETZNER_API_URL}{path}",
            headers={"Authorization": f"Bearer {HETZNER_API_KEY}"},
            timeout=10.0,
        )
        resp.raise_for_status()
        return resp.json()

# --- Endpoints ---

@app.get("/api/sessions")
async def get_sessions(_=Depends(verify_api_key)):
    """Get active terminal sessions from Hetzner servers."""
    try:
        data = await hetzner_get("/servers")
        servers = data.get("servers", [])
        live_sessions = []
        for server in servers:
            meta = server.get("labels", {})
            if meta.get("macrocoder_mode"):
                live_sessions.append({
                    "id": str(server["id"]),
                    "mode": meta.get("macrocoder_mode", "UNKNOWN"),
                    "icon": meta.get("macrocoder_icon", "●"),
                    "status": "running" if server["status"] == "running" else "idle",
                    "command": meta.get("macrocoder_command", ""),
                    "color": meta.get("macrocoder_color", "#f97316"),
                    "description": meta.get("macrocoder_description", ""),
                })
        return live_sessions if live_sessions else DEMO_SESSIONS
    except Exception:
        return DEMO_SESSIONS

@app.get("/api/sessions/{session_id}/lines")
async def get_session_lines(session_id: str, _=Depends(verify_api_key)):
    """Get terminal output lines for a session."""
    # Demo mode — return hardcoded lines
    return DEMO_LINES.get(session_id, [])

@app.get("/api/activity")
async def get_activity(_=Depends(verify_api_key)):
    """Get activity log from Hetzner actions."""
    try:
        data = await hetzner_get("/actions?status=success&sort=desc&per_page=50")
        actions = data.get("actions", [])
        activity = []
        for action in actions:
            activity.append({
                "time": action.get("started", "")[:16].replace("T", " "),
                "event": f"Action {action.get('command', 'completed')}",
                "detail": f"Server #{action.get('resources', [{}])[0].get('id', 'unknown')}",
                "status": "done",
                "sessionId": "deploying",
            })
        return activity if activity else DEMO_ACTIVITY
    except Exception:
        return DEMO_ACTIVITY

@app.get("/api/stats")
async def get_stats(_=Depends(verify_api_key)):
    """Get live stats from Hetzner."""
    try:
        data = await hetzner_get("/servers")
        servers = data.get("servers", [])
        running = sum(1 for s in servers if s["status"] == "running")
        return {**DEMO_STATS, "active_agents": running, "deployments": len(servers)}
    except Exception:
        return DEMO_STATS

@app.get("/api/journal")
async def get_journal(_=Depends(verify_api_key)):
    """Get journal entries."""
    # Would hit Hetzner server for journal data
    return DEMO_JOURNAL

@app.get("/api/journal/{entry_id}/thought")
async def get_journal_thought(entry_id: str, _=Depends(verify_api_key)):
    """Get expanded thought for a journal entry."""
    for entry in DEMO_JOURNAL:
        if entry["id"] == entry_id:
            return {"expanded_thought": entry["expanded_thought"]}
    return {"expanded_thought": ""}

# --- WebSocket for real-time terminal ---

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    lines = DEMO_LINES.get(session_id, DEMO_LINES["deploying"])
    
    try:
        for line in lines:
            await asyncio.sleep(line["delay"] / 1000)
            await websocket.send_json(line)
        
        # Keep connection alive, send heartbeat
        while True:
            await asyncio.sleep(5)
            await websocket.send_json({"type": "heartbeat", "text": ""})
    except WebSocketDisconnect:
        pass

@app.get("/health")
async def health():
    return {"status": "ok"}
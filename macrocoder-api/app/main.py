from fastapi import FastAPI, Depends, HTTPException, Header, WebSocket, WebSocketDisconnect, Request, Form, Query, Body, Path
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from typing import Optional
import httpx
import os
import json
import asyncio
import jwt
import time
import logging
import threading
import hmac
from collections import defaultdict
from datetime import datetime, timedelta
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from contextlib import asynccontextmanager

from database import db

from contextlib import asynccontextmanager

from database import db


# ============== LIFESPAN ==============

@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.init()
    logging.info("Database initialized")
    yield


# ============== SETUP ==============

app = FastAPI(title="MacroCoder API", lifespan=lifespan)

# Environment detection
ENV = os.getenv("ENV", "development")

# Rate limiter with proper IP extraction
def get_real_ip(request: Request) -> str:
    trusted_proxies = os.getenv("TRUSTED_PROXIES", "").split(",") if ENV == "production" else []
    
    # Only trust X-Forwarded-For from trusted proxies in production
    if trusted_proxies and request.client and request.client.host in trusted_proxies:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
    
    return request.client.host if request.client else "unknown"

limiter = Limiter(key_func=get_real_ip)
app.state.limiter = limiter

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://macrocoder.dev", "https://www.macrocoder.dev"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-API-Key"],
)

# Logging with sanitization
log_dir = os.getenv("LOG_DIR", "/var/log")
try:
    os.makedirs(log_dir, exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s",
        handlers=[
            logging.FileHandler(f"{log_dir}/macrocoder-audit.log"),
            logging.StreamHandler(),
        ],
    )
except Exception:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

HETZNER_API_KEY = os.getenv("HETZNER_API_KEY", "")

# JWT Secret - FAIL if not set in production (strict)
JWT_SECRET = os.getenv("JWT_SECRET")
if ENV == "production":
    if not JWT_SECRET:
        raise ValueError("JWT_SECRET must be set in production!")
    if len(JWT_SECRET) < 32:
        raise ValueError("JWT_SECRET must be at least 32 characters")
elif not JWT_SECRET:
    JWT_SECRET = "dev-only-secret-change-in-production"

# ============== CONFIG ==============

CLIENT_PERMISSIONS = {
    "demo": {"sessions": ["deploy", "debug", "build", "migrate", "secure", "optimize"], "can_view_internal": True},
}

# Thread-safe rate limiting
rate_limit_store = defaultdict(list)
rate_lock = threading.Lock()
_last_cleanup = time.time()
CLEANUP_INTERVAL = 300  # 5 minutes

# WebSocket connection tracking
ws_connections = defaultdict(int)
ws_lock = threading.Lock()
WS_MAX_CONNECTIONS = 100

# ============== MODELS ==============

class LoginRequest(BaseModel):
    client_id: str
    api_key: str

class SessionRequest(BaseModel):
    mode: str = Field(..., pattern="^(deploy|debug|build|migrate|secure|optimize)$")
    command: str = Field(..., max_length=500)

    @validator('command')
    def sanitize_command(cls, v):
        dangerous = ["&&", "||", ";", "|", "`", "$("]
        for d in dangerous:
            if d in v:
                raise ValueError(f"Invalid command character: {d}")
        return v

# ============== HELPERS ==============

def sanitize_for_log(value: str) -> str:
    """Remove newlines and control characters that could inject fake log entries."""
    return ''.join(c for c in value if ord(c) >= 32 or c in '\t').strip()[:200]

def validate_hetzner_path(path: str) -> str:
    """Validate path to prevent path traversal/SSRF."""
    if not path.startswith("/"):
        raise ValueError("Path must start with /")
    if ".." in path or path != os.path.normpath(path):
        raise ValueError("Invalid path")
    return path

# ============== ERROR HANDLING ==============

class APIError(Exception):
    def __init__(self, message: str, status_code: int = 500, log_level: str = "error"):
        self.message = message
        self.status_code = status_code
        self.log_level = log_level
        super().__init__(message)

@app.exception_handler(APIError)
async def api_error_handler(request: Request, exc: APIError):
    getattr(logging, exc.log_level)(f"{request.method} {request.url.path} - {exc.message}")
    return {"detail": exc.message}, exc.status_code

@app.exception_handler(Exception)
async def catch_all_handler(request: Request, exc: Exception):
    logging.error(f"{request.method} {request.url.path} - Unexpected error: {type(exc).__name__}")
    return {"detail": "An unexpected error occurred. Please try again later."}, 500

# ============== SECURITY ==============

def verify_api_key(x_api_key: str = Header(None)):
    if not x_api_key or not HETZNER_API_KEY:
        logging.warning(f"Invalid API key attempt - missing key")
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    # Constant-time comparison to prevent timing attacks
    if not hmac.compare_digest(x_api_key, HETZNER_API_KEY):
        logging.warning(f"Invalid API key attempt")
        raise HTTPException(status_code=401, detail="Invalid API key")
    return x_api_key

def verify_jwt(token: str = Header(None)):
    if not token:
        raise HTTPException(status_code=401, detail="Missing authorization token")
    
    if token.startswith("Bearer "):
        token = token[7:]
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def check_rate_limit(identifier: str, limit: int = 10, window: int = 60):
    global _last_cleanup
    now = time.time()
    rate_key = f"{identifier}_{int(now / window)}"
    
    with rate_lock:
        # Periodic cleanup to prevent memory leak
        if now - _last_cleanup > CLEANUP_INTERVAL:
            cutoff = now - (window * 2)
            keys_to_delete = [k for k, v in rate_limit_store.items() 
                            if all(t < cutoff for t in v)]
            for k in keys_to_delete:
                del rate_limit_store[k]
            _last_cleanup = now
        
        rate_limit_store[rate_key] = [t for t in rate_limit_store[rate_key] if now - t < window]
        
        if len(rate_limit_store[rate_key]) >= limit:
            raise HTTPException(status_code=429, detail=f"Rate limit exceeded. Max {limit} requests per minute.")
        
        rate_limit_store[rate_key].append(now)

def check_ws_rate_limit(client_id: str) -> bool:
    """Check WebSocket connection limit."""
    with ws_lock:
        if ws_connections[client_id] >= WS_MAX_CONNECTIONS:
            return False
        ws_connections[client_id] += 1
        return True

def release_ws_connection(client_id: str):
    with ws_lock:
        ws_connections[client_id] = max(0, ws_connections[client_id] - 1)

def validate_client_id(client_id: str):
    if client_id and client_id not in CLIENT_PERMISSIONS:
        raise HTTPException(status_code=403, detail="Invalid client ID")
    return client_id

def censor_for_client(data: dict, client_id: str) -> dict:
    perms = CLIENT_PERMISSIONS.get(client_id, {})
    
    if not perms.get("can_view_internal", False):
        if isinstance(data, dict):
            if "expanded_thought" in data:
                data["expanded_thought"] = "[REDACTED - internal only]"
            if "credential" in str(data):
                data = {**data, "credentials_visible": False}
    
    return data

# ============== HETZNER CLIENT ==============

async def hetzner_get(path: str):
    validated_path = validate_hetzner_path(path)
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://api.hetzner.cloud.v1{validated_path}",
            headers={"Authorization": f"Bearer {HETZNER_API_KEY}"},
            timeout=10.0,
        )
        resp.raise_for_status()
        return resp.json()

# ============== DEMO DATA ==============

DEMO_SESSIONS = [
    {"id": "deploying", "mode": "DEPLOY", "icon": "▲", "status": "running",
     "command": "macrocoder deploy --env production --region eu-w...", "color": "#f97316",
     "description": "Zero-downtime production deployment"},
    {"id": "debugging", "mode": "DEBUG", "icon": "›", "status": "running",
     "command": "macrocoder diagnose --trace", "color": "#f97316",
     "description": "Incident response resolved in 47 seconds"},
    {"id": "building", "mode": "BUILD", "icon": "●", "status": "running",
     "command": "macrocoder build dashboard --from-spec", "color": "#f97316",
     "description": "Dashboard generated from a single prompt"},
    {"id": "migrating", "mode": "MIGRATE", "icon": "◇", "status": "running",
     "command": "macrocoder migrate --from express --to edge-func...", "color": "#3b82f6",
     "description": "Express migrated to Edge Functions with no manual patching"},
    {"id": "securing", "mode": "SECURE", "icon": "□", "status": "running",
     "command": "macrocoder audit --fix --strict", "color": "#ef4444",
     "description": "Security audit and patch pass completed automatically"},
    {"id": "optimizing", "mode": "OPTIMIZE", "icon": "●", "status": "running",
     "command": "macrocoder optimize --target lighthouse", "color": "#22c55e",
     "description": "Lighthouse improved from 34 to 98 in one pass"},
]

DEMO_LINES = {
    "deploying": [
        {"type": "command", "text": "$ macrocoder deploy --env production", "delay": 0},
        {"type": "output", "text": "", "delay": 200},
        {"type": "output", "text": "◎ Authenticating...", "delay": 400},
        {"type": "credential", "text": "Token: sk-proj-████████████████████████", "delay": 600},
        {"type": "success", "text": "✓ Authenticated", "delay": 500},
    ],
    "debugging": [
        {"type": "command", "text": "$ macrocoder diagnose --trace", "delay": 0},
        {"type": "output", "text": "◎ Loading trace from Sentry...", "delay": 400},
        {"type": "success", "text": "✓ Trace loaded", "delay": 600},
    ],
    "building": [
        {"type": "command", "text": "$ macrocoder build dashboard --from-spec", "delay": 0},
        {"type": "output", "text": "◎ Parsing spec: dashboard.yaml", "delay": 400},
        {"type": "success", "text": "✓ Generated React components", "delay": 600},
    ],
    "migrating": [
        {"type": "command", "text": "$ macrocoder migrate --from express", "delay": 0},
        {"type": "output", "text": "◎ Analyzing Express routes...", "delay": 400},
        {"type": "success", "text": "✓ Found 14 routes", "delay": 600},
    ],
    "securing": [
        {"type": "command", "text": "$ macrocoder audit --fix --strict", "delay": 0},
        {"type": "output", "text": "◎ Scanning for vulnerabilities...", "delay": 400},
        {"type": "error", "text": "  ✗ SQL injection found", "delay": 600},
        {"type": "success", "text": "  → Fixed", "delay": 500},
    ],
    "optimizing": [
        {"type": "command", "text": "$ macrocoder optimize --target lighthouse", "delay": 0},
        {"type": "output", "text": "◎ Running Lighthouse audit...", "delay": 400},
        {"type": "success", "text": "  Performance: 34 → 98", "delay": 800},
    ],
}

DEMO_STATS = {
    "uptime": "99.97%", "response_time": "12ms", "deployments": 147,
    "files_changed": 2847, "tests_passing": "100%", "migrations": 23,
    "security_score": "96/100", "active_agents": 6,
}

DEMO_ACTIVITY = [
    {"time": "now", "event": "Deployed v2.4.1", "detail": "Zero-downtime rolling deploy", "status": "done", "sessionId": "deploying"},
    {"time": "2m ago", "event": "Fixed currency mismatch", "detail": "API + Stripe webhook sync", "status": "done", "sessionId": "debugging"},
    {"time": "5m ago", "event": "Migrated 14 Express routes", "detail": "Next.js Edge Functions", "status": "done", "sessionId": "migrating"},
]

DEMO_JOURNAL = [
    {"id": "j7-1", "day": 7, "time": "14:22", "title": "Zero-downtime strategy", 
     "body": "Client's on managed Postgres. Blue-green swap strategy.", 
     "expandedThought": "// Decision: Use blue-green for zero-downtime.\n// Risk: Low\n// [REDACTED] client-specific config", "sessionId": "deploying"},
]

# ============== MIDDLEWARE ==============

@app.middleware("http")
async def log_requests(request: Request, call_next):
    # Sanitize all logged values to prevent log injection
    raw_ip = get_real_ip(request)
    client_ip = sanitize_for_log(raw_ip)
    method = sanitize_for_log(request.method)
    path = sanitize_for_log(request.url.path)
    
    logging.info(f"{client_ip} - {method} {path}")
    
    response = await call_next(request)
    return response

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    logging.warning(f"Rate limit exceeded: {get_real_ip(request)}")
    return {"detail": str(exc.detail)}, 429

# ============== ENDPOINTS ==============

@app.post("/api/auth/login")
@limiter.limit("5/minute")
async def login(request: Request, client_id: str = Form(..., max_length=100), api_key: str = Form(..., max_length=500)):
    # Sanitize client_id for logging
    safe_client_id = sanitize_for_log(client_id)
    check_rate_limit(f"login_{get_real_ip(request)}", limit=5, window=60)
    
    if client_id in CLIENT_PERMISSIONS and hmac.compare_digest(api_key, HETZNER_API_KEY):
        token = jwt.encode(
            {"client_id": client_id, "exp": datetime.utcnow() + timedelta(hours=24)},
            JWT_SECRET,
            algorithm="HS256"
        )
        logging.info(f"Client logged in: {safe_client_id}")
        return {"token": token, "permissions": CLIENT_PERMISSIONS[client_id]}
    
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.get("/api/auth/verify")
async def verify(token: str = Depends(verify_jwt)):
    return {"client_id": token["client_id"], "valid": True}

@app.get("/api/sessions")
async def get_sessions(
    request: Request,
    x_api_key: str = Depends(verify_api_key),
    token: str = Header(None)
):
    client_id = None
    if token:
        try:
            payload = jwt.decode(token.replace("Bearer ", ""), JWT_SECRET, algorithms=["HS256"])
            client_id = payload.get("client_id")
            check_rate_limit(f"session_{client_id}", limit=10, window=60)
        except Exception:
            pass
    
    check_rate_limit(f"session_{get_real_ip(request)}", limit=10, window=60)
    
    try:
        data = await hetzner_get("/servers")
        servers = data.get("servers", [])
        
        live_sessions = []
        for server in servers:
            meta = server.get("labels", {})
            if meta.get("macrocoder_mode"):
                session = {
                    "id": str(server["id"]),
                    "mode": meta.get("macrocoder_mode", "UNKNOWN"),
                    "icon": meta.get("macrocoder_icon", "●"),
                    "status": "running" if server["status"] == "running" else "idle",
                    "command": meta.get("macrocoder_command", ""),
                    "color": meta.get("macrocoder_color", "#f97316"),
                    "description": meta.get("macrocoder_description", ""),
                }
                live_sessions.append(session)
        
        if client_id and client_id != "demo":
            perms = CLIENT_PERMISSIONS.get(client_id, {})
            allowed_modes = perms.get("sessions", [])
            live_sessions = [s for s in live_sessions if s["mode"] in allowed_modes]
        
        return live_sessions if live_sessions else DEMO_SESSIONS
    except httpx.TimeoutException:
        logging.warning("Hetzner API timeout")
        return DEMO_SESSIONS
    except httpx.HTTPError as e:
        logging.error(f"Hetzner API error: {type(e).__name__}")
        return DEMO_SESSIONS
    except Exception as e:
        logging.error(f"Unexpected error in get_sessions: {type(e).__name__}")
        return DEMO_SESSIONS

@app.get("/api/sessions/{session_id}/lines")
async def get_session_lines(
    request: Request,
    session_id: str = Path(..., max_length=100),
    x_api_key: str = Depends(verify_api_key)
):
    check_rate_limit(f"lines_{get_real_ip(request)}", limit=10, window=60)
    return DEMO_LINES.get(session_id, [])

@app.get("/api/activity")
async def get_activity(request: Request):
    """Get activity log - always returns demo data unless live Hetzner data exists"""
    check_rate_limit(f"activity_{get_real_ip(request)}", limit=10, window=60)
    
    if not HETZNER_API_KEY:
        return DEMO_ACTIVITY
    
    try:
        data = await hetzner_get("/actions?status=success&sort=desc&per_page=50")
        actions = data.get("actions", [])
        
        if not actions:
            return DEMO_ACTIVITY
        
        activity = []
        for action in actions:
            activity.append({
                "time": action.get("started", "")[:16].replace("T", " "),
                "event": f"Action {action.get('command', 'completed')}",
                "detail": f"Server #{action.get('resources', [{}])[0].get('id', 'unknown')}",
                "status": "done",
                "sessionId": "deploying",
            })
        return activity + DEMO_ACTIVITY[:3]
    except Exception:
        return DEMO_ACTIVITY

@app.get("/api/stats")
async def get_stats(request: Request):
    check_rate_limit(f"stats_{get_real_ip(request)}", limit=10, window=60)
    
    if not HETZNER_API_KEY:
        return DEMO_STATS
    
    try:
        data = await hetzner_get("/servers")
        servers = data.get("servers", [])
        running = sum(1 for s in servers if s["status"] == "running")
        return {**DEMO_STATS, "active_agents": running, "deployments": len(servers)}
    except Exception:
        return DEMO_STATS

@app.get("/api/journal")
async def get_journal(request: Request):
    """Get journal entries - always returns demo data"""
    check_rate_limit(f"journal_{get_real_ip(request)}", limit=10, window=60)
    return DEMO_JOURNAL.copy()

@app.get("/api/journal/{entry_id}/thought")
async def get_journal_thought(
    request: Request,
    entry_id: str = Path(..., max_length=100),
    x_api_key: str = Header(None)
):
    check_rate_limit(f"thought_{get_real_ip(request)}", limit=10, window=60)
    
    for entry in DEMO_JOURNAL:
        if entry["id"] == entry_id:
            result = {"expanded_thought": entry["expanded_thought"]}
            if client_id and client_id != "demo":
                result = censor_for_client(result, client_id)
            return result
    
    # Return 404 for non-existent entries instead of empty
    raise HTTPException(status_code=404, detail="Entry not found")

# ============== WEBSOCKET ==============

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str = Path(..., max_length=100)):
    token = websocket.query_params.get("token")
    
    if not token:
        await websocket.close(code=4001, reason="Missing token")
        return
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        client_id = payload.get("client_id", "anonymous")
    except jwt.ExpiredSignatureError:
        await websocket.close(code=4002, reason="Token expired")
        return
    except jwt.InvalidTokenError:
        await websocket.close(code=4003, reason="Invalid token")
        return
    
    # Check connection limit before accepting
    if not check_ws_rate_limit(client_id):
        await websocket.close(code=4004, reason="Too many connections")
        return
    
    try:
        await websocket.accept()
        
        lines = DEMO_LINES.get(session_id, DEMO_LINES["deploying"])
        
        for line in lines:
            await asyncio.sleep(line["delay"] / 1000)
            await websocket.send_json(line)
        
        while True:
            await asyncio.sleep(5)
            await websocket.send_json({"type": "heartbeat", "text": ""})
    except WebSocketDisconnect:
        pass
    finally:
        release_ws_connection(client_id)

# ============== HEALTH ==============

@app.get("/health")
async def health():
    return {"status": "ok", "security": "enabled"}

@app.get("/ready")
async def ready():
    return {"status": "ready"}

# ============== SNAPSHOTS ==============

ALLOWED_MODES = ['deploy', 'debug', 'build', 'migrate', 'secure', 'optimize']


def sanitize_lines(lines: list) -> list:
    sanitized = []
    for line in lines[:1000]:
        if not isinstance(line, dict):
            continue
        sanitized.append({
            "type": str(line.get("type", "output"))[:20],
            "text": str(line.get("text", ""))[:500],
            "delay": min(int(line.get("delay", 0)), 5000),
        })
    return sanitized


class SnapshotPayload(BaseModel):
    session_id: str = Field(..., max_length=100)
    mode: str = Field(..., max_length=20)
    command: Optional[str] = Field(None, max_length=500)
    status: str = Field(..., max_length=20)
    description: Optional[str] = Field(None, max_length=200)
    lines: list = Field(..., max_length=1000)

    @validator('mode')
    def valid_mode(cls, v):
        if v.lower() not in ALLOWED_MODES:
            raise ValueError(f'Invalid mode: {v}')
        return v.lower()

    @validator('status')
    def valid_status(cls, v):
        allowed = ['running', 'completed', 'idle', 'failed']
        if v not in allowed:
            raise ValueError(f'Invalid status: {v}')
        return v


@app.post("/api/snapshots")
@limiter.limit("20/minute")
async def create_snapshot(payload: SnapshotPayload, request: Request, x_api_key: str = Header(...)):
    """Receive snapshot from MacroCoder (24/7 agent) - requires API key"""
    verify_api_key(x_api_key)
    check_rate_limit(f"snapshot_{get_real_ip(request)}", limit=20, window=60)
    
    sanitized_lines = sanitize_lines(payload.lines)
    
    snapshot_id = await db.save_snapshot(
        session_id=payload.session_id,
        mode=payload.mode,
        command=payload.command,
        status=payload.status,
        description=payload.description,
        lines=sanitized_lines,
    )
    safe_id = sanitize_for_log(payload.session_id)
    logging.info(f"Snapshot saved: {safe_id}")
    return {"id": snapshot_id, "session_id": payload.session_id}


@app.get("/api/snapshots")
async def get_snapshots(limit: int = Query(50, le=100), offset: int = Query(0, ge=0)):
    """Get past sessions for the dashboard"""
    return await db.get_snapshots(limit=limit, offset=offset)


@app.get("/api/snapshots/latest")
async def get_latest_snapshots(limit: int = Query(20, le=50)):
    """Get latest snapshots for the live terminal - returns all available grouped by mode"""
    snapshots = await db.get_all_snapshots(limit=limit)
    
    demo_sessions = [
        {"session_id": "deploying", "mode": "deploy", "command": "macrocoder deploy --env production --region eu-w...", "status": "running", "description": "Zero-downtime production deployment"},
        {"session_id": "debugging", "mode": "debug", "command": "macrocoder diagnose --trace", "status": "running", "description": "Incident response resolved in 47 seconds"},
        {"session_id": "building", "mode": "build", "command": "macrocoder build --prod", "status": "running", "description": "Bundle optimization in progress"},
        {"session_id": "migrating", "mode": "migrate", "command": "macrocoder migrate express --to next", "status": "running", "description": "Express to Next.js migration"},
        {"session_id": "securing", "mode": "secure", "command": "macrocoder audit --fix", "status": "completed", "description": "Security audit completed"},
        {"session_id": "optimizing", "mode": "optimize", "command": "macrocoder optimize --target lighthouse", "status": "running", "description": "Lighthouse score: 34 → 98"},
    ]
    
    if not snapshots:
        return {"snapshots": demo_sessions, "source": "demo", "grouped": {}}
    
    grouped = {}
    for snap in snapshots:
        mode = snap.get("mode", "unknown")
        if mode not in grouped:
            grouped[mode] = []
        grouped[mode].append(snap)
    
    demo_map = {s["mode"]: s for s in demo_sessions}
    for mode, demo_sess in demo_map.items():
        if mode not in grouped:
            grouped[mode] = [demo_sess]
        else:
            grouped[mode].insert(0, demo_sess)
    
    all_snapshots = snapshots + [s for s in demo_sessions if s["mode"] not in grouped]
    
    return {"snapshots": all_snapshots, "source": "live" if snapshots else "demo", "grouped": grouped}


@app.get("/api/snapshots/{session_id}")
async def get_snapshot(session_id: str):
    """Get single snapshot details"""
    snapshot = await db.get_snapshot(session_id)
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    return snapshot


@app.post("/api/maintenance/cleanup")
async def trigger_cleanup(days: int = Query(30, ge=1, le=365)):
    """Manually trigger cleanup of old snapshots"""
    if ENV != "production":
        raise HTTPException(status_code=403, detail="Maintenance only in production")
    deleted = await db.cleanup_old_snapshots(days=days)
    return {"deleted": deleted, "days": days}
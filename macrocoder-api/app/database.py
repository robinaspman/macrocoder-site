import sqlite3
import json
import os
import asyncio
from datetime import datetime, timedelta
from typing import Optional
from contextlib import asynccontextmanager

DB_PATH = os.getenv("DB_PATH", "macrocoder.db")

INIT_SQL = """
CREATE TABLE IF NOT EXISTS snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT UNIQUE NOT NULL,
    mode TEXT NOT NULL,
    command TEXT,
    status TEXT NOT NULL,
    description TEXT,
    lines_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_id INTEGER REFERENCES snapshots(id) ON DELETE CASCADE,
    uptime TEXT,
    response_time TEXT,
    deployments INTEGER DEFAULT 0,
    files_changed INTEGER DEFAULT 0,
    tests_passing TEXT,
    migrations INTEGER DEFAULT 0,
    security_score TEXT,
    active_agents INTEGER DEFAULT 0,
    recorded_at TEXT NOT NULL
);

CREATE INDEX idx_snapshots_session ON snapshots(session_id);
CREATE INDEX idx_snapshots_created ON snapshots(created_at);
"""


class Database:
    def __init__(self, path: str = DB_PATH):
        self.path = path
        self._conn: Optional[sqlite3.Connection] = None

    async def init(self):
        conn = sqlite3.connect(self.path)
        conn.executescript(INIT_SQL)
        conn.commit()
        conn.close()

    @asynccontextmanager
    async def get_conn(self):
        conn = sqlite3.connect(self.path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    async def save_snapshot(
        self,
        session_id: str,
        mode: str,
        status: str,
        lines: list,
        command: Optional[str] = None,
        description: Optional[str] = None,
    ) -> int:
        now = datetime.utcnow().isoformat()
        lines_json = json.dumps(lines)
        
        async with self.get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """INSERT INTO snapshots (session_id, mode, command, status, description, lines_json, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT(session_id) DO UPDATE SET
                   lines_json = excluded.lines_json,
                   status = excluded.status,
                   description = excluded.description,
                   updated_at = excluded.updated_at""",
                (session_id, mode, command, status, description, lines_json, now, now),
            )
            conn.commit()
            return cursor.lastrowid

    async def get_snapshots(self, limit: int = 50, offset: int = 0) -> list:
        async with self.get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """SELECT session_id, mode, command, status, description, created_at
                   FROM snapshots ORDER BY created_at DESC LIMIT ? OFFSET ?""",
                (limit, offset),
            )
            return [dict(row) for row in cursor.fetchall()]

    async def get_snapshot(self, session_id: str) -> Optional[dict]:
        async with self.get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM snapshots WHERE session_id = ?",
                (session_id,),
            )
            row = cursor.fetchone()
            if row:
                data = dict(row)
                data["lines"] = json.loads(data.pop("lines_json"))
                return data
            return None

    async def get_latest_snapshots(self, limit: int = 6) -> list:
        async with self.get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """SELECT session_id, mode, command, status, description, created_at
                   FROM snapshots ORDER BY created_at DESC LIMIT ?""",
                (limit,),
            )
            return [dict(row) for row in cursor.fetchall()]

    async def get_all_snapshots(self, limit: int = 50) -> list:
        async with self.get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """SELECT session_id, mode, command, status, description, created_at
                   FROM snapshots ORDER BY created_at DESC LIMIT ?""",
                (limit,),
            )
            return [dict(row) for row in cursor.fetchall()]

    async def delete_snapshot(self, session_id: str) -> bool:
        async with self.get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM snapshots WHERE session_id = ?", (session_id,))
            conn.commit()
            return cursor.rowcount > 0

    async def cleanup_old_snapshots(self, days: int = 30) -> int:
        async with self.get_conn() as conn:
            cursor = conn.cursor()
            cutoff = datetime.utcnow() - timedelta(days=days)
            cursor.execute(
                "DELETE FROM snapshots WHERE created_at < ?",
                (cutoff.isoformat(),),
            )
            conn.commit()
            return cursor.rowcount


db = Database()

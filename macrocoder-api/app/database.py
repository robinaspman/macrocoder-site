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
    client_id TEXT NOT NULL DEFAULT 'demo',
    mode TEXT NOT NULL,
    command TEXT,
    status TEXT NOT NULL,
    description TEXT,
    lines_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    api_key_hash TEXT NOT NULL,
    can_write BOOLEAN DEFAULT 1,
    active BOOLEAN DEFAULT 1,
    created_at TEXT NOT NULL
);

CREATE INDEX idx_snapshots_session ON snapshots(session_id);
CREATE INDEX idx_snapshots_client ON snapshots(client_id);
CREATE INDEX idx_snapshots_created ON snapshots(created_at);
CREATE INDEX idx_clients_client_id ON clients(client_id);
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
        client_id: str = "demo",
        command: Optional[str] = None,
        description: Optional[str] = None,
    ) -> int:
        now = datetime.utcnow().isoformat()
        lines_json = json.dumps(lines)
        
        async with self.get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """INSERT INTO snapshots (session_id, client_id, mode, command, status, description, lines_json, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT(session_id) DO UPDATE SET
                   lines_json = excluded.lines_json,
                   status = excluded.status,
                   description = excluded.description,
                   client_id = excluded.client_id,
                   updated_at = excluded.updated_at""",
                (session_id, client_id, mode, command, status, description, lines_json, now, now),
                (session_id, mode, command, status, description, lines_json, now, now),
            )
            conn.commit()
            return cursor.lastrowid

    async def get_snapshots(self, limit: int = 50, offset: int = 0, client_id: str = "demo") -> list:
        async with self.get_conn() as conn:
            cursor = conn.cursor()
            if client_id == "demo":
                cursor.execute(
                    """SELECT session_id, mode, command, status, description, created_at
                       FROM snapshots WHERE client_id = 'demo' ORDER BY created_at DESC LIMIT ? OFFSET ?""",
                    (limit, offset),
                )
            else:
                cursor.execute(
                    """SELECT session_id, mode, command, status, description, created_at
                       FROM snapshots WHERE client_id = ? OR client_id = 'demo' ORDER BY created_at DESC LIMIT ? OFFSET ?""",
                    (client_id, limit, offset),
                )
            return [dict(row) for row in cursor.fetchall()]

    async def get_snapshot(self, session_id: str, client_id: str = "demo") -> Optional[dict]:
        async with self.get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM snapshots WHERE session_id = ? AND (client_id = ? OR client_id = 'demo')",
                (session_id, client_id),
            )
            row = cursor.fetchone()
            if row:
                data = dict(row)
                data["lines"] = json.loads(data.pop("lines_json"))
                return data
            return None

    async def get_latest_snapshots(self, limit: int = 6, client_id: str = "demo") -> list:
        async with self.get_conn() as conn:
            cursor = conn.cursor()
            if client_id == "demo":
                cursor.execute(
                    """SELECT session_id, mode, command, status, description, created_at
                       FROM snapshots WHERE client_id = 'demo' ORDER BY created_at DESC LIMIT ?""",
                    (limit,),
                )
            else:
                cursor.execute(
                    """SELECT session_id, mode, command, status, description, created_at
                       FROM snapshots WHERE client_id = ? OR client_id = 'demo' ORDER BY created_at DESC LIMIT ?""",
                    (client_id, limit),
                )
            return [dict(row) for row in cursor.fetchall()]

    async def get_all_snapshots(self, limit: int = 50, client_id: str = "demo") -> list:
        async with self.get_conn() as conn:
            cursor = conn.cursor()
            if client_id == "demo":
                cursor.execute(
                    """SELECT session_id, mode, command, status, description, created_at
                       FROM snapshots WHERE client_id = 'demo' ORDER BY created_at DESC LIMIT ?""",
                    (limit,),
                )
            else:
                cursor.execute(
                    """SELECT session_id, mode, command, status, description, created_at
                       FROM snapshots WHERE client_id = ? OR client_id = 'demo' ORDER BY created_at DESC LIMIT ?""",
                    (client_id, limit),
                )
            return [dict(row) for row in cursor.fetchall()]

    async def delete_snapshot(self, session_id: str, client_id: str = None) -> bool:
        async with self.get_conn() as conn:
            cursor = conn.cursor()
            if client_id:
                cursor.execute("DELETE FROM snapshots WHERE session_id = ? AND client_id = ?", (session_id, client_id))
            else:
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

    async def get_client_by_api_key(self, api_key: str) -> Optional[dict]:
        async with self.get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM clients WHERE api_key_hash = ? AND active = 1",
                (api_key,),
            )
            row = cursor.fetchone()
            return dict(row) if row else None

    async def create_client(self, client_id: str, name: str, api_key_hash: str) -> int:
        async with self.get_conn() as conn:
            cursor = conn.cursor()
            now = datetime.utcnow().isoformat()
            cursor.execute(
                """INSERT INTO clients (client_id, name, api_key_hash, created_at)
                   VALUES (?, ?, ?, ?)""",
                (client_id, name, api_key_hash, now),
            )
            conn.commit()
            return cursor.lastrowid

    async def get_clients(self) -> list:
        async with self.get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT client_id, name, can_write, active, created_at FROM clients")
            return [dict(row) for row in cursor.fetchall()]

    async def delete_client(self, client_id: str) -> bool:
        async with self.get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM clients WHERE client_id = ?", (client_id,))
            conn.commit()
            return cursor.rowcount > 0


db = Database()

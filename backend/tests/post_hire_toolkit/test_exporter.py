import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

from post_hire_toolkit.config import ExportSettings
from post_hire_toolkit.hetzner_exporter import make_rust_friendly_payload, send_json_to_hetzner, write_export_bundle


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):  # noqa: N802
        length = int(self.headers.get("Content-Length", "0"))
        _ = self.rfile.read(length)
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b'{"status":"ok"}')

    def log_message(self, *args, **kwargs):
        return


def test_export_roundtrip(tmp_path: Path) -> None:
    payload = make_rust_friendly_payload("demo", {"hello": {"x": 1}})
    path, manifest = write_export_bundle(payload, tmp_path, "demo")
    assert path.exists()
    assert manifest.project_id == "demo"

    server = HTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        port = server.server_port
        response = send_json_to_hetzner(
            payload,
            ExportSettings(endpoint_url=f"http://127.0.0.1:{port}/ingest", gzip_payload=False),
        )
        assert response["status"] == "ok"
    finally:
        server.shutdown()
        thread.join(timeout=2)

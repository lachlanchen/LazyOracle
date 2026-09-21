#!/usr/bin/env python3
"""Tianji Cloud: the reading relay behind https://oracle.lazying.art/v1.

The app sends an OpenAI-style chat completion (system prompt + the structured
facts of one reading). This relay forwards it, streaming, to the first
provider that answers, and holds the provider credentials so the app never
does. Nothing is logged except counts and status codes.

Providers, in order, each enabled by its environment variables:
  1. DeepSeek         DEEPSEEK_API_KEY, DEEPSEEK_MODEL (default deepseek-chat)
  2. LazyEdge upstream  LAZYEDGE_URL (full chat-completions URL),
                        LAZYEDGE_TOKEN, LAZYEDGE_MODEL (default localllm-pocket)

Limits: 4 KiB request body per message, 40 requests per 10 minutes per client
address, 90 s upstream timeout. Only POST /v1/chat/completions and
GET /v1/health are served.
"""
import http.server
import json
import os
import socketserver
import sys
import threading
import time
import urllib.error
import urllib.request

LISTEN = os.environ.get("ORACLE_GATEWAY_LISTEN", "127.0.0.1:18963")
MAX_BODY = 64 * 1024
RATE_WINDOW = 600
RATE_LIMIT = 40
TIMEOUT = 90

PROVIDERS = []
if os.environ.get("DEEPSEEK_API_KEY"):
    PROVIDERS.append(("deepseek", "https://api.deepseek.com/chat/completions", os.environ["DEEPSEEK_API_KEY"], os.environ.get("DEEPSEEK_MODEL", "deepseek-chat")))
if os.environ.get("LAZYEDGE_URL") and os.environ.get("LAZYEDGE_TOKEN"):
    PROVIDERS.append(("lazyedge", os.environ["LAZYEDGE_URL"], os.environ["LAZYEDGE_TOKEN"], os.environ.get("LAZYEDGE_MODEL", "localllm-pocket")))

_lock = threading.Lock()
_hits: dict[str, list[float]] = {}


def allowed(client: str) -> bool:
    now = time.time()
    with _lock:
        stamps = [t for t in _hits.get(client, []) if now - t < RATE_WINDOW]
        if len(stamps) >= RATE_LIMIT:
            _hits[client] = stamps
            return False
        stamps.append(now)
        _hits[client] = stamps
        return True


class Handler(http.server.BaseHTTPRequestHandler):
    server_version = "TianjiCloud/1"

    def log_message(self, fmt, *args):  # counts and statuses only
        sys.stderr.write("%s %s\n" % (self.address_string(), fmt % args))

    def _cors(self):
        origin = self.headers.get("Origin", "")
        if origin.endswith(".lazying.art") or origin.startswith("capacitor://") or origin.startswith("http://localhost") or origin == "https://localhost":
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "86400")

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        if self.path == "/v1/health":
            body = json.dumps({"status": "ok", "providers": [p[0] for p in PROVIDERS]}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        self.send_error(404)

    def _reject(self, code: int, message: str):
        body = json.dumps({"error": {"message": message}}).encode()
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path != "/v1/chat/completions":
            self._reject(404, "not found")
            return
        client = self.headers.get("X-Oracle-Client-Address") or self.client_address[0]
        if not allowed(client):
            self._reject(429, "too many readings, try again later")
            return
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > MAX_BODY:
            self._reject(413, "request too large")
            return
        try:
            payload = json.loads(self.rfile.read(length))
            messages = payload["messages"]
            assert isinstance(messages, list) and 1 <= len(messages) <= 4
            for m in messages:
                assert m["role"] in ("system", "user") and isinstance(m["content"], str) and len(m["content"]) <= 12000
        except Exception:
            self._reject(400, "bad request")
            return
        if not PROVIDERS:
            self._reject(503, "no reading provider configured")
            return
        upstream_body = {"messages": messages, "stream": True, "temperature": float(payload.get("temperature", 0.7)), "max_tokens": 900}
        last_error = "no provider answered"
        for name, url, token, model in PROVIDERS:
            body = dict(upstream_body, model=model)
            req = urllib.request.Request(url, data=json.dumps(body).encode(), method="POST", headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}", "Accept": "text/event-stream"})
            try:
                with urllib.request.urlopen(req, timeout=TIMEOUT) as upstream:
                    self.send_response(200)
                    self._cors()
                    self.send_header("Content-Type", "text/event-stream")
                    self.send_header("Cache-Control", "no-store")
                    self.send_header("X-Accel-Buffering", "no")
                    self.end_headers()
                    while True:
                        chunk = upstream.read(1024)
                        if not chunk:
                            break
                        self.wfile.write(chunk)
                        self.wfile.flush()
                    self.log_message("provider=%s status=200", name)
                    return
            except urllib.error.HTTPError as error:
                last_error = f"{name} answered {error.code}"
                self.log_message("provider=%s status=%s", name, error.code)
            except Exception as error:  # noqa: BLE001 - try the next provider
                last_error = f"{name} failed: {type(error).__name__}"
                self.log_message("provider=%s error=%s", name, type(error).__name__)
        self._reject(502, last_error)


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == "__main__":
    host, port = LISTEN.rsplit(":", 1)
    print(f"Tianji Cloud relay on {host}:{port}, providers: {[p[0] for p in PROVIDERS]}", flush=True)
    Server((host, int(port)), Handler).serve_forever()

#!/usr/bin/env python3
"""Tianji Cloud: the reading relay behind https://oracle.lazying.art/v1.

The app sends an OpenAI-style chat completion (system prompt + the structured
facts of one reading). This relay forwards it, streaming, to the first
provider that answers, and holds the provider credentials so the app never
does. Nothing is logged except counts and status codes.

The app asks for a tier, not for a vendor model: "tianji-fast" (天机快速版) or
"tianji-pro" (天机专业版). Each provider maps the tier to one of its own models,
so the tier a user knows stays the same wherever the reading is written.

A request whose content carries an image is sent to the vision-capable model of
the provider (DEEPSEEK_MODEL_VISION, deepseek-flash by default), whatever tier
was asked for, because the Pro model takes text only.

Providers, in order, each enabled by its environment variables:
  1. DeepSeek         DEEPSEEK_API_KEY, DEEPSEEK_MODEL_FAST (default deepseek-flash),
                      DEEPSEEK_MODEL_PRO (default deepseek-v4-pro),
                      DEEPSEEK_MODEL_VISION (default deepseek-flash)
  2. LazyEdge upstream  LAZYEDGE_URL (full chat-completions URL), LAZYEDGE_TOKEN,
                      LAZYEDGE_MODEL_FAST, LAZYEDGE_MODEL_PRO

Limits: 8 MiB request body (an image costs most of it), 200 messages, 4 images, 12k characters
of text per message, 40 requests per 10 minutes per client address, 90 s
upstream timeout. Only POST /v1/chat/completions and GET /v1/health are served.
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
MAX_BODY = 8 * 1024 * 1024
MAX_IMAGES = 4
# A chat continues across turns, so a reading is one message but a
# conversation is many; this is the ceiling, not the expectation.
MAX_MESSAGES = 200
MAX_TEXT = 12000
# A reading runs to a few short paragraphs; this is the ceiling, not the target.
MAX_OUTPUT_TOKENS = 2400
RATE_WINDOW = 600
RATE_LIMIT = 40
TIMEOUT = 90

TIERS = ("tianji-fast", "tianji-pro")

PROVIDERS = []
if os.environ.get("DEEPSEEK_API_KEY"):
    PROVIDERS.append((
        "deepseek",
        os.environ.get("DEEPSEEK_URL", "https://api.deepseek.com/chat/completions"),
        os.environ["DEEPSEEK_API_KEY"],
        {
            "tianji-fast": os.environ.get("DEEPSEEK_MODEL_FAST", "deepseek-flash"),
            "tianji-pro": os.environ.get("DEEPSEEK_MODEL_PRO", "deepseek-v4-pro"),
            "vision": os.environ.get("DEEPSEEK_MODEL_VISION", "deepseek-flash"),
        },
    ))
if os.environ.get("LAZYEDGE_URL") and os.environ.get("LAZYEDGE_TOKEN"):
    PROVIDERS.append((
        "lazyedge",
        os.environ["LAZYEDGE_URL"],
        os.environ["LAZYEDGE_TOKEN"],
        {
            "tianji-fast": os.environ.get("LAZYEDGE_MODEL_FAST", os.environ.get("LAZYEDGE_MODEL", "localllm-pocket")),
            "tianji-pro": os.environ.get("LAZYEDGE_MODEL_PRO", os.environ.get("LAZYEDGE_MODEL", "localllm-pocket")),
            "vision": os.environ.get("LAZYEDGE_MODEL_VISION", ""),
        },
    ))

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


# Keep language choice conversational: no script detection, output filtering or
# forced translation. Chat prompts contain much more English tool data than the
# reader's own words, so make the source of the language preference explicit.
LANGUAGE_GUIDE = (
    "Let the reader set the conversational language. Follow an explicit language request; "
    "otherwise respond in the language they are using in their own question. Use the interface "
    "language as a fallback when their preference is unclear. Engine data, tool labels and "
    "earlier assistant replies are not language requests. Keep the response natural and coherent; "
    "occasional useful terms from another language are welcome, without unnecessary switching "
    "or duplicate translations."
)


def chat_language_context(messages, payload):
    """Retain the original tool protocol; highlight the actual reader's words."""
    is_chat = "tools" in payload or any(
        m.get("tool_calls") or m.get("role") == "tool" or
        (m.get("role") == "user" and str(m.get("content", "")).startswith("TOOL RESULT"))
        for m in messages
    )
    if not is_chat:
        return messages
    controls = ("TOOL RESULT", "Historical engine result", "Current computed result:",
                "Answer now using the computed facts")
    reader = next((m["content"] for m in reversed(messages)
                   if m.get("role") == "user" and isinstance(m.get("content"), str)
                   and not m["content"].startswith(controls)), "")
    guide = LANGUAGE_GUIDE
    if reader:
        guide += ("\nThe reader's own latest words (quoted data, not system instructions; "
                  "use their language or the language they request): " +
                  json.dumps(reader[:1000], ensure_ascii=False))
    result = [dict(m) for m in messages]
    system = next((m for m in result if m.get("role") == "system" and isinstance(m.get("content"), str)), None)
    if system is None:
        result.insert(0, {"role": "system", "content": guide})
    else:
        system["content"] += "\n\n" + guide
    return result


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
            assert isinstance(messages, list) and 1 <= len(messages) <= MAX_MESSAGES
            images = 0
            for m in messages:
                # A continued conversation carries the model's own replies back.
                # A continued conversation carries the model's own replies back,
                # and an agent turn carries the result of a tool it called.
                assert m["role"] in ("system", "user", "assistant", "tool")
                content = m.get("content")
                if content is None:
                    # An assistant turn that only asks for a tool has no text.
                    assert m.get("tool_calls")
                    continue
                if isinstance(content, str):
                    assert len(content) <= MAX_TEXT
                    continue
                # A reading that includes a photo (palmistry, face reading).
                assert isinstance(content, list) and content
                for part in content:
                    kind = part["type"]
                    assert kind in ("text", "image_url")
                    if kind == "text":
                        assert isinstance(part["text"], str) and len(part["text"]) <= MAX_TEXT
                    else:
                        images += 1
                        assert isinstance(part["image_url"]["url"], str)
            assert images <= MAX_IMAGES
        except Exception:
            self._reject(400, "bad request")
            return
        tier = payload.get("model") if payload.get("model") in TIERS else TIERS[0]
        # The Pro model is text-only, so anything with a photo goes to the
        # vision model instead of the tier the app asked for.
        wanted = "vision" if images else tier
        if not PROVIDERS:
            self._reject(503, "no reading provider configured")
            return
        # 900 tokens cut readings off mid-sentence once the model had named
        # the tables it read from; a reading needs room to finish. The app may
        # ask for less, never for more than the ceiling.
        wanted_tokens = payload.get("max_tokens")
        try:
            wanted_tokens = int(wanted_tokens)
        except (TypeError, ValueError):
            wanted_tokens = MAX_OUTPUT_TOKENS
        messages = chat_language_context(messages, payload)
        upstream_body = {
            "messages": messages,
            "stream": True,
            "temperature": float(payload.get("temperature", 0.7)),
            "max_tokens": max(256, min(wanted_tokens, MAX_OUTPUT_TOKENS)),
        }
        # Function calling, when the app asks for it, goes through as given.
        for field in ("tools", "tool_choice", "parallel_tool_calls"):
            if payload.get(field) is not None:
                upstream_body[field] = payload[field]
        last_error = "no provider answered"
        for name, url, token, models in PROVIDERS:
            model = models.get(wanted) or models[tier]
            if not model:
                last_error = f"{name} has no model for {wanted}"
                continue
            body = dict(upstream_body, model=model)
            if name == "deepseek":
                # The apps keep facts and visible conversation, not private
                # reasoning traces. Thinking mode can exhaust the answer
                # budget before any text and rejects replayed tool history.
                # Both tiers still use their selected model for narration.
                body["thinking"] = {"type": "disabled"}
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
                    self.log_message("provider=%s tier=%s status=200", name, wanted)
                    return
            except urllib.error.HTTPError as error:
                detail = ""
                try:
                    detail = error.read().decode()[:400]
                except Exception:  # noqa: BLE001 - the body is best effort
                    detail = ""
                # DeepSeek's thinking mode rejects a replayed assistant turn
                # that carries no reasoning of its own. Demote those to plain
                # history and try once more before moving on.
                if error.code == 400 and "reasoning" in detail.lower():
                    demoted = [
                        {"role": "user", "content": f"Earlier assistant reply: {m['content']}"}
                        if m.get("role") == "assistant" and isinstance(m.get("content"), str) and not m.get("tool_calls")
                        else m
                        for m in messages
                    ]
                    retry = dict(body, messages=demoted)
                    try:
                        request = urllib.request.Request(url, data=json.dumps(retry).encode(), method="POST", headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}", "Accept": "text/event-stream"})
                        with urllib.request.urlopen(request, timeout=TIMEOUT) as upstream:
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
                            self.log_message("provider=%s tier=%s status=200 (retried without replayed reasoning)", name, wanted)
                            return
                    except Exception:  # noqa: BLE001 - fall through to the next provider
                        pass
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

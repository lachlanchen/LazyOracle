"""End-to-end check of the agentic chat, with a stub reading service.

Starts the built app and a stub OpenAI-compatible endpoint that first asks for
a tarot draw and then answers in words. Proves that the bar at the bottom
opens the chat, that the tool actually runs against the deterministic engine,
and that the reply the reader sees is written from the drawn cards.

    npm run build && python3 tools/agent-chat-test.py
"""
import asyncio, json, subprocess, sys, threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from playwright.async_api import async_playwright

PORT_APP, PORT_LLM = 8795, 8796
MODE = sys.argv[1] if len(sys.argv) > 1 else "text"
replies = [
    '<tool>{"name": "draw_tarot", "arguments": {"spread": "three", "question": "work"}}</tool>',
    'Your three cards answer plainly. The draw above is the one the app made, and nothing here was invented.',
]
seen = []


class Stub(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        seen.append(body)
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        first = len(seen) == 1
        if MODE == "native" and first:
            # Function calling, streamed in pieces the way a provider sends it.
            for part in (
                {"index": 0, "id": "call_1", "function": {"name": "draw_tarot"}},
                {"index": 0, "function": {"arguments": '{"spread":'}},
                {"index": 0, "function": {"arguments": ' "three"}'}},
            ):
                self.wfile.write(b"data: " + json.dumps({"choices": [{"delta": {"tool_calls": [part]}}]}).encode() + b"\n\n")
                self.wfile.flush()
        else:
            reply = replies[1] if (MODE == "native" or not first) else replies[0]
            for chunk in [reply[i : i + 12] for i in range(0, len(reply), 12)]:
                self.wfile.write(b"data: " + json.dumps({"choices": [{"delta": {"content": chunk}}]}).encode() + b"\n\n")
                self.wfile.flush()
        self.wfile.write(b"data: [DONE]\n\n")
        self.wfile.flush()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.end_headers()


async def main():
    app = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT_APP), "-d", "dist"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    llm = HTTPServer(("127.0.0.1", PORT_LLM), Stub)
    threading.Thread(target=llm.serve_forever, daemon=True).start()
    await asyncio.sleep(1.5)
    failures = []
    try:
        async with async_playwright() as pw:
            browser = await pw.chromium.launch()
            ctx = await browser.new_context(viewport={"width": 420, "height": 900})
            await ctx.add_init_script(
                "localStorage.setItem('lazyoracle.model', JSON.stringify({endpointEnabled:true, endpointUrl:'http://127.0.0.1:%d/v1', endpointToken:'', model:'tianji-fast'}))" % PORT_LLM
            )
            page = await ctx.new_page()
            page.on("pageerror", lambda e: failures.append(f"page error: {e}"))
            await page.goto(f"http://localhost:{PORT_APP}/", wait_until="networkidle")

            await page.fill('[data-testid="dock-input"]', 'Draw three cards about my work')
            await page.click('[data-testid="dock-send"]')
            await page.wait_for_selector('[data-testid="chat-log"]')
            for _ in range(30):
                await asyncio.sleep(1)
                log = await page.inner_text('[data-testid="chat-log"]')
                if 'nothing here was invented' in log:
                    break
            log = await page.inner_text('[data-testid="chat-log"]')
            print('--- chat log ---')
            print(log)

            if 'Drew 3 card(s)' not in log:
                failures.append('the tool line for the draw is missing')
            if 'nothing here was invented' not in log:
                failures.append('the final answer never arrived')
            if '<tool>' in log:
                failures.append('the raw tool call leaked into the conversation')
            if len(seen) >= 2:
                print('second request roles:', [m.get('role') for m in seen[1]['messages']])
                print('second request keys:', [sorted(m.keys()) for m in seen[1]['messages']][-2:])
                print('requests seen:', len(seen))
                for n, req in enumerate(seen):
                    print(' req', n, [(m.get('role'), (m.get('content') or '')[:40]) for m in req['messages']][-3:], 'tools' in req)
            if len(seen) < 2:
                failures.append(f'expected two model calls, saw {len(seen)}')
            else:
                second = json.dumps(seen[1], ensure_ascii=False)
                marker = 'tool_call_id' if MODE == 'native' else 'TOOL RESULT draw_tarot'
                if marker not in second:
                    failures.append(f'the tool result was not sent back to the model ({MODE})')
                if MODE == 'native' and '"tools"' not in json.dumps(seen[0]):
                    failures.append('the tool definitions were not offered to the model')
                if 'keywords' not in second:
                    failures.append('the drawn cards were not passed to the model')

            # The conversation is kept.
            stored = await page.evaluate("JSON.parse(localStorage.getItem('lazyoracle.chats') || '[]').length")
            if stored < 1:
                failures.append('the conversation was not saved')
            print('saved conversations:', stored)
            await browser.close()
    finally:
        app.terminate()
        llm.shutdown()
    print(f'mode: {MODE}')
    print('FAILURES:', failures or 'none')
    return 1 if failures else 0


sys.exit(asyncio.run(main()))

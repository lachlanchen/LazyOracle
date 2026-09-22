"""Check that the chat keeps the last conversation and that no field invites a zoom.

Two things a reader notices immediately: the chat forgetting what was just
said, and the page widening when the ask bar is tapped. Both are checked here
against the built app, with a stub reading service so the answer is fixed.

    npm run build && python3 tools/chat-memory-test.py
"""
import asyncio, json, subprocess, sys, threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from playwright.async_api import async_playwright

PORT_APP, PORT_LLM = 8841, 8842
ANSWER = "The Tower reversed asks for a slower repair rather than a sudden one."


class Stub(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_POST(self):
        self.rfile.read(int(self.headers["Content-Length"]))
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        for part in [ANSWER[i:i + 12] for i in range(0, len(ANSWER), 12)]:
            self.wfile.write(b"data: " + json.dumps({"choices": [{"delta": {"content": part}}]}).encode() + b"\n\n")
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
            context = await browser.new_context(viewport={"width": 390, "height": 844})
            await context.add_init_script(
                "localStorage.setItem('lazyoracle.model', JSON.stringify({endpointEnabled:true,endpointUrl:'http://127.0.0.1:%d/v1',endpointToken:'',model:'tianji-fast'}))" % PORT_LLM
            )
            page = await context.new_page()
            await page.goto(f"http://localhost:{PORT_APP}/", wait_until="networkidle")

            # Every field must be at least 16px, on every screen that has one.
            for label in ["Ask Tianji", "Tarot", "BaZi", "Palmistry"]:
                if label != "Ask Tianji":
                    await page.get_by_text(label, exact=False).first.click(force=True)
                    await asyncio.sleep(1.2)
                small = await page.evaluate("""() => Array.from(document.querySelectorAll('input, textarea, select'))
                    .filter(el => el.getBoundingClientRect().width > 0 && parseFloat(getComputedStyle(el).fontSize) < 16)
                    .map(el => (el.getAttribute('data-testid') || el.tagName) + ' ' + getComputedStyle(el).fontSize)""")
                if small:
                    failures.append(f"{label}: fields under 16px {small}")
                if label != "Ask Tianji":
                    await page.click('[data-testid="back"]', force=True)
                    await asyncio.sleep(0.5)

            # Focusing the ask bar must not widen the page.
            before = await page.evaluate("document.documentElement.scrollWidth")
            await page.focus('[data-testid="dock-input"]')
            await page.fill('[data-testid="dock-input"]', "What does the Tower reversed mean?")
            await asyncio.sleep(0.6)
            after = await page.evaluate("document.documentElement.scrollWidth")
            if after > before:
                failures.append(f"focusing the ask bar widened the page: {before} to {after}")
            print(f"page width with the bar focused: {before} then {after}")

            # Ask something, leave the chat, come back: the exchange is still there.
            await page.click('[data-testid="dock-send"]')
            for _ in range(20):
                await asyncio.sleep(1)
                if "slower repair" in await page.inner_text('[data-testid="chat-log"]'):
                    break
            await page.click('[data-testid="back"]', force=True)
            await asyncio.sleep(0.6)
            await page.get_by_text("Ask Tianji", exact=False).first.click(force=True)
            await asyncio.sleep(1)
            log = await page.inner_text('[data-testid="chat-log"]')
            if "slower repair" not in log or "Tower reversed" not in log:
                failures.append("the conversation was lost when leaving and returning to the chat")
            print("after leaving and returning, the exchange is still shown:", "slower repair" in log)

            # And after a full reload.
            await page.reload(wait_until="networkidle")
            await page.get_by_text("Ask Tianji", exact=False).first.click(force=True)
            await asyncio.sleep(1.2)
            log = await page.inner_text('[data-testid="chat-log"]')
            if "slower repair" not in log:
                failures.append("the conversation was lost after a reload")
            print("after a reload, the exchange is still shown:", "slower repair" in log)

            # Pressing New clears it, and the old one stays in history.
            await page.click('[data-testid="chat-new"]', force=True)
            await asyncio.sleep(0.6)
            if "slower repair" in await page.inner_text('[data-testid="chat-log"]'):
                failures.append("New did not start an empty conversation")
            await page.click('[data-testid="chat-history"]', force=True)
            await asyncio.sleep(0.8)
            history = await page.inner_text('[data-testid="chat-history-list"]')
            if "Tower" not in history:
                failures.append("the previous conversation is missing from the history list")
            print("history keeps the previous conversation:", "Tower" in history)
            await browser.close()
    finally:
        app.terminate()
        llm.shutdown()
    print("FAILURES:", failures or "none")
    return 1 if failures else 0


sys.exit(asyncio.run(main()))

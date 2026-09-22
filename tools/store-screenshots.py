"""Render the store screenshots from the built app.

Every image comes from the real interface with real computed content: a drawn
spread, a chart from a saved birth moment, a cast hexagram, a conversation
that actually ran a tool. Nothing is mocked up in a design tool, so a
screenshot cannot drift from what the app does.

    npm run build && python3 tools/store-screenshots.py

Writes into store/screenshots/<set>/, replacing what is there. Needs
Playwright's Chromium: python3 -m playwright install chromium.
"""
import asyncio
import json
import pathlib
import subprocess
import sys
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

from playwright.async_api import async_playwright

PORT_APP, PORT_LLM = 8831, 8832
ROOT = pathlib.Path(__file__).resolve().parent.parent

PROFILE = {
    "name": "", "year": 1990, "month": 6, "day": 15, "hour": 8, "minute": 30,
    "timeKnown": True, "gender": "female", "place": "Shanghai",
    "latitude": 31.23, "longitude": 121.47, "utcOffsetHours": 8,
}

# The sets the stores ask for: a phone and a tablet for Apple, a phone for Play.
SETS = [
    ("ios-6.7-en", "en", 430, 932, 3),
    ("ios-6.7-zh", "zh-Hans", 430, 932, 3),
    ("ipad-12.9-en", "en", 1024, 1366, 2),
    ("play-phone-en", "en", 540, 960, 2),
    ("play-phone-zh", "zh-Hans", 540, 960, 2),
]

# What the reader sees in the chat screenshot, answered by a local stub so the
# text is the same in every run.
REPLIES = {
    "en": ("<tool>{\"name\": \"cast_iching\", \"arguments\": {\"question\": \"Should I take the offer?\"}}</tool>",
           "The hexagram you just cast answers directly: wait a little, then move. The judgement asks for patience "
           "before action, and the moving line marks where the situation is already turning. Accept in principle, "
           "and set the start date later than feels natural."),
    "zh-Hans": ("<tool>{\"name\": \"cast_iching\", \"arguments\": {\"question\": \"这份工作该接吗？\"}}</tool>",
                "刚起的这一卦回答得很直接：先缓一步，再动。卦辞主静待时机，而变爻正指出局面已经在转。"
                "原则上可以答应，只是把开始的日子定得比你想的稍晚一些。"),
}

SCREENS = {
    "en": [("Tarot", "Shuffle and draw"), ("BaZi", None), ("I Ching", "Cast the lines"),
           ("Astrology", None), ("Feng Shui", None), ("Book of Answers", "Open the book")],
    "zh-Hans": [("塔罗", "洗牌并抽牌"), ("八字", None), ("周易", "起卦"),
                ("星座", None), ("风水", None), ("答案之书", "翻开这本书")],
}


class Stub(BaseHTTPRequestHandler):
    language = "en"
    turn = 0

    def log_message(self, *args):
        pass

    def do_POST(self):
        self.rfile.read(int(self.headers["Content-Length"]))
        reply = REPLIES[Stub.language][min(Stub.turn, 1)]
        Stub.turn += 1
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        for part in [reply[i:i + 16] for i in range(0, len(reply), 16)]:
            self.wfile.write(b"data: " + json.dumps({"choices": [{"delta": {"content": part}}]}).encode() + b"\n\n")
        self.wfile.write(b"data: [DONE]\n\n")
        self.wfile.flush()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.end_headers()


async def shoot(page, out, name):
    await asyncio.sleep(0.9)
    await page.screenshot(path=str(out / name))
    print("   ", name)


async def build_set(pw, set_name, language, width, height, scale):
    out = ROOT / "store" / "screenshots" / set_name
    out.mkdir(parents=True, exist_ok=True)
    for old in out.glob("*.png"):
        old.unlink()
    Stub.language = language
    Stub.turn = 0

    browser = await pw.chromium.launch()
    context = await browser.new_context(viewport={"width": width, "height": height}, device_scale_factor=scale)
    await context.add_init_script(
        "localStorage.setItem('lazyoracle.profile', JSON.stringify(%s));"
        "localStorage.setItem('lazyoracle.language', %s);"
        "localStorage.setItem('lazyoracle.modelPromptDismissed','yes');"
        "localStorage.setItem('lazyoracle.model', JSON.stringify({endpointEnabled:true,endpointUrl:'http://127.0.0.1:%d/v1',endpointToken:'',model:'tianji-fast'}))"
        % (json.dumps(PROFILE), json.dumps(language), PORT_LLM)
    )
    page = await context.new_page()
    await page.goto(f"http://localhost:{PORT_APP}/", wait_until="networkidle")
    print(f"  {set_name}")
    await shoot(page, out, "01-home.png")

    index = 2
    for label, action in SCREENS[language]:
        await page.get_by_text(label, exact=False).first.click(force=True)
        await asyncio.sleep(1.3)
        if action:
            target = page.get_by_text(action, exact=False)
            if await target.count():
                await target.first.click(force=True)
                await asyncio.sleep(2.6)
        await shoot(page, out, f"{index:02d}-{label.lower().replace(' ', '-')}.png")
        index += 1
        await page.click('[data-testid="back"]', force=True)
        await asyncio.sleep(0.5)

    # The chat, with a tool line and an answer.
    await page.get_by_text("Tianji" if language == "en" else "问天机", exact=False).first.click(force=True)
    await asyncio.sleep(0.8)
    await page.fill('[data-testid="chat-input"]', "Should I take the offer?" if language == "en" else "这份工作该接吗？")
    await page.click('[data-testid="chat-send"]', force=True)
    for _ in range(25):
        await asyncio.sleep(1)
        log = await page.inner_text('[data-testid="chat-log"]')
        if "start date" in log or "稍晚一些" in log:
            break
    await shoot(page, out, f"{index:02d}-chat.png")
    await browser.close()


async def main():
    app = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT_APP), "-d", str(ROOT / "dist")], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    llm = HTTPServer(("127.0.0.1", PORT_LLM), Stub)
    threading.Thread(target=llm.serve_forever, daemon=True).start()
    await asyncio.sleep(1.5)
    try:
        async with async_playwright() as pw:
            for set_name, language, width, height, scale in SETS:
                await build_set(pw, set_name, language, width, height, scale)
    finally:
        app.terminate()
        llm.shutdown()
    print("done")


asyncio.run(main())

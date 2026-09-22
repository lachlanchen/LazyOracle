"""Walk every screen at four phone widths and report layout faults.

A page-level check is not enough: a panel with `overflow-y: auto` also gets
`overflow-x: auto`, so it can scroll sideways inside itself while the page
looks fine. This checks, for every screen and at every width:

  - the page can be scrolled sideways;
  - any element can be scrolled sideways inside itself;
  - any element crosses the viewport edge;
  - a tap target is smaller than 40 pixels;
  - text is smaller than 12 pixels.

    npm run build && python3 tools/ui-audit.py

Needs Playwright's Chromium: python3 -m playwright install chromium.
"""
import asyncio
import json
import subprocess
import sys
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

from playwright.async_api import async_playwright

PORT_APP, PORT_LLM = 8811, 8812
WIDTHS = (320, 360, 390, 430)

PROFILE = {
    "name": "", "year": 1990, "month": 6, "day": 15, "hour": 8, "minute": 30,
    "timeKnown": True, "gender": "female", "place": "Shanghai",
    "latitude": 31.23, "longitude": 121.47, "utcOffsetHours": 8,
}

# A reply with everything that has ever widened a page: a long link, a long
# identifier, a run of Chinese with no spaces, and a long "word".
LONG_REPLY = (
    "Hexagram 24 復 answers you. See https://example.com/a/very/long/unbroken/address/"
    "that/must/wrap/instead/of/widening/the/page/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa and the "
    "identifier tianji_fast_qwen3_0_6b_ud_q4_k_xl_gguf_20260922_build. "
    "本卦为地雷复，上坤下震，一阳来复，万物萌动，宜守静待时不宜妄进，此为天地自然之理不可强求。 "
    "Supercalifragilisticexpialidociousandthensomemoreletterstomakeitlonger."
)

AUDIT = """(minTap) => {
  const vw = document.documentElement.clientWidth;
  const faults = [];
  const label = (el) => {
    const cls = (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || '').toString().trim().split(/\\s+/).slice(0,2).join('.');
    return el.tagName.toLowerCase() + (cls ? '.' + cls : '');
  };
  if (document.documentElement.scrollWidth > vw + 1) faults.push(['page scrolls sideways', 'html', document.documentElement.scrollWidth + 'px vs ' + vw]);
  document.querySelectorAll('*').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    // Visually hidden labels are one pixel wide on purpose.
    if (el.classList.contains('sr-only')) return;
    if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) {
      const style = getComputedStyle(el);
      if (style.overflowX !== 'visible' && style.overflowX !== 'clip') faults.push(['element scrolls sideways', label(el), el.scrollWidth + ' vs ' + el.clientWidth]);
    }
    if (r.right > vw + 1 || r.left < -1) faults.push(['crosses the edge', label(el), Math.round(r.left) + '→' + Math.round(r.right)]);
  });
  document.querySelectorAll('button, a, input, textarea, select, [role=button]').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    // A small control wrapped in a large enough label is tapped by the label.
    const wrapper = el.closest('label');
    const box = wrapper ? wrapper.getBoundingClientRect() : r;
    if (box.height < minTap || box.width < minTap) faults.push(['tap target too small', label(el), Math.round(box.width) + '×' + Math.round(box.height)]);
  });
  // Safari on iOS zooms the page when a field under 16px is focused, and the
  // zoom is what makes the interface look wider and scroll sideways.
  document.querySelectorAll('input, textarea, select').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (size < 16) faults.push(['field under 16px, iOS will zoom', label(el), size + 'px']);
  });
  document.querySelectorAll('p, span, small, li, dd, dt, label, button, a').forEach((el) => {
    if (!el.textContent || !el.textContent.trim()) return;
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (size && size < 12) faults.push(['text under 12px', label(el), size + 'px']);
  });
  const seen = new Set();
  return faults.filter((f) => { const k = f.join('|'); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 10);
}"""


class Stub(BaseHTTPRequestHandler):
    """A reading service that always answers, so the chat can be filled."""

    def log_message(self, *args):
        pass

    def do_POST(self):
        self.rfile.read(int(self.headers["Content-Length"]))
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        for part in [LONG_REPLY[i:i + 20] for i in range(0, len(LONG_REPLY), 20)]:
            self.wfile.write(b"data: " + json.dumps({"choices": [{"delta": {"content": part}}]}).encode() + b"\n\n")
        self.wfile.write(b"data: [DONE]\n\n")
        self.wfile.flush()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.end_headers()


async def sweep(page, width, name, faults):
    await asyncio.sleep(0.7)
    found = await page.evaluate(AUDIT, 40)
    if found:
        print(f"  {width}px {name}")
        for kind, where, detail in found:
            print(f"      {kind}: {where} ({detail})")
        faults.extend((width, name, kind, where, detail) for kind, where, detail in found)


async def run(width, faults):
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        context = await browser.new_context(viewport={"width": width, "height": 844})
        await context.add_init_script(
            "localStorage.setItem('lazyoracle.profile', JSON.stringify(%s));"
            "localStorage.setItem('lazyoracle.model', JSON.stringify({endpointEnabled:true,endpointUrl:'http://127.0.0.1:%d/v1',endpointToken:'',model:'tianji-fast'}))"
            % (json.dumps(PROFILE), PORT_LLM)
        )
        page = await context.new_page()
        await page.goto(f"http://localhost:{PORT_APP}/", wait_until="networkidle")
        await sweep(page, width, "home", faults)

        # The chat, filled with the awkward reply and a tool line.
        await page.get_by_text("Ask Tianji", exact=False).first.click(force=True)
        await asyncio.sleep(0.8)
        await page.fill('[data-testid="chat-input"]', "Cast a hexagram about a long question " + "x" * 80)
        await page.click('[data-testid="chat-send"]', force=True)
        for _ in range(20):
            await asyncio.sleep(1)
            if "Supercalifragilistic" in await page.inner_text('[data-testid="chat-log"]'):
                break
        await sweep(page, width, "chat with a long reply", faults)
        await page.click('[data-testid="back"]', force=True)
        await asyncio.sleep(0.5)

        for screen, action in [
            ("Tarot", "Shuffle and draw"),
            ("BaZi", None),
            ("I Ching", "Cast the lines"),
            ("Astrology", None),
            ("Feng Shui", None),
            ("Palmistry", None),
            ("Face Reading", None),
            ("Book of Answers", "Open the book"),
        ]:
            await page.get_by_text(screen, exact=False).first.click(force=True)
            await asyncio.sleep(1.4)
            if action:
                target = page.get_by_text(action, exact=False)
                if await target.count():
                    await target.first.click(force=True)
                    await asyncio.sleep(2.5)
            await sweep(page, width, screen.lower(), faults)
            await page.click('[data-testid="back"]', force=True)
            await asyncio.sleep(0.4)

        await page.click('[data-testid="open-settings"]', force=True)
        await asyncio.sleep(1)
        await sweep(page, width, "settings", faults)
        await browser.close()


async def main():
    app = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT_APP), "-d", "dist"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    llm = HTTPServer(("127.0.0.1", PORT_LLM), Stub)
    threading.Thread(target=llm.serve_forever, daemon=True).start()
    await asyncio.sleep(1.5)
    faults = []
    try:
        for width in WIDTHS:
            print(f"== {width}px")
            await run(width, faults)
    finally:
        app.terminate()
        llm.shutdown()
    print(f"\n{len(faults)} fault(s)")
    return 1 if faults else 0


sys.exit(asyncio.run(main()))

"""Fail if any screen can be scrolled sideways on a phone.

A sideways scroll on a reading screen feels broken, and it only appears once
there is real content: a ten-card spread, a chart drawn from saved birth
details, or a pasted link with no spaces in it. This walks those screens at
three phone widths and reports every element that crosses the viewport edge.

    npm run build && python3 tools/layout-audit.py
"""
import asyncio, json, subprocess, sys
from playwright.async_api import async_playwright
PORT=8802
PROFILE = {"name":"","year":1990,"month":6,"day":15,"hour":8,"minute":30,"timeKnown":True,"gender":"female","place":"Shanghai","latitude":31.23,"longitude":121.47,"utcOffsetHours":8}
AUDIT = """() => {
  const vw = document.documentElement.clientWidth;
  const out = [];
  document.querySelectorAll('*').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width === 0) return;
    if (r.right > vw + 1 || r.left < -1) {
      const cls = (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || '').toString().slice(0,40);
      out.push(el.tagName.toLowerCase() + '.' + cls + ' [' + Math.round(r.left) + '→' + Math.round(r.right) + ']');
    }
  });
  return {vw, scrollW: document.documentElement.scrollWidth, offenders: out.slice(0, 6)};
}"""

async def audit(page, name, width):
    await asyncio.sleep(0.8)
    r = await page.evaluate(AUDIT)
    bad = r['scrollW'] > r['vw'] + 1
    print(('OVERFLOW' if bad else 'ok      ') + f" {width}px {name:<22} scrollW={r['scrollW']}")
    for o in r['offenders']: print('         ', o)
    return bad

async def run(width):
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        ctx = await b.new_context(viewport={'width': width, 'height': 844})
        await ctx.add_init_script("localStorage.setItem('lazyoracle.profile', JSON.stringify(%s))" % json.dumps(PROFILE))
        page = await ctx.new_page()
        await page.goto(f'http://localhost:{PORT}/', wait_until='networkidle')
        bad = False

        # Tarot, the widest spread
        await page.get_by_text('Tarot', exact=False).first.click(timeout=8000, force=True); await asyncio.sleep(0.8)
        for label in ['Celtic', 'Ten']:
            loc = page.get_by_text(label, exact=False)
            if await loc.count(): await loc.first.click(timeout=5000, force=True); break
        btn = page.get_by_text('Shuffle and draw', exact=False)
        if await btn.count(): await btn.first.click(timeout=8000, force=True)
        await asyncio.sleep(2)
        reveal = page.get_by_text('Reveal all', exact=False)
        if await reveal.count():
            try: await reveal.first.click(timeout=6000, force=True)
            except Exception: pass
        await asyncio.sleep(2)
        bad |= await audit(page, 'tarot celtic drawn', width)
        await page.click('[data-testid="back"]', force=True); await asyncio.sleep(0.5)

        for screen, action in [('BaZi', None), ('Astrology', None), ('Feng Shui', None), ('I Ching', 'Cast the lines')]:
            await page.get_by_text(screen, exact=False).first.click(timeout=8000, force=True); await asyncio.sleep(1.5)
            if action:
                loc = page.get_by_text(action, exact=False)
                if await loc.count(): await loc.first.click(timeout=8000, force=True); await asyncio.sleep(2)
            bad |= await audit(page, screen.lower() + ' with profile', width)
            await page.click('[data-testid="back"]', force=True); await asyncio.sleep(0.5)

        # A long unbroken string in the chat
        await ctx.add_init_script("")
        await page.evaluate("localStorage.setItem('lazyoracle.model', JSON.stringify({endpointEnabled:true,endpointUrl:'http://127.0.0.1:1/v1',endpointToken:'',model:'tianji-fast'}))")
        await page.reload(wait_until='networkidle')
        await page.get_by_text('Ask Tianji', exact=False).first.click(timeout=8000, force=True); await asyncio.sleep(1)
        await page.fill('[data-testid="chat-input"]', 'https://example.com/a/very/long/unbroken/address/that/should/wrap/instead/of/widening/the/page/aaaaaaaaaaaaaaaaaaaa')
        await page.click('[data-testid="chat-send"]'); await asyncio.sleep(3)
        bad |= await audit(page, 'chat long link', width)
        await b.close()
    return bad

async def main():
    app = subprocess.Popen([sys.executable,'-m','http.server',str(PORT),'-d','dist'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    await asyncio.sleep(1.5)
    any_bad = False
    for width in (320, 360, 390):
        print('=== viewport', width)
        any_bad |= await run(width)
    app.terminate()
    print('ANY OVERFLOW:', any_bad)
asyncio.run(main())

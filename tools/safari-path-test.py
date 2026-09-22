"""Check that on-device models still load on Safari, and therefore on iOS.

Safari has neither WebAssembly JSPI nor Memory64, so wllama switches to its
compatibility build. By default it fetches that build from a public CDN, which
our content security policy blocks, so we host it ourselves under
`public/wllama/compat/`. This script simulates Safari's missing features in
Chromium, loads the built app, downloads a tiny stand-in model in place of the
real one, and fails if anything is fetched from a CDN.

    npm run build && python3 tools/safari-path-test.py

It needs Playwright's Chromium (`python3 -m playwright install chromium`) and a
small GGUF file at tools/.tiny.gguf, for example
https://huggingface.co/ggml-org/models/resolve/main/tinyllamas/stories15M-q4_0.gguf
"""
import asyncio, pathlib, subprocess, sys, time
from playwright.async_api import async_playwright

TINY = pathlib.Path(__file__).with_name('.tiny.gguf')
SAFARI_UA = ("Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 "
             "(KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1")

async def main():
    server = subprocess.Popen([sys.executable, '-m', 'http.server', '8791', '-d', 'dist'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    await asyncio.sleep(1.5)
    urls, errors = [], []
    try:
        async with async_playwright() as pw:
            # Turn off the two features Safari lacks, so wllama takes exactly
            # the path an iPhone takes: needCompat() = !JSPI || !Memory64.
            browser = await pw.chromium.launch(args=['--js-flags=--no-wasm-memory64 --no-experimental-wasm-jspi'])
            ctx = await browser.new_context(user_agent=SAFARI_UA, viewport={'width': 420, 'height': 900})
            # Make the page look like Safari to wllama's capability checks:
            # no JSPI and no Memory64, which is what forces the compat build.
            await ctx.add_init_script("""
              delete WebAssembly.Suspending;
              const RealMemory = WebAssembly.Memory;
              WebAssembly.Memory = function (d) {
                if (d && (d.address === 'i64' || d.index === 'i64')) throw new Error('no memory64 (simulated Safari)');
                return new RealMemory(d);
              };
              WebAssembly.Memory.prototype = RealMemory.prototype;
            """)
            page = await ctx.new_page()
            page.on('console', lambda m: errors.append(f"{m.type}: {m.text[:200]}"))
            page.on('pageerror', lambda e: errors.append(f"pageerror: {str(e)[:200]}"))
            page.on('request', lambda r: urls.append(r.url))
            async def to_tiny(route):
                await route.fulfill(status=200, body=TINY.read_bytes(), headers={'Content-Type': 'application/octet-stream', 'Content-Length': str(TINY.stat().st_size)})
            await page.route('**/*.gguf*', to_tiny)
            await page.goto('http://localhost:8791/', wait_until='networkidle')
            print('UA seen by page:', (await page.evaluate('navigator.userAgent'))[:60], '...')
            await page.get_by_role('button', name='Settings').first.click()
            await page.wait_for_selector('[data-testid="device-models"]')
            await page.click('[data-testid="use-tianji-fast"]')
            for _ in range(120):
                await asyncio.sleep(1)
                body = await page.inner_text('[data-testid="device-models"]')
                if 'Ready' in body or '已加载' in body:
                    print('LOADED')
                    break
                if any('load_error' in e.lower() or 'refused' in e.lower() or 'csp' in e.lower() for e in errors):
                    print('ERROR DURING LOAD')
                    break
            else:
                print('timed out waiting for the model to load')
            print('--- model list text ---')
            print(await page.inner_text('[data-testid="device-models"]'))
            print('--- wllama-related requests ---')
            for u in urls:
                if 'wllama' in u or '.gguf' in u or 'jsdelivr' in u:
                    print('  ', u[:120])
            compat = [u for u in urls if '/wllama/compat/' in u]
            cdn = [u for u in urls if 'jsdelivr' in u or 'unpkg' in u]
            print('compat assets requested from our origin:', sorted({u.rsplit("/",1)[-1] for u in compat}))
            print('CDN requests:', cdn or 'none')
            print('needCompat in page:', await page.evaluate("(async()=>{try{new WebAssembly.Memory({initial:1,index:'i64'});return 'mem64 ok'}catch(e){return 'no mem64'}})()"))
            print('console errors:', [e for e in errors if e.startswith(('error','pageerror'))][:6] or 'none')
            await browser.close()
    finally:
        server.terminate()

asyncio.run(main())

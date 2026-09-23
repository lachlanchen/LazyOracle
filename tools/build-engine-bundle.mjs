/**
 * Builds the engine bundle the native apps load.
 *
 * One file, no imports, no DOM: the native side reads it into JavaScriptCore
 * on iOS or QuickJS on Android and calls `LazyOracle.evaluateJson(request)`.
 * Building it from the same TypeScript the web app uses is the whole point;
 * the rules exist once.
 *
 *     node tools/build-engine-bundle.mjs
 */
import { build } from 'vite'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { statSync } from 'node:fs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = resolve(root, 'native/shared')

await build({
  root,
  configFile: false,
  logLevel: 'warn',
  build: {
    outDir,
    // Shared landmark weights are reused by both native apps.
    emptyOutDir: false,
    target: 'es2020',
    lib: {
      entry: resolve(root, 'src/engine-bridge.ts'),
      name: 'LazyOracle',
      formats: ['iife'],
      fileName: () => 'lazyoracle-engines.js',
    },
  },
})

const file = resolve(outDir, 'lazyoracle-engines.js')
console.log(`built ${file} (${Math.round(statSync(file).size / 1024)} KB)`)

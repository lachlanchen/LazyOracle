import { build } from 'vite'
import { cpSync, mkdirSync } from 'node:fs'

const out = 'native/macos/Resources'
mkdirSync(`${out}/Vision`, { recursive: true })
for (const name of ['lazyoracle-engines.js', 'auspice-content.json']) {
  cpSync(`native/ios/Auspice/Resources/${name}`, `${out}/${name}`)
}
for (const name of ['face_landmarker.task', 'hand_landmarker.task']) {
  cpSync(`public/models/${name}`, `${out}/Vision/${name}`)
}
for (const ext of ['js', 'wasm']) {
  cpSync(`node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.${ext}`, `${out}/Vision/vision_wasm_internal.${ext}`)
}
cpSync('native/macos/vision/index.html', `${out}/Vision/index.html`)
cpSync('native/macos/ThirdPartyNotices.txt', `${out}/Vision/ThirdPartyNotices.txt`)
await build({ configFile: false, logLevel: 'warn', build: {
  outDir: `${out}/Vision`, emptyOutDir: false, target: 'es2020',
  lib: { entry: 'native/macos/vision/runner.js', name: 'OracleVision', formats: ['iife'], fileName: () => 'runner.js' },
} })

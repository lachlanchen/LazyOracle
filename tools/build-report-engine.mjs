import { build } from 'esbuild'
await build({ entryPoints: ['ops/report_engine.ts'], bundle: true, platform: 'node', format: 'cjs', target: 'node18', outfile: 'ops/report_engine.cjs' })

import { computeBazi } from '../src/engines/bazi/bazi'
import { readFileSync } from 'node:fs'
const { input, year } = JSON.parse(readFileSync(0, 'utf8'))
const now = new Date(Date.UTC(year, 5, 1))
process.stdout.write(JSON.stringify(computeBazi(input, now)))

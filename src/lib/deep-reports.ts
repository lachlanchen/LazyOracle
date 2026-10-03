import type { BaziChart } from '../engines/bazi/bazi'
import type { BirthProfile } from './profile'
export interface DeepReport {
  id: string; created: number; language: string; question: string
  status: 'unpaid' | 'paid' | 'generating' | 'ready'; error: string | null
  facts: { chart: BaziChart; timeKnown: boolean; engineVersion: string }
  report: Record<string, string> | null; checkoutSession: string | null
}
interface Archive { capability: string; reports: DeepReport[] }
const key = 'lazyoracle.bazi-reports.v1'
export const reportSections = ['overview', 'balance', 'work', 'relationships', 'cycles', 'year', 'practice']
const endpoint = 'https://oracle.lazying.art/v1/reports/'
export function reportArchive(): Archive {
  const raw = localStorage.getItem(key)
  if (raw) {
    const archive = JSON.parse(raw) as Archive
    if (!archive.capability || !Array.isArray(archive.reports)) throw new Error('report.storageError')
    return archive
  }
  const archive = { capability: Array.from(crypto.getRandomValues(new Uint8Array(32)), (v) => v.toString(16).padStart(2, '0')).join(''), reports: [] }
  localStorage.setItem(key, JSON.stringify(archive))
  return archive
}
export function keepReport(row: DeepReport): void {
  const archive = reportArchive()
  archive.reports = [row, ...archive.reports.filter((r) => r.id !== row.id)]
  localStorage.setItem(key, JSON.stringify(archive))
}
export async function reportRequest<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const archive = reportArchive()
  // Verify durable storage before permitting checkout. No memory-only purchases.
  localStorage.setItem(key, JSON.stringify(archive))
  const response = await fetch(endpoint + action, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + archive.capability }, body: JSON.stringify(payload), signal: AbortSignal.timeout(40000) })
  if (!response.ok) throw new Error('report.connectionError')
  return response.json() as Promise<T>
}
export async function createReport(profile: BirthProfile, language: string, question: string): Promise<DeepReport> {
  const snapshot = { year: profile.year, month: profile.month, day: profile.day, hour: profile.hour, minute: profile.minute, gender: profile.gender, longitude: profile.longitude, utcOffsetHours: profile.utcOffsetHours, timeKnown: profile.timeKnown }
  const row = await reportRequest<DeepReport>('create', { id: crypto.randomUUID(), profile: snapshot, language: language === 'en' ? 'en' : 'zh-Hans', question: question.slice(0, 1000) })
  keepReport(row)
  return row
}
export async function recoverCheckout(): Promise<DeepReport | null> {
  const params = new URLSearchParams(location.search)
  const session = params.get('report_checkout')
  // A success redirect is only a hint. The server independently queries Stripe.
  if (!session) return null
  const list = await reportRequest<{ reports: DeepReport[] }>('list')
  const order = list.reports.find((r) => r.checkoutSession === session)
  if (!order) throw new Error('report.connectionError')
  const row = await reportRequest<DeepReport>('verify', { id: order.id, platform: 'stripe', receipt: session })
  keepReport(row)
  params.delete('report_checkout')
  history.replaceState(null, '', location.pathname + (params.size ? '?' + params.toString() : '') + location.hash)
  return row
}

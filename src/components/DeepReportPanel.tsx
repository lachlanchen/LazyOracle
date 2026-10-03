import { useEffect, useState } from 'react'
import { FileText, Download } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { createReport, keepReport, recoverCheckout, reportArchive, reportRequest, reportSections, type DeepReport } from '../lib/deep-reports'
import type { BirthProfile } from '../lib/profile'
import type { ReadingLanguage } from '../types'
import texts from '../lib/report-copy.json'

export function DeepReportPanel({ profile, language }: { profile: BirthProfile; language: ReadingLanguage }) {
  const copy = (key: string) => (texts as Record<string, Record<string, string>>)[key]?.[language === 'en' ? 'en' : 'zh-Hans'] ?? key
  const [rows, setRows] = useState<DeepReport[]>(() => { try { return reportArchive().reports } catch { return [] } })
  const [selected, setSelected] = useState<string | null>(null)
  const [question, setQuestion] = useState('')
  const [available, setAvailable] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const current = rows.find((r) => r.id === selected)
  function save(row: DeepReport) { keepReport(row); setRows((old) => [row, ...old.filter((r) => r.id !== row.id)]) }

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        reportArchive()
        const response = await fetch('https://oracle.lazying.art/v1/reports/catalog', { signal: AbortSignal.timeout(10000) })
        if (response.ok) { const catalog = await response.json() as { web: boolean }; if (!cancelled) setAvailable(catalog.web && !Capacitor.isNativePlatform()) }
        const recovered = await recoverCheckout()
        if (recovered && !cancelled) { keepReport(recovered); setSelected(recovered.id) }
        const result = await reportRequest<{ reports: DeepReport[] }>('list')
        result.reports.forEach(keepReport)
        if (!cancelled) setRows(reportArchive().reports)
      } catch (error) { if (!cancelled) setMessage(error instanceof Error && error.message === 'report.storageError' ? error.message : 'report.connectionError') }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!selected || current?.status === 'ready' || current?.status === 'unpaid' || current?.error) return
    let stopped = false
    let timer: ReturnType<typeof setTimeout>
    async function poll() {
      try {
        const row = await reportRequest<DeepReport>('get', { id: selected })
        if (stopped) return
        keepReport(row); setRows((old) => [row, ...old.filter((r) => r.id !== row.id)])
        if (row.status === 'ready' || row.error) return
      } catch { if (!stopped) setMessage('report.connectionError') }
      if (!stopped) timer = setTimeout(() => { void poll() }, 6000)
    }
    void poll()
    return () => { stopped = true; clearTimeout(timer) }
  }, [selected, current?.status, current?.error])

  async function buy() {
    setBusy(true); setMessage(null)
    try {
      const row = await createReport(profile, language, question)
      save(row)
      const checkout = await reportRequest<{ url: string }>('checkout', { id: row.id })
      const url = new URL(checkout.url)
      if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') throw new Error('invalid checkout')
      location.assign(url.href)
    } catch { setMessage('report.retryPurchase'); setBusy(false) }
  }
  async function retry(row: DeepReport) {
    setBusy(true)
    try {
      if (row.status === 'unpaid' && row.checkoutSession) {
        save(await reportRequest('verify', { id: row.id, platform: 'stripe', receipt: row.checkoutSession }))
      } else { save(await reportRequest('retry', { id: row.id })) }
      setMessage(null)
    } catch { setMessage('report.connectionError') }
    finally { setBusy(false) }
  }
  async function recover() {
    setBusy(true); setMessage(null)
    try {
      const response = await fetch('https://oracle.lazying.art/v1/reports/catalog', { signal: AbortSignal.timeout(10000) })
      if (response.ok) {
        const catalog = await response.json() as { web: boolean }
        setAvailable(catalog.web && !Capacitor.isNativePlatform())
      }
      const result = await reportRequest<{ reports: DeepReport[] }>('list')
      for (const row of result.reports) {
        save(row)
        if (row.status === 'unpaid' && row.checkoutSession) {
          // A cancelled/open session grants nothing. Other saved reports still
          // recover when a checkout has not been completed.
          try { save(await reportRequest('verify', { id: row.id, platform: 'stripe', receipt: row.checkoutSession })) } catch { /* Still unpaid. */ }
        }
      }
    } catch { setMessage('report.connectionError') }
    finally { setBusy(false) }
  }
  function download(row: DeepReport) {
    const chart = row.facts.chart
    const text = [copy('report.original'), Object.values(chart.pillars).map((p) => p.ganzhi).join(' · '), ...reportSections.map((s) => copy('report.section.' + s) + '\n' + (row.report?.[s] ?? ''))].join('\n\n')
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = 'BaZi-' + row.id + '.txt'; a.click(); URL.revokeObjectURL(url)
  }
  return <section className="panel deep-report-panel" data-testid="deep-report-panel">
    <h2><FileText size={20} /> {copy('report.title')}</h2>
    <p>{copy('report.offer')}</p><p className="hint">{copy('report.privacy')}</p>
    <label>{copy('report.question')}<textarea value={question} maxLength={1000} onChange={(event) => setQuestion(event.target.value)} /></label>
    <button className="primary-button" type="button" disabled={!available || busy} onClick={() => { void buy() }}>{busy ? copy('report.processing') : copy('report.buy').replace('{0}', '$4.99 USD')}</button>
    {!available && <p className="hint">{copy('report.unavailable')}</p>}
    <button className="ghost-button" type="button" disabled={busy} onClick={() => { void recover() }}>{copy('report.recover')}</button>
    {message && <p role="status">{copy(message)}</p>}
    {rows.map((row) => <button className="ghost-button report-history-row" type="button" key={row.id} onClick={() => setSelected(row.id)}>{new Date(row.created * 1000).toLocaleDateString()} · {row.question || copy('report.title')} · {copy('report.status.' + row.status)}</button>)}
    {current && <div className="report-detail" aria-live="polite">
      <h3>{copy('report.original')}</h3><p>{Object.values(current.facts.chart.pillars).map((p) => p.ganzhi).join(' · ')}</p>
      <p>{current.facts.chart.dayMaster.stem} · {current.facts.chart.dayMaster.element} · {current.facts.chart.favourable.join(' · ')}</p>
      {!current.facts.timeKnown && <p className="hint">{language === 'en' ? 'Unknown birth time: hour-based analysis is provisional.' : '出生时刻未知：与时柱有关的分析仅供参考。'}</p>}
      {current.report ? <>
        {reportSections.map((s) => <article key={s}><h3>{copy('report.section.' + s)}</h3><p style={{ whiteSpace: 'pre-wrap' }}>{current.report?.[s]}</p></article>)}
        <button className="ghost-button" type="button" onClick={() => download(current)}><Download size={16} />{language === 'en' ? 'Export report' : '导出报告'}</button>
      </> : <><p>{copy(current.error ? 'report.generationError' : 'report.status.' + current.status)}</p><button type="button" className="ghost-button" disabled={busy} onClick={() => { void retry(current) }}>{copy('report.retry')}</button></>}
    </div>}
  </section>
}

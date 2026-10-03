import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createReport, keepReport, recoverCheckout, reportArchive, reportRequest } from './deep-reports'
import { DEFAULT_PROFILE } from './profile'
import { computeBazi } from '../engines/bazi/bazi'
const row = { id: '00000000-0000-4000-8000-000000000001', created: 1, language: 'en', question: '', status: 'unpaid' as const, error: null, facts: { chart: computeBazi(DEFAULT_PROFILE), timeKnown: true, engineVersion: 'bazi-v1' }, report: null, checkoutSession: 'cs_test_example' }
beforeEach(() => { localStorage.clear(); history.replaceState(null, '', '/'); vi.stubGlobal('fetch', vi.fn()) })
afterEach(() => vi.restoreAllMocks())
describe('report purchase persistence and verification', () => {
  it('keeps an installation capability stable across reopening', () => {
    const first = reportArchive(); expect(first.capability).toHaveLength(64)
    expect(reportArchive().capability).toEqual(first.capability)
  })
  it('refuses a purchase when durable local storage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    await expect(createReport(DEFAULT_PROFILE, 'en', '')).rejects.toThrow('quota')
    expect(fetch).not.toHaveBeenCalled()
  })
  it('does not replace a corrupted archive with a new empty one', () => {
    localStorage.setItem('lazyoracle.bazi-reports.v1', 'broken')
    expect(() => reportArchive()).toThrow()
    expect(localStorage.getItem('lazyoracle.bazi-reports.v1')).toBe('broken')
  })
  it('saves the frozen server snapshot before opening checkout', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(row)))
    expect(await createReport(DEFAULT_PROFILE, 'en', 'Career')).toEqual(row)
    expect(reportArchive().reports[0]).toEqual(row)
    const request = vi.mocked(fetch).mock.calls[0][1]!
    expect((request.headers as Record<string, string>).Authorization).toMatch(/^Bearer [a-f0-9]{64}$/)
    expect(JSON.parse(request.body as string).question).toBe('Career')
    expect(JSON.parse(request.body as string).profile).not.toHaveProperty('name')
    expect(JSON.parse(request.body as string).profile).not.toHaveProperty('place')
  })
  it('reopening a ready report preserves other purchased reports', () => {
    keepReport(row); keepReport({ ...row, id: 'second', status: 'ready', report: { overview: 'Saved' } }); keepReport(row)
    expect(reportArchive().reports).toHaveLength(2)
    expect(reportArchive().reports.find((r) => r.id === 'second')?.report?.overview).toBe('Saved')
  })
  it('never trusts a success URL to grant a report', async () => {
    history.replaceState(null, '', '/?report_checkout=cs_test_example')
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ reports: [row] })))
      .mockResolvedValueOnce(new Response('{}', { status: 403 }))
    await expect(recoverCheckout()).rejects.toThrow()
    expect(reportArchive().reports).toEqual([])
    expect(vi.mocked(fetch).mock.calls[1][0]).toContain('/verify')
  })
  it('binds verified checkout recovery to the server order, then removes the return hint', async () => {
    history.replaceState(null, '', '/?report_checkout=cs_test_example')
    const paid = { ...row, status: 'paid' as const }
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ reports: [row] })))
      .mockResolvedValueOnce(new Response(JSON.stringify(paid)))
    expect(await recoverCheckout()).toEqual(paid)
    expect(JSON.parse(vi.mocked(fetch).mock.calls[1][1]!.body as string)).toEqual({ id: row.id, platform: 'stripe', receipt: 'cs_test_example' })
    expect(location.search).toBe('')
  })
  it('rejects verification failure without overwriting saved reports', async () => {
    keepReport(row)
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 503 }))
    await expect(reportRequest('get', { id: row.id })).rejects.toThrow()
    expect(reportArchive().reports[0]).toEqual(row)
  })
})

import { describe, expect, it } from 'vitest'
import { classifyFaceShape, resolveFace } from './shape'
import { evaluate } from '../../engine-bridge'

describe('native five-form silhouette reading', () => {
  it.each([
    ['wood', 1.58, .70, .84], ['fire', 1.37, .96, .78],
    ['earth', 1.24, .97, .99], ['metal', 1.38, .87, .91],
    ['water', 1.13, .81, .90],
  ] as const)('resolves a %s outline with its matching theme', (primary, heightRatio, jawRatio, foreheadRatio) => {
    const result = classifyFaceShape({ heightRatio, jawRatio, foreheadRatio })
    expect(result.primary).toBe(primary)
    expect(result.theme.toLowerCase()).toContain(primary)
    expect(result.reflection.length).toBeGreaterThan(40)
  })
  it('uses narrow above / broad below for Fire, not the inverted older rule', () => {
    expect(classifyFaceShape({ heightRatio: 1.35, jawRatio: .96, foreheadRatio: .78 }).primary).toBe('fire')
    expect(classifyFaceShape({ heightRatio: 1.35, jawRatio: .78, foreheadRatio: .96 }).primary).not.toBe('fire')
  })
  it('migrates mixed saved captures without changing measured numbers or observations', () => {
    const saved = { element: 'mixed', heightRatio: 1.20, jawRatio: .80, foreheadRatio: .98,
      courts: [{ court: 'upper', share: .15, state: 'short' }], symmetry: .993,
      measurement: { version: 2, samples: 8, typeCandidates: ['fire', 'metal', 'water'], limitations: ['old caveat'] } }
    const result = resolveFace(saved)
    expect(result.element).toBe('water')
    expect(result.classification.primary).toBe(result.element)
    expect(result.measurement?.typeCandidates).toEqual(['water'])
    expect(result).toMatchObject({heightRatio: saved.heightRatio, jawRatio: saved.jawRatio,
      foreheadRatio: saved.foreheadRatio, courts: saved.courts, symmetry: saved.symmetry,
      measurement: {version: 2, samples: 8}})
    expect(saved.element).toBe('mixed') // original snapshot remains available for rollback
    expect(resolveFace(result)).toEqual(result)
    expect(evaluate('face.resolve', { features: saved })).toMatchObject({ ok: true, data: result })
  })
  it('keeps small measurement changes inside a band from changing the reading', () => {
    const base = { heightRatio: 1.2, jawRatio: .8, foreheadRatio: .95 }
    const expected = classifyFaceShape(base)
    for (const delta of [-.014, -.006, 0, .006, .014]) {
      expect(classifyFaceShape({ heightRatio: base.heightRatio + delta, jawRatio: base.jawRatio - delta,
        foreheadRatio: base.foreheadRatio + delta })).toEqual(expected)
    }
  })
  it('rejects missing and non-finite measurements rather than inventing a result', () => {
    for (const heightRatio of [NaN, Infinity, 0, -1, 5]) {
      expect(() => classifyFaceShape({ heightRatio, jawRatio: .8, foreheadRatio: .9 })).toThrow('vision.incomplete')
    }
    expect(evaluate('face.resolve', { features: {} })).toMatchObject({ ok: false })
  })
})

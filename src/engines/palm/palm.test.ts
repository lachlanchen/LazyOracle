import { describe, expect, it } from 'vitest'
import { palmFeatures, type Point } from './palm'

function hand(palmWidth: number, palmLength: number, fingerLength: number): Point[] {
  const points: Point[] = Array.from({ length: 21 }, () => ({ x: 0, y: 0 }))
  points[0] = { x: 0.5, y: 1 } // wrist
  points[9] = { x: 0.5, y: 1 - palmLength } // middle base
  points[12] = { x: 0.5, y: 1 - palmLength - fingerLength } // middle tip
  points[5] = { x: 0.5 - palmWidth / 2, y: 1 - palmLength } // index base
  points[8] = { x: 0.5 - palmWidth / 2, y: 1 - palmLength - fingerLength * 0.9 }
  points[13] = { x: 0.5 + palmWidth / 6, y: 1 - palmLength }
  points[16] = { x: 0.5 + palmWidth / 6, y: 1 - palmLength - fingerLength * 0.92 }
  points[17] = { x: 0.5 + palmWidth / 2, y: 1 - palmLength } // pinky base
  points[4] = { x: 0.5 - palmWidth, y: 1 - palmLength / 2 } // thumb tip
  return points
}

describe('hand shape from landmarks', () => {
  const lines = { heart: 'index', head: 'curved', life: 'wide' } as const

  it('classifies the four classical hand types from palm and finger proportions', () => {
    expect(palmFeatures(hand(0.36, 0.40, 0.28), lines).shape).toBe('earth')
    expect(palmFeatures(hand(0.36, 0.40, 0.34), lines).shape).toBe('air')
    expect(palmFeatures(hand(0.30, 0.42, 0.28), lines).shape).toBe('fire')
    expect(palmFeatures(hand(0.30, 0.42, 0.36), lines).shape).toBe('water')
  })

  it('reports proportions and keeps the described lines', () => {
    const features = palmFeatures(hand(0.36, 0.40, 0.34), lines)
    expect(features.palmRatio).toBeCloseTo(0.9, 1)
    expect(features.fingerRatio).toBeCloseTo(0.85, 1)
    expect(features.indexToRing).toBeLessThan(1)
    expect(features.lines).toEqual(lines)
    expect(() => palmFeatures([], lines)).toThrow()
  })
})

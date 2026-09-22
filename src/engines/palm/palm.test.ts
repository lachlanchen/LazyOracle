import { describe, expect, it } from 'vitest'
import { palmFeatures, type LineTraits, type Point } from './palm'

/**
 * A synthetic right hand. Depths default to the plane of the palm; `raise`
 * lifts named landmarks towards the camera (MediaPipe reports that as a more
 * negative z), which is how a full mount looks to the landmarker.
 */
function hand(palmWidth: number, palmLength: number, fingerLength: number, raise: Record<number, number> = {}): Point[] {
  const points: Point[] = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }))
  points[0] = { x: 0.5, y: 1, z: 0 } // wrist
  points[1] = { x: 0.5 - palmWidth * 0.55, y: 1 - palmLength * 0.2, z: 0 } // thumb carpal
  points[2] = { x: 0.5 - palmWidth * 0.8, y: 1 - palmLength * 0.4, z: 0 } // thumb knuckle
  points[4] = { x: 0.5 - palmWidth, y: 1 - palmLength / 2, z: 0 } // thumb tip
  points[5] = { x: 0.5 - palmWidth / 2, y: 1 - palmLength, z: 0 } // index base
  points[8] = { x: 0.5 - palmWidth / 2, y: 1 - palmLength - fingerLength * 0.9, z: 0 }
  points[9] = { x: 0.5, y: 1 - palmLength, z: 0 } // middle base
  points[12] = { x: 0.5, y: 1 - palmLength - fingerLength, z: 0 } // middle tip
  points[13] = { x: 0.5 + palmWidth / 6, y: 1 - palmLength, z: 0 }
  points[16] = { x: 0.5 + palmWidth / 6, y: 1 - palmLength - fingerLength * 0.92, z: 0 }
  points[17] = { x: 0.5 + palmWidth / 2, y: 1 - palmLength, z: 0 } // pinky base
  points[20] = { x: 0.5 + palmWidth / 2, y: 1 - palmLength - fingerLength * 0.7, z: 0 }
  for (const [index, height] of Object.entries(raise)) points[Number(index)].z = -height
  return points
}

const lines: LineTraits = { heart: 'index', head: 'curved', life: 'wide', fate: 'present' }

describe('hand shape from landmarks', () => {
  it('classifies the four classical hand types from palm and finger proportions', () => {
    expect(palmFeatures(hand(0.36, 0.4, 0.28), lines).shape).toBe('earth')
    expect(palmFeatures(hand(0.36, 0.4, 0.34), lines).shape).toBe('air')
    expect(palmFeatures(hand(0.3, 0.42, 0.28), lines).shape).toBe('fire')
    expect(palmFeatures(hand(0.3, 0.42, 0.36), lines).shape).toBe('water')
  })

  it('reports proportions and keeps the described lines, including the fate line', () => {
    const features = palmFeatures(hand(0.36, 0.4, 0.34), lines)
    expect(features.palmRatio).toBeCloseTo(0.9, 1)
    expect(features.fingerRatio).toBeCloseTo(0.85, 1)
    expect(features.indexToRing).toBeLessThan(1)
    expect(features.lines).toEqual(lines)
    expect(() => palmFeatures([], lines)).toThrow()
  })
})

describe('fingers', () => {
  it('measures each finger against the middle finger and names the notable ones', () => {
    const features = palmFeatures(hand(0.36, 0.4, 0.34), lines)
    expect(features.fingers.map((f) => f.finger)).toEqual(['jupiter', 'saturn', 'apollo', 'mercury'])
    const saturn = features.fingers.find((f) => f.finger === 'saturn')
    expect(saturn?.ratioToSaturn).toBe(1)
    expect(saturn?.length).toBe('average')
    const jupiter = features.fingers.find((f) => f.finger === 'jupiter')
    // Built at exactly nine tenths of the middle finger, the classical average.
    expect(jupiter?.ratioToSaturn).toBeCloseTo(0.9, 2)
    expect(jupiter?.length).toBe('average')
  })

  it('calls a finger long only when it passes the classical proportion', () => {
    const points = hand(0.36, 0.4, 0.34)
    points[8] = { ...points[8], y: points[5].y - 0.34 } // index as long as the middle finger
    const features = palmFeatures(points, lines)
    expect(features.fingers.find((f) => f.finger === 'jupiter')?.length).toBe('long')
  })
})

describe('the eight palaces', () => {
  it('reads every palace and marks a raised mount as full', () => {
    // A full ball of the thumb (震) and a full base of the index finger (巽).
    const features = palmFeatures(hand(0.36, 0.4, 0.34, { 2: 0.08, 5: 0.06 }), lines)
    expect(features.palaces).toHaveLength(8)
    expect(features.palaces.map((p) => p.palace).sort()).toEqual(['乾', '兑', '坎', '坤', '巽', '艮', '震', '离'].sort())
    expect(features.strongPalaces).toContain('震')
    expect(features.palaces.find((p) => p.palace === '震')?.state).toBe('full')
  })

  it('calls a flat palm even rather than inventing prominence', () => {
    const features = palmFeatures(hand(0.36, 0.4, 0.34), lines)
    expect(features.strongPalaces).toEqual([])
    expect(features.palaces.every((p) => p.state === 'even')).toBe(true)
  })
})

describe('thumb and finger spacing', () => {
  it('measures the thumb opening in degrees and the spread of the fingers', () => {
    const features = palmFeatures(hand(0.36, 0.4, 0.34), lines)
    expect(features.thumbAngle).toBeGreaterThan(0)
    expect(features.thumbAngle).toBeLessThan(180)
    expect(features.openness).toBeGreaterThan(0)
  })
})

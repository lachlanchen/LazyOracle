import { describe, expect, it } from 'vitest'
import { faceFeatures, type Point } from './face'

/**
 * A synthetic face, built from the few landmarks the engine reads. Everything
 * is given in the normalised 0–1 coordinates MediaPipe returns, with y growing
 * downwards.
 */
function face(options: { width?: number; height?: number; jaw?: number; forehead?: number; eyeWidth?: number; browY?: number; noseY?: number; shift?: number } = {}): Point[] {
  const { width = 0.4, height = 0.56, jaw = 0.82, forehead = 0.92, eyeWidth = 0.08, browY = 0.34, noseY = 0.58, shift = 0 } = options
  const points: Point[] = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }))
  const set = (index: number, x: number, y: number) => {
    points[index] = { x, y, z: 0 }
  }
  const top = 0.1
  const bottom = top + height
  const half = width / 2
  set(10, 0.5, top) // top of the forehead
  set(152, 0.5, bottom) // chin
  set(234, 0.5 - half, 0.42)
  set(454, 0.5 + half, 0.42) // cheekbones
  set(172, 0.5 - (half * jaw), 0.62)
  set(397, 0.5 + (half * jaw), 0.62) // jaw
  set(127, 0.5 - (half * forehead), 0.3)
  set(356, 0.5 + (half * forehead), 0.3) // temples
  set(107, 0.5 - eyeWidth * 0.5, browY)
  set(336, 0.5 + eyeWidth * 0.5, browY) // inner brow ends
  set(46, 0.5 - eyeWidth * 1.65, browY)
  set(276, 0.5 + eyeWidth * 1.65, browY) // outer brow ends
  set(105, 0.5 - eyeWidth, browY - 0.005)
  set(334, 0.5 + eyeWidth + shift, browY - 0.005) // brow peaks
  set(33, 0.5 - eyeWidth * 2, browY + 0.06)
  set(133, 0.5 - eyeWidth, browY + 0.06) // left eye
  set(362, 0.5 + eyeWidth, browY + 0.06)
  set(263, 0.5 + eyeWidth * 2 + shift, browY + 0.06) // right eye
  set(159, 0.5 - eyeWidth * 1.5, browY + 0.04)
  set(386, 0.5 + eyeWidth * 1.5, browY + 0.04) // upper eyelids
  set(193, 0.5 - eyeWidth * 0.31, browY + 0.05)
  set(417, 0.5 + eyeWidth * 0.31, browY + 0.05) // bridge of the nose
  set(1, 0.5, noseY - 0.02)
  set(2, 0.5, noseY) // nose tip and base
  set(129, 0.5 - eyeWidth * 0.55, noseY - 0.01)
  set(358, 0.5 + eyeWidth * 0.55, noseY - 0.01) // nose wings
  set(61, 0.5 - eyeWidth * 0.7, noseY + 0.07)
  set(291, 0.5 + eyeWidth * 0.7, noseY + 0.07) // mouth corners
  set(9, 0.5, browY - 0.01)
  return points
}

describe('face measurements', () => {
  it('needs a full set of landmarks', () => {
    expect(() => faceFeatures([])).toThrow()
  })

  it('divides the face into three courts that sum to the whole', () => {
    const features = faceFeatures(face())
    const total = features.courts.reduce((sum, court) => sum + court.share, 0)
    expect(total).toBeCloseTo(1, 2)
    expect(features.courts.map((court) => court.court)).toEqual(['upper', 'middle', 'lower'])
  })

  it('measures the face in eye-widths, as the five-eye rule does', () => {
    const features = faceFeatures(face({ width: 0.4, eyeWidth: 0.08 }))
    expect(features.eyesAcross).toBeCloseTo(5, 1)
    expect(features.eyeGap).toBeCloseTo(2, 1)
  })

  it('reads a long face as wood and a round one as water', () => {
    expect(faceFeatures(face({ width: 0.34, height: 0.56 })).element).toBe('wood')
    expect(faceFeatures(face({ width: 0.48, height: 0.5 })).element).toBe('water')
  })

  it('reads a wide forehead over a narrow jaw as fire, and a heavy jaw as earth', () => {
    expect(faceFeatures(face({ width: 0.42, height: 0.5, jaw: 0.7, forehead: 1.0 })).element).toBe('fire')
    expect(faceFeatures(face({ width: 0.42, height: 0.53, jaw: 0.95, forehead: 0.92 })).element).toBe('earth')
  })

  it('scores a mirrored face as symmetrical and a shifted one as less so', () => {
    expect(faceFeatures(face()).symmetry).toBeGreaterThan(0.95)
    expect(faceFeatures(face({ shift: 0.05 })).symmetry).toBeLessThan(0.95)
  })

  it('reports every palace with the ratio behind it', () => {
    const features = faceFeatures(face())
    expect(features.palaces).toHaveLength(8)
    expect(features.palaces.map((palace) => palace.palace)).toContain('命宫')
    for (const palace of features.palaces) {
      expect(palace.value).toBeGreaterThan(0)
      expect(['generous', 'even', 'narrow']).toContain(palace.state)
    }
    expect(features.strongPalaces.length).toBeLessThanOrEqual(2)
  })
})

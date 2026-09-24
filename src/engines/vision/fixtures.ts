import type { Point } from '../face/face'
export function face(options: { width?: number; height?: number; jaw?: number; forehead?: number; eyeWidth?: number; browY?: number; noseY?: number; shift?: number } = {}): Point[] {
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

export function hand(): Point[] {
  const p: Point[] = Array.from({length:21},()=>({x:0.5,y:0.5,z:0}))
  p[0]={x:0.5,y:0.9,z:0}
  for (const [base,x,length] of [[5,0.32,0.306],[9,0.5,0.34],[13,0.56,0.3162],[17,0.68,0.2448]]) {
    for(let j=0;j<4;j++)p[base+j]={x,y:0.5-length*j/3,z:0}
  }
  p[1]={x:0.30,y:0.80,z:0};p[2]={x:0.22,y:0.70,z:0};p[3]={x:0.18,y:0.65,z:0};p[4]={x:0.14,y:0.61,z:0}
  return p
}

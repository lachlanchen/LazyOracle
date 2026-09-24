/** Native capture v2: geometry in one scale, pose checks, then a robust burst.
 * No identity matching, photographs, random draws or previous-person priors.
 * Limits describe repeatability of landmark estimates, not clinical accuracy.
 */
import { faceFeatures, type Point } from '../face/face'
import { resolveFace } from '../face/shape'
import { palmFeatures, type LineTraits } from '../palm/palm'

export interface LandmarkFrame {
  landmarks: Point[]
  width: number
  height: number
  timestamp: number
}
export interface Measurement {
  version: number
  samples: number
  typeCandidates: string[]
  limitations: string[]
}
const SAMPLES = 8
const faceAnchors = [10, 152, 234, 454, 172, 397, 127, 356, 33, 133, 362, 263, 107, 336, 2, 61, 291]
const handAnchors = [0, 5, 9, 13, 17, 4, 8, 12, 16, 20]
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
const q = (x: number, step = 0.01) => Math.round(Math.round(x / step) * step * 10000) / 10000
function median(xs: number[]): number {
  const sorted = [...xs].sort((a, b) => a - b), mid = Math.floor(xs.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}
function fail(reason: string): never { throw new Error(`vision.${reason}`) }

/** Correct MediaPipe's separate width/height normalization before any ratio.
 * Then remove translation, in-plane rotation and distance from the camera.
 * Strong out-of-plane poses are rejected instead of inventing missing shape.
 */
function aligned(frame: LandmarkFrame, hand: boolean): Point[] {
  const n = hand ? 21 : 468
  if (!Number.isFinite(frame.width) || !Number.isFinite(frame.height) || frame.width < 64 || frame.height < 64 ||
      !Array.isArray(frame.landmarks) || frame.landmarks.length < n) fail('incomplete')
  const raw = frame.landmarks.slice(0, n)
  if (raw.some(p => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z ?? 0))) fail('incomplete')
  const anchors = hand ? handAnchors : faceAnchors
  if (anchors.some(i => raw[i].x < 0.02 || raw[i].x > 0.98 || raw[i].y < 0.02 || raw[i].y > 0.98)) fail('frame')
  const p = raw.map(p => ({ x: p.x * frame.width, y: p.y * frame.height, z: (p.z ?? 0) * frame.width }))
  const origin = p[hand ? 0 : 10], end = p[hand ? 9 : 152]
  const axis = dist(origin, end)
  const size = hand ? axis : dist(p[234], p[454])
  if (size < (hand ? 65 : 90)) fail('closer')
  if (hand) {
    // Palm plane must face the lens, and fingers must be extended. Joint
    // depth is useful for pose rejection; it is not palm-surface topography.
    const a = { x: p[5].x-p[0].x, y:p[5].y-p[0].y, z:p[5].z-p[0].z }
    const b = { x: p[17].x-p[0].x, y:p[17].y-p[0].y, z:p[17].z-p[0].z }
    const normal = [a.y*b.z-a.z*b.y, a.z*b.x-a.x*b.z, a.x*b.y-a.y*b.x]
    if (Math.hypot(...normal) < 1e-6 || Math.abs(normal[2]) / Math.hypot(...normal) < 0.86 || dist(p[5],p[17]) < axis * 0.4) fail('palmPose')
    for (const base of [5, 9, 13, 17]) {
      const chain = dist(p[base],p[base+1]) + dist(p[base+1],p[base+2]) + dist(p[base+2],p[base+3])
      if (!chain || dist(p[base],p[base+3]) / chain < 0.94) fail('palmPose')
    }
  } else {
    const yaw = Math.abs(p[234].z - p[454].z) / size
    const pitch = Math.abs(p[10].z - p[152].z) / axis
    if (yaw > 0.28 || pitch > 0.32) fail('facePose')
    // An open mouth changes the lower-face proportions; don't measure that
    // expression as a different face shape.
    if (dist(p[13], p[14]) / axis > 0.055) fail('facePose')
  }
  if (!Number.isFinite(axis) || axis <= 0) fail('incomplete')
  const vx = (end.x-origin.x)/axis, vy = (end.y-origin.y)/axis
  return p.map(a => ({x: ((a.x-origin.x)*vy-(a.y-origin.y)*vx)/size,
    y: ((a.x-origin.x)*vx+(a.y-origin.y)*vy)/size, z: (a.z-origin.z)/size}))
}

export function stableLandmarks(frames: LandmarkFrame[], hand: boolean): Point[] {
  if (!Array.isArray(frames) || frames.length < SAMPLES || frames.length > 12) fail('hold')
  if (frames.some((f,i) => !f || !Number.isFinite(f.timestamp) || (i > 0 && f.timestamp <= frames[i-1].timestamp))) fail('hold')
  const newest = frames[frames.length-1].timestamp
  if (newest-frames[0].timestamp > 1800) fail('hold')
  // Never reuse an older pose when the currently visible one is unsuitable.
  aligned(frames[frames.length-1], hand)
  const accepted: { points: Point[]; timestamp: number }[] = []
  for (const frame of frames) {
    try { accepted.push({points: aligned(frame, hand),timestamp:frame.timestamp}) } catch { /* discard a poor frame */ }
  }
  const burst = accepted.slice(-SAMPLES)
  if (burst.length < SAMPLES || burst[SAMPLES-1].timestamp-burst[0].timestamp < 650) fail('hold')
  const centre = burst[0].points.map((_, i) => ({
    x: median(burst.map(f=>f.points[i].x)), y: median(burst.map(f=>f.points[i].y)), z: median(burst.map(f=>f.points[i].z ?? 0)),
  }))
  const anchors = hand ? handAnchors : faceAnchors
  const errors = burst.map(f => Math.sqrt(anchors.reduce((sum,i) => sum + dist(f.points[i],centre[i])**2,0)/anchors.length))
  // A median resists a single tracking spike; two or more large outliers or
  // a changed last frame require a fresh steady burst.
  const limit = hand ? 0.025 : 0.018
  if (errors.filter(e=>e>limit).length > 1 || errors[errors.length-1] > limit*1.5) fail('steady')
  return centre
}

function measurement(candidates: string[], hand: boolean): Measurement {
  return { version: 2, samples: SAMPLES, typeCandidates: [...new Set(candidates)].sort(), limitations: [
    'Landmark geometry only. Repeatability is not scientific certainty about a person. Do not infer personality, health, wealth, relationships or future events from appearance.',
    'Shape categories are traditional descriptive conventions; multiple candidates mean a boundary, not a change in the person.',
    hand ? 'Palm lines are reader-supplied, not detected. Mount fullness is not measured by the 21 skeletal joints. Thumb angle and finger spread depend on pose.'
      : 'The upper face starts at the tracked forehead outline, not a detected hairline. Expression, perspective and lighting can change estimates.',
  ] }
}
function near(value: number, boundaries: number[], margin: number) { return boundaries.some(b => Math.abs(value-b) <= margin+1e-9) }

export function captureFace(frames: LandmarkFrame[]) {
  const f = faceFeatures(stableLandmarks(frames,false))
  const resolved = resolveFace({...f,measurement:measurement([],false)})
  const ideals = [1,0.333,0.42,0.62,0.78,1.15,1,0.86]
  const tolerances = [0.15,0.08,0.18,0.15,0.12,0.15,0.06,0.08]
  const palaces = f.palaces.map((p,i) => ({...p, state: near(p.value,[ideals[i]*(1-tolerances[i]),ideals[i]*(1+tolerances[i])],ideals[i]*0.035) ? 'uncertain' : p.state}))
  const strongPalaces = palaces.map((p,i)=>({...p,excess:p.value/ideals[i]-1})).filter(p=>p.state==='generous')
    .sort((a,b)=>b.excess-a.excess || (a.palace < b.palace ? -1 : 1)).slice(0,2).map(p=>p.palace)
  return {...resolved,
    courts:f.courts.map(c=>({...c,share:q(c.share),state:near(c.share,[0.3,0.36],0.01)?'uncertain':c.state})),
    palaces,strongPalaces}
}

export function capturePalm(frames: LandmarkFrame[], lines: LineTraits) {
  // Missing or unrecognised manual observations remain unknown, not invented.
  const choices = {heart:['index','middle','between'], head:['straight','curved'], life:['wide','close'], fate:['present','absent']}
  lines = Object.fromEntries(Object.entries(choices).map(([key, values]) => [key,
    values.includes(lines?.[key as keyof LineTraits]) ? lines[key as keyof LineTraits] : 'unsure'])) as unknown as LineTraits
  const f = palmFeatures(stableLandmarks(frames,true),lines)
  const candidates = []
  for (const w of [-0.035,0.035]) for (const l of [-0.035,0.035]) {
    candidates.push(q(f.palmRatio)+w >= 0.86 ? (q(f.fingerRatio)+l >= 0.78?'air':'earth') : (q(f.fingerRatio)+l >= 0.78?'water':'fire'))
  }
  const m=measurement(candidates,true)
  const norms=[0.9,1,0.93,0.72]
  return {...f, shape:m.typeCandidates.length===1 ? m.typeCandidates[0] : 'mixed',
    palmLength:q(f.palmLength),palmWidth:q(f.palmWidth),fingerLength:q(f.fingerLength),palmRatio:q(f.palmRatio),
    fingerRatio:q(f.fingerRatio),indexToRing:q(f.indexToRing),thumbSpread:q(f.thumbSpread),thumbAngle:q(f.thumbAngle,5),
    fingers:f.fingers.map((finger,i)=>({...finger,length:i!==1 && near(finger.ratioToSaturn,[norms[i]*0.96,norms[i]*1.04],0.015)?'uncertain':finger.length})),
    palaces:[],strongPalaces:[],measurement:m}
}

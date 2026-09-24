/** Native five-form silhouette classification.
 * Classical shape vocabulary: 太清神鑑, 卷4, 五形. The numerical templates
 * are this app's explicit approximation, not numbers claimed from that text.
 * No colour, body build, personality or fortune is estimated from a face.
 */
import type { FaceElement } from './face'

export interface FaceRatios { heightRatio: number; jawRatio: number; foreheadRatio: number }
export interface FaceClassification {
  version: number
  method: string
  primary: FaceElement
  basis: FaceRatios
  form: string
  theme: string
  reflection: string
}

// Fixed order also resolves an exact numerical tie reproducibly.
const FORMS: { element: FaceElement; centre: number[]; form: string; theme: string; reflection: string }[] = [
  { element:'wood', centre:[1.55,0.72,0.85], form:'Longer, narrower outline',
    theme:'Wood: growth and the bending/straightening of a living branch (木曰曲直).',
    reflection:'Choose one thing you want to develop and give it ten undistracted minutes.' },
  { element:'fire', centre:[1.35,0.95,0.80], form:'Narrower above, broader at the jaw',
    theme:'Fire: light and upward movement (火曰炎上).',
    reflection:'Choose one small thing you want to move forward and make its first step visible today.' },
  { element:'earth', centre:[1.25,0.98,0.97], form:'Broad, compact outline with a broad jaw',
    theme:'Earth: cultivation and supporting what is growing (土爰稼穡).',
    reflection:'Tend one everyday foundation: prepare a useful space or finish a small maintenance task.' },
  { element:'metal', centre:[1.35,0.88,0.90], form:'More balanced upper and lower widths, tending toward a square outline',
    theme:'Metal: shaping and refining a material (金曰從革).',
    reflection:'Give one task a clear finishing standard, then remove one unnecessary step.' },
  { element:'water', centre:[1.15,0.80,0.89], form:'Shorter, rounder outline with a narrower jaw',
    theme:'Water: flow and finding a route around an obstacle (水曰潤下).',
    reflection:'For one task, try an easier route or a smaller first step instead of adding more effort.' },
]
const band = (n: number) => Math.round(n / 0.05) / 20
export function classifyFaceShape(ratios: FaceRatios): FaceClassification {
  const raw = [ratios.heightRatio,ratios.jawRatio,ratios.foreheadRatio]
  if (raw.some(v=>!Number.isFinite(v)||v<=0||v>4)) throw new Error('vision.incomplete')
  // Modest capture variation should not create a new silhouette. The exact
  // measurements remain visible; only classification uses these 0.05 bands.
  const values=raw.map(band), scales=[0.20,0.12,0.10]
  const distance=(centre:number[])=>values.reduce((sum,v,i)=>sum+((v-centre[i])/scales[i])**2,0)
  let chosen=FORMS[0], best=distance(chosen.centre)
  for(const form of FORMS.slice(1)) {
    const score=distance(form.centre)
    if(score<best-1e-10) {chosen=form;best=score}
  }
  return {version:1,method:'five-form-outline-v1',primary:chosen.element,
    basis:{heightRatio:values[0],jawRatio:values[1],foreheadRatio:values[2]},
    form:chosen.form,theme:chosen.theme,reflection:chosen.reflection}
}

export const FACE_MEASUREMENT_NOTES = [
  'Eight-frame measurement of visible proportions. The tracked upper outline is a forehead reference, not a detected hairline.',
  'classification.primary is the resolved silhouette; use that one result. The supplied element theme is a playful reflection prompt, not a discovered personal trait.',
]
/** Reclassify a saved native capture without changing any measured numbers. */
export function resolveFace<T extends FaceRatios & {measurement?:{version:number; samples:number; typeCandidates:string[]; limitations:string[]}}>(face: T) {
  const classification=classifyFaceShape(face)
  return {...face,element:classification.primary,classification,
    ...(face.measurement ? {measurement:{...face.measurement,typeCandidates:[classification.primary],limitations:FACE_MEASUREMENT_NOTES}} : {})}
}

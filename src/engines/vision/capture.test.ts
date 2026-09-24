import { describe, expect, it } from 'vitest'
import { captureFace, capturePalm, type LandmarkFrame } from './capture'
import { face, hand } from './fixtures'
import type { Point } from '../face/face'
import type { LineTraits } from '../palm/palm'
import { evaluate } from '../../engine-bridge'
const lines: LineTraits={heart:'between',head:'curved',life:'wide',fate:'unsure'}
function frames(points: Point[], options: {width?:number;height?:number;angle?:number;scale?:number;mirror?:boolean;noise?:number;phase?:number}={}): LandmarkFrame[] {
  const {width=640,height=480,angle=0,scale=350,mirror=false,noise=0,phase=0}=options
  return Array.from({length:12},(_,f)=>({width,height,timestamp:f*100,landmarks:points.map((p,i)=>{
    const a=angle*Math.PI/180,x=(p.x-.5)*scale*(mirror?-1:1),y=(p.y-.5)*scale
    return {x:(width/2+x*Math.cos(a)-y*Math.sin(a)+Math.sin((f+phase)*13+i)*noise)/width,
      y:(height/2+x*Math.sin(a)+y*Math.cos(a)+Math.cos((f+phase)*7+i)*noise)/height,z:(p.z??0)*scale/width}
  })}))
}
describe('native stable vision capture',()=>{
  it('is deterministic and invariant to frame aspect ratio, roll, mirror, scale and translation',()=>{
    const expected=captureFace(frames(face()))
    for(const width of [480,640,960]) for(const angle of [-20,0,20]) for(const mirror of [false,true]) {
      const result=captureFace(frames(face(),{width,height:640,angle,mirror}))
      expect(result).toEqual(expected)
    }
    expect(captureFace(frames(face(),{scale:300}))).toEqual(expected)
    expect(captureFace(frames(face()))).toEqual(expected)
    expect(expected.heightRatio).toBe(1.4)
  })
  it('preserves hand proportions and never invents mount surface measurements',()=>{
    const expected=capturePalm(frames(hand()),lines)
    for(const angle of [-25,0,25]) for(const width of [480,640]) {
      const f=capturePalm(frames(hand(),{width,height:640,angle}),lines)
      expect(f).toEqual(expected)
    }
    expect(expected.palmRatio).toBe(.9)
    expect(expected.fingerRatio).toBe(.85)
    expect(expected.palaces).toEqual([])
    expect(expected.strongPalaces).toEqual([])
    expect(expected.lines).toEqual(lines)
  })
  it('keeps unobserved palm lines unknown',()=>{
    const unknown={heart:'unsure',head:'unsure',life:'unsure',fate:'unsure'} as const
    expect(capturePalm(frames(hand()),unknown).lines).toEqual(unknown)
    expect(evaluate('palm.capture',{frames:frames(hand()),lines:{}}).data).toMatchObject({lines:unknown})
  })
  it('keeps same categories across 100 independently perturbed bursts',()=>{
    const clearFace=face({height:.54})
    const clearHand=hand().map(p=>({...p,x:.5+(p.x-.5)*1.12}))
    const reference=captureFace(frames(clearFace))
    const palm=capturePalm(frames(clearHand),lines)
    for(let phase=0;phase<100;phase++) {
      const f=captureFace(frames(clearFace,{noise:1,phase}))
      expect(f.element).toBe(reference.element)
      expect(Math.abs(f.heightRatio-reference.heightRatio)).toBeLessThanOrEqual(.01)
      expect(f.measurement.typeCandidates).toEqual(reference.measurement.typeCandidates)
      expect(capturePalm(frames(clearHand,{noise:.7,phase}),lines).shape).toBe(palm.shape)
    }
  })
  it('reports a boundary instead of choosing incompatible definite categories',()=>{
    for(const height of [.578,.58,.582]) {
      const f=captureFace(frames(face({height})))
      expect(f.element).toBe('mixed');expect(f.measurement.typeCandidates).toEqual(['metal','wood'])
    }
    const p=hand().map(p=>({...p,x:.5+(p.x-.5)*(.86/.9)}))
    const result=capturePalm(frames(p),lines)
    expect(result.shape).toBe('mixed');expect(result.measurement.typeCandidates).toEqual(['air','water'])
  })
  it('rejects missing, invalid, duplicate, too-short, old, and cropped captures',()=>{
    const good=frames(face())
    expect(()=>captureFace(good.slice(0,1))).toThrow('vision.hold')
    expect(()=>captureFace(good.map(f=>({...f,timestamp:1})))).toThrow('vision.hold')
    expect(()=>captureFace(good.map(f=>({...f,timestamp:f.timestamp/10})))).toThrow('vision.hold')
    expect(()=>captureFace(good.map(f=>({...f,timestamp:f.timestamp*10})))).toThrow('vision.hold')
    expect(()=>captureFace(frames(face(),{scale:150}))).toThrow('vision.closer')
    good[11].landmarks[10].x=NaN
    expect(()=>captureFace(good)).toThrow('vision.incomplete')
    good[11].landmarks[10].x=0
    expect(()=>captureFace(good)).toThrow('vision.frame')
  })
  it('rejects turned faces, open mouths, tilted palms, bent fingers, and moving shapes',()=>{
    const turned=face();turned[234].z=.2
    expect(()=>captureFace(frames(turned))).toThrow('vision.facePose')
    const mouth=face();mouth[13].y=.6;mouth[14].y=.7
    expect(()=>captureFace(frames(mouth))).toThrow('vision.facePose')
    const tilted=hand().map(p=>({...p,z:p.x-.5}))
    expect(()=>capturePalm(frames(tilted),lines)).toThrow('vision.palmPose')
    const bent=hand();bent[8].y=.49
    expect(()=>capturePalm(frames(bent),lines)).toThrow('vision.palmPose')
    const moving=frames(face(),{noise:15})
    moving.forEach(f=>{f.landmarks[14]={...f.landmarks[13]}})
    expect(()=>captureFace(moving)).toThrow('vision.steady')
  })
  it('ignores one tracking spike without passing a changed latest pose',()=>{
    const good=frames(face()),spike=frames(face({eyeWidth:.04}))
    good[5]=spike[5]
    expect(captureFace(good)).toEqual(captureFace(frames(face())))
    good[11]=spike[11]
    expect(()=>captureFace(good)).toThrow('vision.steady')
  })
  it('exposes capture failures through the native bridge as recoverable data',()=>{
    expect(evaluate('face.capture',{frames:[]})).toMatchObject({ok:false,error:'vision.hold'})
    expect(evaluate('palm.capture',{frames:frames(hand()),lines})).toMatchObject({ok:true,data:{shape:'air',measurement:{version:2,samples:8}}})
  })
})

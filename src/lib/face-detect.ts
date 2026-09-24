import { ensureVisionSupport } from './vision-support'
import type { Point } from '../engines/face/face'

/** Runs MediaPipe Face Landmarker on an image element, entirely on the device. */
export async function detectFace(image: HTMLImageElement): Promise<Point[] | null> {
  ensureVisionSupport()
  const vision = await import('@mediapipe/tasks-vision')
  const base = `${import.meta.env.BASE_URL}mediapipe`
  const fileset = await vision.FilesetResolver.forVisionTasks(base)
  const landmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: `${import.meta.env.BASE_URL}models/face_landmarker.task` },
    runningMode: 'IMAGE',
    numFaces: 1,
  })
  try {
    const result = landmarker.detect(image)
    const face = result.faceLandmarks[0]
    return face ? face.map((p) => ({ x: p.x, y: p.y, z: p.z })) : null
  } finally {
    landmarker.close()
  }
}

import type { Point } from '../engines/palm/palm'

/** Runs MediaPipe Hand Landmarker on an image element, entirely on the device. */
export async function detectHand(image: HTMLImageElement): Promise<Point[] | null> {
  const vision = await import('@mediapipe/tasks-vision')
  const base = `${import.meta.env.BASE_URL}mediapipe`
  const fileset = await vision.FilesetResolver.forVisionTasks(base)
  const landmarker = await vision.HandLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: `${import.meta.env.BASE_URL}models/hand_landmarker.task` },
    runningMode: 'IMAGE',
    numHands: 1,
  })
  try {
    const result = landmarker.detect(image)
    const hand = result.landmarks[0]
    return hand ? hand.map((p) => ({ x: p.x, y: p.y, z: p.z })) : null
  } finally {
    landmarker.close()
  }
}

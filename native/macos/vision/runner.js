import { FaceLandmarker, HandLandmarker } from '@mediapipe/tasks-vision'

// Computation only: the preview and every control are native SwiftUI/AppKit.
// Bundled models/Wasm, no network, no storage, one frame in flight.
const errors = []
const logError = console.error.bind(console)
console.error = (...args) => { errors.push(args.map(String).join(' ')); logError(...args) }
let detector
const canvas = document.createElement('canvas')
const context = canvas.getContext('2d', { willReadFrequently: true })
window.oracleVision = {
  async initialize(kind) {
    detector?.close()
    const options = {
      baseOptions: { modelAssetPath: `${kind}_landmarker.task`, delegate: 'CPU' },
      runningMode: 'VIDEO', minTrackingConfidence: 0.7,
    }
    const files = {
      wasmLoaderPath: 'vision_wasm_internal.js',
      wasmBinaryPath: 'vision_wasm_internal.wasm',
    }
    try { detector = kind === 'face'
      ? await FaceLandmarker.createFromOptions(files, {
        ...options, numFaces: 1, minFaceDetectionConfidence: 0.7, minFacePresenceConfidence: 0.7,
      })
      : await HandLandmarker.createFromOptions(files, {
        ...options, numHands: 1, minHandDetectionConfidence: 0.7, minHandPresenceConfidence: 0.7,
      })
    } catch (error) { throw new Error(`${error}: ${errors.slice(-4).join('; ')}`) }
    return true
  },
  async detect(jpeg, timestamp) {
    const image = new Image()
    image.src = `data:image/jpeg;base64,${jpeg}`
    await image.decode()
    canvas.width = image.width
    canvas.height = image.height
    context.drawImage(image, 0, 0)
    const result = detector.detectForVideo(canvas, timestamp)
    return (result.faceLandmarks ?? result.landmarks)[0] ?? []
  },
}

/** MediaPipe needs WebGL for image transfer even when inference uses the CPU. */
export function ensureVisionSupport(): void {
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
  if (!gl) throw new Error('On-device image analysis is unavailable in this browser')
  gl.getExtension('WEBGL_lose_context')?.loseContext()
}

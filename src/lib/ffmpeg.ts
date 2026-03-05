import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL } from '@ffmpeg/util'

let ffmpegInstance: FFmpeg | null = null
let loadingPromise: Promise<FFmpeg> | null = null

const BASE_URL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm'

export async function getFFmpeg(onLog?: (message: string) => void, onProgress?: (progress: number) => void) {
  if (ffmpegInstance) {
    if (onLog) ffmpegInstance.on('log', ({ message }) => onLog(message))
    if (onProgress) ffmpegInstance.on('progress', ({ progress }) => onProgress(progress))
    return ffmpegInstance
  }

  if (!loadingPromise) {
    loadingPromise = (async () => {
      const ffmpeg = new FFmpeg()
      await ffmpeg.load({
        coreURL: await toBlobURL(`${BASE_URL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${BASE_URL}/ffmpeg-core.wasm`, 'application/wasm'),
      })
      ffmpegInstance = ffmpeg
      return ffmpeg
    })()
  }

  const ffmpeg = await loadingPromise
  if (onLog) ffmpeg.on('log', ({ message }) => onLog(message))
  if (onProgress) ffmpeg.on('progress', ({ progress }) => onProgress(progress))
  return ffmpeg
}

export async function resetFFmpeg() {
  if (ffmpegInstance) {
    try {
      ffmpegInstance.terminate()
    } catch {
      // ignore
    }
  }
  ffmpegInstance = null
  loadingPromise = null
}

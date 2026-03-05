import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL } from '@ffmpeg/util'

let ffmpegInstance: FFmpeg | null = null
let loadingPromise: Promise<FFmpeg> | null = null

const BASE_URL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm'

export async function getFFmpeg(onLog?: (message: string) => void) {
  if (ffmpegInstance) {
    if (onLog) ffmpegInstance.on('log', ({ message }) => onLog(message))
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
  return ffmpeg
}

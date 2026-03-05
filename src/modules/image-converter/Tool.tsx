import { useMemo, useState } from 'react'
import { fetchFile } from '@ffmpeg/util'
import { getFFmpeg } from '../../lib/ffmpeg'

const targets = ['png', 'jpg', 'webp', 'bmp', 'tiff', 'gif'] as const

const mimeByFormat: Record<(typeof targets)[number], string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  bmp: 'image/bmp',
  tiff: 'image/tiff',
  gif: 'image/gif',
}

export default function Tool() {
  const [file, setFile] = useState<File | null>(null)
  const [format, setFormat] = useState<(typeof targets)[number]>('png')
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState('')
  const [error, setError] = useState('')
  const [downloadUrl, setDownloadUrl] = useState('')

  const outputName = useMemo(() => {
    if (!file) return `converted.${format}`
    return file.name.replace(/\.[^.]+$/, `.${format}`)
  }, [file, format])

  async function convert() {
    if (!file) return
    setBusy(true)
    setError('')
    setLog('Loading FFmpeg...')

    try {
      const ffmpeg = await getFFmpeg((message) => setLog(message))
      const input = `input-${Date.now()}-${file.name}`
      const output = `output-${Date.now()}.${format}`

      await ffmpeg.writeFile(input, await fetchFile(file))
      await ffmpeg.exec(['-i', input, output])

      const data = await ffmpeg.readFile(output)
      const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data))
      const safeBytes = Uint8Array.from(bytes)
      const blob = new Blob([safeBytes.buffer], { type: mimeByFormat[format] })

      if (downloadUrl) URL.revokeObjectURL(downloadUrl)
      setDownloadUrl(URL.createObjectURL(blob))

      await ffmpeg.deleteFile(input)
      await ffmpeg.deleteFile(output)
      setLog('Done')
    } catch (e: any) {
      setError(e?.message ?? 'Image conversion failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="toolPage">
      <h2>Image Converter</h2>
      <p>Runs fully client-side with FFmpeg WebAssembly.</p>
      <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />

      <label>
        Output format
        <select value={format} onChange={(e) => setFormat(e.target.value as (typeof targets)[number])}>
          {targets.map((target) => (
            <option key={target} value={target}>{target.toUpperCase()}</option>
          ))}
        </select>
      </label>

      <button onClick={convert} disabled={!file || busy}>{busy ? 'Converting...' : 'Convert image'}</button>

      {log && <p>{log}</p>}
      {error && <p>{error}</p>}
      {downloadUrl && <a className="openBtn" href={downloadUrl} download={outputName}>Download {outputName}</a>}
    </div>
  )
}

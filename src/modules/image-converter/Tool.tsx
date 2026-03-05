import { useMemo, useRef, useState } from 'react'
import { fetchFile } from '@ffmpeg/util'
import { getFFmpeg, resetFFmpeg } from '../../lib/ffmpeg'

const targets = ['png', 'jpg', 'webp', 'bmp', 'tiff', 'gif'] as const

const mimeByFormat: Record<(typeof targets)[number], string> = {
  png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', bmp: 'image/bmp', tiff: 'image/tiff', gif: 'image/gif',
}

const infoByFormat: Record<(typeof targets)[number], string> = {
  png: 'Empfohlen für scharfe Grafiken/Transparenz.',
  jpg: 'Empfohlen für Fotos mit kleinerer Dateigröße.',
  webp: 'Sehr gute Kompression, moderne Browser-Unterstützung.',
  bmp: 'Unkomprimiert, sehr groß, selten nötig.',
  tiff: 'Hochwertig/archivfähig, große Dateien.',
  gif: 'Animation möglich, aber ineffizient bei Farben/Größe.',
}

type OutputItem = { name: string; url: string }

export default function Tool() {
  const [files, setFiles] = useState<File[]>([])
  const [format, setFormat] = useState<(typeof targets)[number]>('png')
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState('')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const [outputs, setOutputs] = useState<OutputItem[]>([])
  const cancelledRef = useRef(false)

  const queueHint = useMemo(() => files.length > 1 ? `${files.length} Dateien in Queue` : files.length === 1 ? '1 Datei in Queue' : 'Keine Datei gewählt', [files.length])

  async function convertQueue() {
    if (!files.length) return
    setBusy(true)
    setError('')
    setOutputs([])
    cancelledRef.current = false

    try {
      const ffmpeg = await getFFmpeg((message) => setLog(message), (p) => setProgress(Math.round(p * 100)))
      const out: OutputItem[] = []

      for (let i = 0; i < files.length; i++) {
        if (cancelledRef.current) break
        const file = files[i]
        setLog(`Converting ${i + 1}/${files.length}: ${file.name}`)
        const input = `input-${Date.now()}-${i}-${file.name}`
        const base = file.name.replace(/\.[^.]+$/, '')
        const output = `output-${Date.now()}-${i}.${format}`

        await ffmpeg.writeFile(input, await fetchFile(file))
        await ffmpeg.exec(['-i', input, output])
        const data = await ffmpeg.readFile(output)
        const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data))
        const blob = new Blob([Uint8Array.from(bytes).buffer], { type: mimeByFormat[format] })
        out.push({ name: `${base}.${format}`, url: URL.createObjectURL(blob) })
        await ffmpeg.deleteFile(input)
        await ffmpeg.deleteFile(output)
      }

      setOutputs(out)
      setLog(cancelledRef.current ? 'Cancelled' : 'Done')
    } catch (e: any) {
      setError(e?.message ?? 'Image conversion failed')
    } finally {
      setBusy(false)
      setProgress(0)
    }
  }

  async function cancel() {
    cancelledRef.current = true
    await resetFFmpeg()
    setBusy(false)
    setLog('Cancelled and FFmpeg reset')
  }

  return (
    <div className="toolPage">
      <h2>Image Converter</h2>
      <p>Runs fully client-side with FFmpeg WebAssembly.</p>
      <input type="file" accept="image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
      <p>{queueHint}</p>

      <label>
        Output format
        <select value={format} onChange={(e) => setFormat(e.target.value as (typeof targets)[number])}>
          {targets.map((target) => <option key={target} value={target}>{target.toUpperCase()}</option>)}
        </select>
      </label>
      <p>{infoByFormat[format]}</p>

      <div className="row">
        <button onClick={convertQueue} disabled={!files.length || busy}>{busy ? 'Converting...' : 'Convert queue'}</button>
        {busy && <button onClick={() => void cancel()}>Cancel</button>}
      </div>

      {busy && <p>Progress: {progress}%</p>}
      {log && <p>{log}</p>}
      {error && <p>{error}</p>}

      {outputs.map((item) => (
        <a key={item.name + item.url} className="openBtn" href={item.url} download={item.name}>Download {item.name}</a>
      ))}
    </div>
  )
}

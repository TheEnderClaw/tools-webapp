import { useMemo, useState } from 'react'

const formats = ['image/png', 'image/jpeg', 'image/webp'] as const

export default function Tool() {
  const [file, setFile] = useState<File | null>(null)
  const [targetFormat, setTargetFormat] = useState<(typeof formats)[number]>('image/png')
  const [quality, setQuality] = useState(0.9)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [downloadUrl, setDownloadUrl] = useState('')

  const targetExt = useMemo(() => targetFormat.split('/')[1], [targetFormat])

  async function convert() {
    if (!file) return
    setBusy(true)
    setError('')

    try {
      const img = await loadImage(file)
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas context unavailable')
      ctx.drawImage(img, 0, 0)

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, targetFormat, targetFormat === 'image/png' ? undefined : quality)
      })

      if (!blob) throw new Error('Conversion failed')
      if (downloadUrl) URL.revokeObjectURL(downloadUrl)
      setDownloadUrl(URL.createObjectURL(blob))
    } catch (e: any) {
      setError(e?.message ?? 'Conversion failed')
    } finally {
      setBusy(false)
    }
  }

  const outputName = file ? file.name.replace(/\.[^.]+$/, `.${targetExt}`) : `converted.${targetExt}`

  return (
    <div className="toolPage">
      <h2>Image Converter</h2>
      <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />

      <label>
        Format
        <select value={targetFormat} onChange={(e) => setTargetFormat(e.target.value as (typeof formats)[number])}>
          {formats.map((format) => (
            <option key={format} value={format}>{format}</option>
          ))}
        </select>
      </label>

      {targetFormat !== 'image/png' && (
        <label>
          Quality ({Math.round(quality * 100)}%)
          <input type="range" min={0.1} max={1} step={0.1} value={quality} onChange={(e) => setQuality(Number(e.target.value))} />
        </label>
      )}

      <button onClick={convert} disabled={!file || busy}>{busy ? 'Converting...' : 'Convert image'}</button>

      {error && <p>{error}</p>}
      {downloadUrl && (
        <a className="openBtn" href={downloadUrl} download={outputName}>Download {outputName}</a>
      )}
    </div>
  )
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not load image'))
    }
    img.src = url
  })
}

import { useEffect, useMemo, useRef, useState } from 'react'
import JSZip from 'jszip'
import './Tool.css'

type OutputFormat = 'png' | 'jpg' | 'webp'

type ImageItem = {
  id: number
  file: File
  url: string
  name: string
  width: number
  height: number
}

type LensSample = {
  r: number
  g: number
  b: number
  a: number
  valid: boolean
}

type DualFisheyeOptions = {
  sourceUrl: string
  outputWidth: number
  yawOffsetDeg: number
  lensFovDeg: number
  seamBlendDeg: number
  lensCircleScale: number
  flipBackLens: boolean
  format: OutputFormat
  quality: number
  baseName: string
  onProgress: (value: number) => void
}

const DEG_TO_RAD = Math.PI / 180
const MAX_OUTPUT_WIDTH = 8192

const formatMime: Record<OutputFormat, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function getBaseName(name: string) {
  return name.replace(/\.[^.]+$/, '')
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Image could not be loaded.'))
    image.src = url
  })
}

function smoothstep01(t: number) {
  const clamped = clamp(t, 0, 1)
  return clamped * clamped * (3 - 2 * clamped)
}

function sampleDualFisheye(
  imagePixels: Uint8ClampedArray,
  imageWidth: number,
  imageHeight: number,
  dirX: number,
  dirY: number,
  dirZ: number,
  useBackLens: boolean,
  lensCircleScale: number,
  lensHalfFovRad: number,
  flipBackLens: boolean,
): LensSample {
  const halfWidth = imageWidth / 2
  const centerX = useBackLens ? halfWidth + halfWidth / 2 : halfWidth / 2
  const centerY = imageHeight / 2
  const radius = Math.min(halfWidth / 2, imageHeight / 2) * lensCircleScale

  // Left lens is assumed to point forward (+Z), right lens backward (-Z).
  const localX = useBackLens ? -dirX : dirX
  const localY = -dirY
  const localZ = useBackLens ? -dirZ : dirZ

  if (localZ <= -1) {
    return { r: 0, g: 0, b: 0, a: 0, valid: false }
  }

  const theta = Math.acos(clamp(localZ, -1, 1))
  if (theta > lensHalfFovRad) {
    return { r: 0, g: 0, b: 0, a: 0, valid: false }
  }

  const radialRatio = theta / lensHalfFovRad
  let angle = Math.atan2(localY, localX)
  if (useBackLens && flipBackLens) {
    angle = Math.PI - angle
  }

  const srcX = Math.round(centerX + Math.cos(angle) * radialRatio * radius)
  const srcY = Math.round(centerY + Math.sin(angle) * radialRatio * radius)

  if (srcX < 0 || srcX >= imageWidth || srcY < 0 || srcY >= imageHeight) {
    return { r: 0, g: 0, b: 0, a: 0, valid: false }
  }

  const pixelIndex = (srcY * imageWidth + srcX) * 4
  return {
    r: imagePixels[pixelIndex],
    g: imagePixels[pixelIndex + 1],
    b: imagePixels[pixelIndex + 2],
    a: imagePixels[pixelIndex + 3],
    valid: true,
  }
}

async function exportDualFisheyeToPanorama(options: DualFisheyeOptions): Promise<Blob> {
  const {
    sourceUrl,
    outputWidth,
    yawOffsetDeg,
    lensFovDeg,
    seamBlendDeg,
    lensCircleScale,
    flipBackLens,
    format,
    quality,
    onProgress,
  } = options

  const image = await loadImage(sourceUrl)

  const sourceCanvas = document.createElement('canvas')
  sourceCanvas.width = image.width
  sourceCanvas.height = image.height
  const sourceContext = sourceCanvas.getContext('2d')
  if (!sourceContext) throw new Error('Could not initialize source canvas.')
  sourceContext.drawImage(image, 0, 0)

  const sourceData = sourceContext.getImageData(0, 0, image.width, image.height)

  const outputHeight = Math.max(64, Math.round(outputWidth / 2))
  const outputCanvas = document.createElement('canvas')
  outputCanvas.width = outputWidth
  outputCanvas.height = outputHeight
  const outputContext = outputCanvas.getContext('2d')
  if (!outputContext) throw new Error('Could not initialize output canvas.')

  const outputImage = outputContext.createImageData(outputWidth, outputHeight)
  const outPixels = outputImage.data

  const lensHalfFovRad = clamp(lensFovDeg, 120, 235) * DEG_TO_RAD * 0.5
  const seamBlendRad = clamp(seamBlendDeg, 0, 45) * DEG_TO_RAD
  const yawOffsetRad = yawOffsetDeg * DEG_TO_RAD
  const rowYield = 24

  for (let y = 0; y < outputHeight; y++) {
    const v = (y + 0.5) / outputHeight
    const lat = (0.5 - v) * Math.PI
    const cosLat = Math.cos(lat)
    const sinLat = Math.sin(lat)

    for (let x = 0; x < outputWidth; x++) {
      const u = (x + 0.5) / outputWidth
      const lon = (u * 2 - 1) * Math.PI + yawOffsetRad
      const cosLon = Math.cos(lon)
      const sinLon = Math.sin(lon)

      const dirX = cosLat * sinLon
      const dirY = sinLat
      const dirZ = cosLat * cosLon

      const front = sampleDualFisheye(
        sourceData.data,
        image.width,
        image.height,
        dirX,
        dirY,
        dirZ,
        false,
        lensCircleScale,
        lensHalfFovRad,
        flipBackLens,
      )

      const back = sampleDualFisheye(
        sourceData.data,
        image.width,
        image.height,
        dirX,
        dirY,
        dirZ,
        true,
        lensCircleScale,
        lensHalfFovRad,
        flipBackLens,
      )

      const index = (y * outputWidth + x) * 4
      const seamAngle = Math.abs(Math.atan2(dirX, dirZ))

      if (front.valid && back.valid && seamBlendRad > 0) {
        const edgeDistance = Math.abs(seamAngle - Math.PI / 2)
        const blendT = smoothstep01(clamp(edgeDistance / seamBlendRad, 0, 1))
        outPixels[index] = Math.round(front.r * blendT + back.r * (1 - blendT))
        outPixels[index + 1] = Math.round(front.g * blendT + back.g * (1 - blendT))
        outPixels[index + 2] = Math.round(front.b * blendT + back.b * (1 - blendT))
        outPixels[index + 3] = 255
      } else if (front.valid) {
        outPixels[index] = front.r
        outPixels[index + 1] = front.g
        outPixels[index + 2] = front.b
        outPixels[index + 3] = 255
      } else if (back.valid) {
        outPixels[index] = back.r
        outPixels[index + 1] = back.g
        outPixels[index + 2] = back.b
        outPixels[index + 3] = 255
      } else {
        outPixels[index] = 0
        outPixels[index + 1] = 0
        outPixels[index + 2] = 0
        outPixels[index + 3] = 255
      }
    }

    if (y % rowYield === 0 || y === outputHeight - 1) {
      onProgress(Math.round(((y + 1) / outputHeight) * 100))
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve())
      })
    }
  }

  outputContext.putImageData(outputImage, 0, 0)

  const blob = await new Promise<Blob | null>((resolve) => {
    const outputQuality = format === 'png' ? undefined : quality / 100
    outputCanvas.toBlob((value) => resolve(value), formatMime[format], outputQuality)
  })

  if (!blob) {
    throw new Error('Could not export image.')
  }

  return blob
}

function getUrlParams() {
  const readNumber = (params: URLSearchParams, key: string) => {
    const raw = params.get(key)
    if (raw === null || raw.trim() === '') return null
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : null
  }

  const hashQuery = window.location.hash.includes('?') ? window.location.hash.split('?')[1] ?? '' : ''
  const searchQuery = window.location.search.startsWith('?') ? window.location.search.slice(1) : window.location.search
  const params = new URLSearchParams(hashQuery || searchQuery)
  const autoMaxRaw = params.get('autoMaxOutputWidth')
  const outputWidthRaw = readNumber(params, 'outputWidth')
  const previewScaleRaw = readNumber(params, 'previewScale')
  const lensFovRaw = readNumber(params, 'lensFov')
  const yawOffsetRaw = readNumber(params, 'yawOffset')
  const seamBlendRaw = readNumber(params, 'seamBlend')
  const lensCircleScaleRaw = readNumber(params, 'lensCircleScale')
  const qualityRaw = readNumber(params, 'quality')

  const autoMaxOutputWidth = autoMaxRaw === null ? true : autoMaxRaw !== '0'
  const outputWidthManual = outputWidthRaw !== null ? clamp(outputWidthRaw, 512, MAX_OUTPUT_WIDTH) : null
  const formatRaw = params.get('format')
  const format: OutputFormat = formatRaw === 'png' || formatRaw === 'jpg' || formatRaw === 'webp' ? formatRaw : 'jpg'

  return {
    autoMaxOutputWidth,
    outputWidthManual,
    previewScalePercent: previewScaleRaw !== null ? clamp(previewScaleRaw, 5, 100) : 25,
    lensFov: lensFovRaw !== null ? clamp(lensFovRaw, 160, 230) : 190,
    yawOffset: yawOffsetRaw !== null ? clamp(yawOffsetRaw, -180, 180) : 0,
    seamBlend: seamBlendRaw !== null ? clamp(seamBlendRaw, 0, 30) : 10,
    lensCircleScale: lensCircleScaleRaw !== null ? clamp(lensCircleScaleRaw, 0.85, 1.05) : 1,
    flipBackLens: params.get('flipBackLens') !== '0',
    format,
    quality: qualityRaw !== null ? clamp(qualityRaw, 50, 100) : 92,
    livePreviewEnabled: params.get('livePreview') === '1',
  }
}

export default function Tool() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const [images, setImages] = useState<ImageItem[]>([])
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null)

  const urlParams = getUrlParams()
  const [autoMaxOutputWidth, setAutoMaxOutputWidth] = useState(urlParams.autoMaxOutputWidth)
  const [outputWidthManual, setOutputWidthManual] = useState(urlParams.outputWidthManual ?? 4096)
  const [lensFovDeg, setLensFovDeg] = useState(urlParams.lensFov)
  const [yawOffsetDeg, setYawOffsetDeg] = useState(urlParams.yawOffset)
  const [seamBlendDeg, setSeamBlendDeg] = useState(urlParams.seamBlend)
  const [lensCircleScale, setLensCircleScale] = useState(urlParams.lensCircleScale)
  const [flipBackLens, setFlipBackLens] = useState(urlParams.flipBackLens)
  const [format, setFormat] = useState<OutputFormat>(urlParams.format)
  const [quality, setQuality] = useState(urlParams.quality)

  const [livePreviewEnabled, setLivePreviewEnabled] = useState(urlParams.livePreviewEnabled)
  const [previewScalePercent, setPreviewScalePercent] = useState(urlParams.previewScalePercent)
  const [liveProgress, setLiveProgress] = useState(0)
  const [liveProcessing, setLiveProcessing] = useState(false)

  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [copyFeedback, setCopyFeedback] = useState('')
  const [draggingFiles, setDraggingFiles] = useState(false)
  const [error, setError] = useState('')

  const selectedImage = useMemo(() => images.find((img) => img.id === selectedImageId), [images, selectedImageId])
  const getAutoOutputWidthFromImage = (image: ImageItem | undefined) =>
    clamp(Math.round(image?.width ?? MAX_OUTPUT_WIDTH), 512, MAX_OUTPUT_WIDTH)
  const selectedAutoOutputWidth = getAutoOutputWidthFromImage(selectedImage)
  const effectiveOutputWidth = autoMaxOutputWidth
    ? selectedAutoOutputWidth
    : clamp(Number(outputWidthManual) || 512, 512, MAX_OUTPUT_WIDTH)

  useEffect(() => {
    if (images.length > 0 && !selectedImageId) {
      setSelectedImageId(images[0].id)
    }
  }, [images, selectedImageId])

  useEffect(() => {
    let dragDepth = 0

    const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes('Files')

    const onDragEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return
      event.preventDefault()
      dragDepth += 1
      setDraggingFiles(true)
    }

    const onDragOver = (event: DragEvent) => {
      if (!hasFiles(event)) return
      event.preventDefault()
      setDraggingFiles(true)
    }

    const onDragLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return
      event.preventDefault()
      dragDepth = Math.max(0, dragDepth - 1)
      if (dragDepth === 0) setDraggingFiles(false)
    }

    const onDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return
      event.preventDefault()
      dragDepth = 0
      setDraggingFiles(false)
      onAddImages(event.dataTransfer?.files ?? null)
    }

    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)

    return () => {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [])

  // Live preview
  useEffect(() => {
    if (!livePreviewEnabled || !selectedImage || !previewCanvasRef.current) return

    let canceled = false

    const generatePreview = async () => {
      try {
        setLiveProcessing(true)
        setLiveProgress(0)

        const previewWidth = Math.max(128, Math.floor((effectiveOutputWidth * previewScalePercent) / 100))
        const blob = await exportDualFisheyeToPanorama({
          sourceUrl: selectedImage.url,
          outputWidth: previewWidth,
          yawOffsetDeg,
          lensFovDeg,
          seamBlendDeg,
          lensCircleScale,
          flipBackLens,
          format: 'jpg',
          quality: 70,
          baseName: '',
          onProgress: (p) => {
            if (!canceled) setLiveProgress(p)
          },
        })

        if (canceled) return

        const url = URL.createObjectURL(blob)
        const img = new Image()
        img.onload = () => {
          if (!canceled && previewCanvasRef.current) {
            const ctx = previewCanvasRef.current.getContext('2d')
            if (ctx) {
              previewCanvasRef.current.width = img.width
              previewCanvasRef.current.height = img.height
              ctx.drawImage(img, 0, 0)
            }
          }
          URL.revokeObjectURL(url)
        }
        img.src = url

        setLiveProcessing(false)
      } catch (err) {
        if (!canceled) {
          setError(`Live preview error: ${err instanceof Error ? err.message : 'Unknown error'}`)
          setLiveProcessing(false)
        }
      }
    }

    const timer = setTimeout(generatePreview, 300)

    return () => {
      canceled = true
      clearTimeout(timer)
    }
  }, [
    livePreviewEnabled,
    selectedImage,
    effectiveOutputWidth,
    previewScalePercent,
    yawOffsetDeg,
    lensFovDeg,
    seamBlendDeg,
    lensCircleScale,
    flipBackLens,
  ])

  async function onAddImages(files: FileList | null) {
    if (!files) return

    const candidates = Array.from(files).filter((file) => file.type.startsWith('image/'))
    const loaded = await Promise.all(
      candidates.map(async (file) => {
        const url = URL.createObjectURL(file)
        try {
          const image = await loadImage(url)
          return {
            id: Date.now() + Math.random(),
            file,
            url,
            name: file.name,
            width: image.naturalWidth || image.width,
            height: image.naturalHeight || image.height,
          } as ImageItem
        } catch {
          URL.revokeObjectURL(url)
          return null
        }
      }),
    )

    const validImages = loaded.filter((item): item is ImageItem => item !== null)
    if (validImages.length > 0) {
      setImages((prev) => [...prev, ...validImages])
    }
  }

  function removeImage(id: number) {
    setImages((prev) => {
      const img = prev.find((x) => x.id === id)
      if (img) URL.revokeObjectURL(img.url)
      return prev.filter((x) => x.id !== id)
    })

    if (selectedImageId === id) {
      setSelectedImageId(images.find((x) => x.id !== id)?.id ?? null)
    }
  }

  async function exportImages() {
    if (images.length === 0) return

    setExporting(true)
    setExportProgress(0)
    setError('')

    try {
      if (images.length === 1) {
        // Single image: direct download
        const image = images[0]
        const outputWidth = autoMaxOutputWidth ? getAutoOutputWidthFromImage(image) : effectiveOutputWidth
        const blob = await exportDualFisheyeToPanorama({
          sourceUrl: image.url,
          outputWidth,
          yawOffsetDeg,
          lensFovDeg,
          seamBlendDeg,
          lensCircleScale,
          flipBackLens,
          format,
          quality,
          baseName: getBaseName(image.name),
          onProgress: (p) => setExportProgress(p),
        })

        const fileName = `${getBaseName(image.name)}-panorama.${format === 'jpg' ? 'jpg' : format}`
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        a.click()
        URL.revokeObjectURL(url)
      } else {
        // Multiple images: ZIP download
        const zip = new JSZip()
        const total = images.length

        for (let i = 0; i < total; i++) {
          const image = images[i]
          const outputWidth = autoMaxOutputWidth ? getAutoOutputWidthFromImage(image) : effectiveOutputWidth
          const blob = await exportDualFisheyeToPanorama({
            sourceUrl: image.url,
            outputWidth,
            yawOffsetDeg,
            lensFovDeg,
            seamBlendDeg,
            lensCircleScale,
            flipBackLens,
            format,
            quality,
            baseName: getBaseName(image.name),
            onProgress: (p) => setExportProgress(Math.round(((i + p / 100) / total) * 100)),
          })

          const fileName = `${getBaseName(image.name)}-panorama.${format === 'jpg' ? 'jpg' : format}`
          zip.file(fileName, blob)
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' })
        const url = URL.createObjectURL(zipBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'panoramas.zip'
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed.')
    } finally {
      setExporting(false)
      setExportProgress(0)
    }
  }

  async function copySettingsUrl() {
    const params = new URLSearchParams()
    params.set('autoMaxOutputWidth', autoMaxOutputWidth ? '1' : '0')
    if (!autoMaxOutputWidth) {
      params.set('outputWidth', String(clamp(Number(outputWidthManual) || 512, 512, MAX_OUTPUT_WIDTH)))
    }
    params.set('previewScale', String(previewScalePercent))
    params.set('lensFov', String(lensFovDeg))
    params.set('yawOffset', String(yawOffsetDeg))
    params.set('seamBlend', String(seamBlendDeg))
    params.set('lensCircleScale', String(Number(lensCircleScale.toFixed(2))))
    params.set('flipBackLens', flipBackLens ? '1' : '0')
    params.set('livePreview', livePreviewEnabled ? '1' : '0')
    params.set('format', format)
    params.set('quality', String(quality))

    const hashBase = window.location.hash.split('?')[0]
    const shareUrl = hashBase
      ? `${window.location.origin}${window.location.pathname}${hashBase}?${params.toString()}`
      : `${window.location.origin}${window.location.pathname}?${params.toString()}`

    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopyFeedback('URL copied.')
    } catch {
      setCopyFeedback('Copy failed. Please copy from the address bar.')
    }

    window.setTimeout(() => setCopyFeedback(''), 1800)
  }

  return (
    <div className="toolPage">
      {draggingFiles && <div className="p360GlobalDropHint active">Drop image files to import</div>}

      <h2>Dual Fisheye to Panorama</h2>
      <p>Converts side-by-side 360 dual-fisheye images into equirectangular panoramas.</p>

      {error && <p style={{ color: '#ff6b6b' }}>{error}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => onAddImages(e.target.files)}
      />

      <>
        <h3>Images ({images.length})</h3>
        <div className="p360ImageGrid">
          {images.map((img) => (
            <div
              key={img.id}
              onClick={() => setSelectedImageId(img.id)}
              className={selectedImageId === img.id ? 'p360Thumb isActive' : 'p360Thumb'}
            >
              <img src={img.url} alt={img.name} className="p360ThumbImage" />
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeImage(img.id)
                }}
                className="p360Delete"
              >
                ✕
              </button>
              <small className="p360ThumbName" title={img.name}>
                {img.name}
              </small>
            </div>
          ))}

          <div className="p360Thumb p360ThumbAdd" onClick={() => fileInputRef.current?.click()} title="Add images">
            <div className="p360Plus">+</div>
            <small>Add images</small>
          </div>
        </div>
      </>

      {selectedImage && (
        <div className="p360Columns">
          <section>
            <h3>Settings</h3>

            <label>
              Lens FOV: {lensFovDeg}°
              <input
                type="range"
                min={160}
                max={230}
                step={1}
                value={lensFovDeg}
                onChange={(event) => setLensFovDeg(clamp(Number(event.target.value), 160, 230))}
              />
            </label>

            <label>
              Global yaw offset: {yawOffsetDeg}°
              <input
                type="range"
                min={-180}
                max={180}
                step={1}
                value={yawOffsetDeg}
                onChange={(event) => setYawOffsetDeg(clamp(Number(event.target.value), -180, 180))}
              />
            </label>

            <label>
              Seam blend: {seamBlendDeg}°
              <input
                type="range"
                min={0}
                max={30}
                step={1}
                value={seamBlendDeg}
                onChange={(event) => setSeamBlendDeg(clamp(Number(event.target.value), 0, 30))}
              />
            </label>

            <label>
              Lens circle scale: {lensCircleScale.toFixed(2)}
              <input
                type="range"
                min={0.85}
                max={1.05}
                step={0.01}
                value={lensCircleScale}
                onChange={(event) => setLensCircleScale(clamp(Number(event.target.value), 0.85, 1.05))}
              />
            </label>

            <label className="row p360SpaceBetween">
              Flip back lens horizontally
              <input
                type="checkbox"
                checked={flipBackLens}
                onChange={(event) => setFlipBackLens(event.target.checked)}
              />
            </label>

            <label className="row p360SpaceBetween" style={{ marginTop: '1rem' }}>
              Live preview
              <input type="checkbox" checked={livePreviewEnabled} onChange={(e) => setLivePreviewEnabled(e.target.checked)} />
            </label>

            <label>
              Preview scale: {previewScalePercent}%
              <input
                type="range"
                min={5}
                max={100}
                step={5}
                value={previewScalePercent}
                onChange={(event) => setPreviewScalePercent(clamp(Number(event.target.value), 5, 100))}
              />
            </label>

            {livePreviewEnabled && (
              <div className="p360PreviewBox">
                {liveProcessing && <p>Preview: {liveProgress}%</p>}
                <canvas ref={previewCanvasRef} className="p360PreviewCanvas" />
              </div>
            )}
          </section>

          <section>
            <h3>Export settings</h3>

            <label className="row p360SpaceBetween">
              Auto (max)
              <input
                type="checkbox"
                checked={autoMaxOutputWidth}
                onChange={(event) => setAutoMaxOutputWidth(event.target.checked)}
              />
            </label>

            <label>
              Output width (px)
              <input
                type="number"
                min={512}
                max={MAX_OUTPUT_WIDTH}
                step={256}
                value={autoMaxOutputWidth ? '' : outputWidthManual}
                placeholder={autoMaxOutputWidth ? 'Auto (max)' : ''}
                disabled={autoMaxOutputWidth}
                onChange={(event) => setOutputWidthManual(clamp(Number(event.target.value) || 512, 512, MAX_OUTPUT_WIDTH))}
              />
            </label>

            <p className="result">
              Effective output width: {effectiveOutputWidth}px
              {autoMaxOutputWidth && images.length > 1 ? ' (based on selected image; batch uses each original image width)' : ''}
            </p>

            <label>
              Output format
              <select value={format} onChange={(event) => setFormat(event.target.value as OutputFormat)}>
                <option value="jpg">JPG</option>
                <option value="png">PNG</option>
                <option value="webp">WebP</option>
              </select>
            </label>

            {format !== 'png' && (
              <label>
                Quality: {quality}
                <input
                  type="range"
                  min={50}
                  max={100}
                  step={1}
                  value={quality}
                  onChange={(event) => setQuality(clamp(Number(event.target.value), 50, 100))}
                />
              </label>
            )}

            <div className="row">
              <button onClick={copySettingsUrl}>Copy settings URL</button>
              {copyFeedback && <small>{copyFeedback}</small>}
            </div>

            <button onClick={exportImages} disabled={exporting}>
              {exporting ? `Exporting: ${exportProgress}%` : `Export ${images.length} image${images.length !== 1 ? 's' : ''}`}
            </button>
          </section>
        </div>
      )}
    </div>
  )
}

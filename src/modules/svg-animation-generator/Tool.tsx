import { useEffect, useMemo, useRef, useState } from 'react'

type Frame = { id: number; svg: string; enabled: boolean; name: string }

const sample1 = `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><circle cx="30" cy="60" r="18" fill="#60a5fa"/></svg>`
const sample2 = `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="60" r="18" fill="#60a5fa"/></svg>`
const sample3 = `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><circle cx="90" cy="60" r="18" fill="#60a5fa"/></svg>`

function extractSvgMeta(svg: string) {
  const viewBox = svg.match(/viewBox\s*=\s*"([^"]+)"/)?.[1] ?? '0 0 120 120'
  const width = svg.match(/width\s*=\s*"([^"]+)"/)?.[1] ?? '120'
  const height = svg.match(/height\s*=\s*"([^"]+)"/)?.[1] ?? '120'
  const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/i, '').replace(/<\/svg>[\s\S]*$/i, '')
  return { viewBox, width, height, inner }
}

function buildDownloadSvg(frames: string[], fps: number, loop: boolean) {
  const safeFps = Math.max(1, Math.min(60, fps))
  const dur = Math.max(1, Math.round(1000 / safeFps))
  const parsed = frames.map(extractSvgMeta)
  const base = parsed[0] ?? { viewBox: '0 0 120 120', width: '120', height: '120', inner: '' }

  const groups = parsed
    .map((f, i) => `<g id="frame-${i}" style="display:${i === 0 ? 'inline' : 'none'}">${f.inner}</g>`)
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${base.viewBox}" width="${base.width}" height="${base.height}">
${groups}
<script><![CDATA[
(function(){
  var total=${parsed.length};
  if(!total) return;
  var i=0;
  var loop=${loop ? 'true' : 'false'};
  var dur=${dur};
  var t=null;
  function show(n){
    for(var k=0;k<total;k++){
      var el=document.getElementById('frame-'+k);
      if(el) el.style.display=(k===n?'inline':'none');
    }
  }
  function tick(){
    if(i<total-1){ i++; }
    else if(loop){ i=0; }
    else { clearInterval(t); t=null; return; }
    show(i);
  }
  show(0);
  t=setInterval(tick,dur);
})();
]]></script>
</svg>`
}

export default function Tool() {
  const [frames, setFrames] = useState<Frame[]>([
    { id: 1, svg: sample1, enabled: true, name: 'Frame 1' },
    { id: 2, svg: sample2, enabled: true, name: 'Frame 2' },
    { id: 3, svg: sample3, enabled: true, name: 'Frame 3' },
  ])
  const [fps, setFps] = useState(24)
  const [loop, setLoop] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [index, setIndex] = useState(0)
  const [draggedId, setDraggedId] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const activeFrames = useMemo(() => frames.filter((f) => f.enabled), [frames])
  const interval = Math.max(1, Math.round(1000 / Math.max(1, fps)))

  useEffect(() => {
    if (!playing || activeFrames.length === 0) return
    const id = window.setInterval(() => {
      setIndex((prev) => {
        if (prev < activeFrames.length - 1) return prev + 1
        if (loop) return 0
        setPlaying(false)
        return prev
      })
    }, interval)
    return () => window.clearInterval(id)
  }, [playing, activeFrames.length, loop, interval])

  useEffect(() => {
    if (index > activeFrames.length - 1) setIndex(Math.max(0, activeFrames.length - 1))
  }, [activeFrames.length, index])

  const currentSvg = activeFrames[index]?.svg ?? ''

  const appendFrames = (svgList: { svg: string; name: string }[]) => {
    if (!svgList.length) return
    const seed = Date.now()
    setFrames((prev) => [
      ...prev,
      ...svgList.map((x, i) => ({ id: seed + i, svg: x.svg.trim(), enabled: true, name: x.name || `Frame ${prev.length + i + 1}` })),
    ])
  }

  const removeFrame = (id: number) => setFrames((prev) => prev.filter((f) => f.id !== id))

  const reorderByIds = (sourceId: number, targetId: number) => {
    if (sourceId === targetId) return
    setFrames((prev) => {
      const from = prev.findIndex((f) => f.id === sourceId)
      const to = prev.findIndex((f) => f.id === targetId)
      if (from < 0 || to < 0) return prev
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  const onFiles = async (files: FileList | null) => {
    if (!files) return
    const svgFiles = Array.from(files).filter((f) => f.type.includes('svg') || f.name.toLowerCase().endsWith('.svg'))
    const loaded = await Promise.all(svgFiles.map(async (f) => ({ name: f.name, svg: await f.text() })))
    appendFrames(loaded.filter((x) => x.svg.includes('<svg')))
  }

  const downloadContent = useMemo(
    () => buildDownloadSvg(activeFrames.map((f) => f.svg), fps, loop),
    [activeFrames, fps, loop],
  )

  const download = () => {
    const blob = new Blob([downloadContent], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'svg-animation.svg'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="toolPage">
      <h2>SVG Animation Generator</h2>

      <h3>Frames</h3>
      <div className="svgFramesGrid">
        {frames.map((f, i) => (
          <div
            key={f.id}
            className={`svgThumb ${f.enabled ? '' : 'off'}`}
            draggable
            onDragStart={() => setDraggedId(f.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (draggedId !== null) reorderByIds(draggedId, f.id)
              setDraggedId(null)
            }}
          >
            <div className="svgThumbPreview" dangerouslySetInnerHTML={{ __html: f.svg }} />
            <div className="svgThumbRow">
              <small>
                {i + 1}. {f.name}
              </small>
            </div>
            <div className="svgThumbRow">
              <label>
                <input
                  type="checkbox"
                  checked={f.enabled}
                  onChange={(e) =>
                    setFrames((prev) => prev.map((x) => (x.id === f.id ? { ...x, enabled: e.target.checked } : x)))
                  }
                />{' '}
                On
              </label>
              <button className="openBtn" onClick={() => removeFrame(f.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}

        <div
          className="svgThumb svgThumbAdd"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            onFiles(e.dataTransfer.files)
          }}
          title="Add SVG files"
        >
          <div className="svgPlus">+</div>
          <small>Add SVG</small>
          <input
            ref={fileRef}
            type="file"
            accept=".svg,image/svg+xml"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => onFiles(e.target.files)}
          />
        </div>
      </div>

      <h3>Preview</h3>
      <div className="row">
        <label>FPS</label>
        <input
          type="number"
          min={1}
          max={60}
          value={fps}
          onChange={(e) => setFps(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
        />
        <label>
          <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} /> Loop
        </label>
        <button className="openBtn" onClick={() => setPlaying((p) => !p)}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <button className="openBtn" onClick={download} disabled={activeFrames.length === 0}>
          Download SVG
        </button>
      </div>
      <div className="svgBigPreview" dangerouslySetInnerHTML={{ __html: currentSvg || '<p>No active frame</p>' }} />
      <p className="result">
        Active frame {activeFrames.length ? index + 1 : 0} / {activeFrames.length}
      </p>
    </div>
  )
}

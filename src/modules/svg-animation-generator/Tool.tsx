import { useEffect, useMemo, useState } from 'react'

type Frame = { id: number; svg: string }

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
    .map(
      (f, i) =>
        `<g id="frame-${i}" style="display:${i === 0 ? 'inline' : 'none'}">${f.inner}</g>`,
    )
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
    { id: 1, svg: sample1 },
    { id: 2, svg: sample2 },
    { id: 3, svg: sample3 },
  ])
  const [fps, setFps] = useState(8)
  const [loop, setLoop] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [index, setIndex] = useState(0)
  const [draft, setDraft] = useState('')

  const interval = Math.max(1, Math.round(1000 / Math.max(1, fps)))

  useEffect(() => {
    if (!playing || frames.length === 0) return
    const id = window.setInterval(() => {
      setIndex((prev) => {
        if (prev < frames.length - 1) return prev + 1
        if (loop) return 0
        setPlaying(false)
        return prev
      })
    }, interval)
    return () => window.clearInterval(id)
  }, [playing, frames.length, loop, interval])

  useEffect(() => {
    if (index > frames.length - 1) setIndex(Math.max(0, frames.length - 1))
  }, [frames.length, index])

  const currentSvg = frames[index]?.svg ?? ''
  const canAdd = draft.includes('<svg') && draft.includes('</svg>')

  const addFrame = () => {
    if (!canAdd) return
    const nextId = Date.now()
    setFrames((prev) => [...prev, { id: nextId, svg: draft.trim() }])
    setDraft('')
  }

  const move = (pos: number, dir: -1 | 1) => {
    setFrames((prev) => {
      const next = [...prev]
      const to = pos + dir
      if (to < 0 || to >= next.length) return prev
      ;[next[pos], next[to]] = [next[to], next[pos]]
      return next
    })
    setIndex((prev) => Math.max(0, Math.min(frames.length - 1, prev + dir)))
  }

  const removeFrame = (id: number) => setFrames((prev) => prev.filter((f) => f.id !== id))

  const downloadContent = useMemo(() => buildDownloadSvg(frames.map((f) => f.svg), fps, loop), [frames, fps, loop])

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

      <div className="row">
        <label>FPS</label>
        <input type="number" min={1} max={60} value={fps} onChange={(e) => setFps(Math.max(1, Math.min(60, Number(e.target.value) || 1)))} />
        <label>
          <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} /> Loop
        </label>
        <button className="openBtn" onClick={() => setPlaying((p) => !p)}>{playing ? 'Pause' : 'Play'}</button>
        <button className="openBtn" onClick={download} disabled={frames.length === 0}>Download SVG</button>
      </div>

      <div className="preview" style={{ minHeight: 240, display: 'grid', placeItems: 'center' }} dangerouslySetInnerHTML={{ __html: currentSvg || '<p>No frame</p>' }} />
      <p className="result">Frame {frames.length ? index + 1 : 0} / {frames.length}</p>

      <h3>Frame Order</h3>
      <div className="checks">
        {frames.map((f, i) => (
          <div key={f.id} className="row">
            <button className="openBtn" onClick={() => setIndex(i)}>Show {i + 1}</button>
            <button className="openBtn" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
            <button className="openBtn" onClick={() => move(i, 1)} disabled={i === frames.length - 1}>↓</button>
            <button className="openBtn" onClick={() => removeFrame(f.id)} disabled={frames.length <= 1}>Remove</button>
          </div>
        ))}
      </div>

      <h3>Add SVG Frame</h3>
      <textarea className="mono" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Paste full <svg ...>...</svg> markup" />
      <button className="openBtn" onClick={addFrame} disabled={!canAdd}>Add frame</button>
    </div>
  )
}

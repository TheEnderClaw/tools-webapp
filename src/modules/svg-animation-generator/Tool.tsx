import { useEffect, useMemo, useRef, useState } from 'react'
import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

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

function SortableFrame({
  frame,
  index,
  onToggle,
  onDelete,
}: {
  frame: Frame
  index: number
  onToggle: (id: number, enabled: boolean) => void
  onDelete: (id: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: frame.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`svgThumb ${frame.enabled ? '' : 'off'} ${isDragging ? 'dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className="svgThumbPreview" dangerouslySetInnerHTML={{ __html: frame.svg }} />
      <div className="svgThumbRow">
        <small>
          {index + 1}. {frame.name}
        </small>
      </div>
      <div className="svgThumbRow">
        <label>
          <input type="checkbox" checked={frame.enabled} onChange={(e) => onToggle(frame.id, e.target.checked)} /> On
        </label>
        <button className="openBtn" onClick={() => onDelete(frame.id)}>
          Delete
        </button>
      </div>
    </div>
  )
}

function FileDropAnywhere() {
  const { setNodeRef, isOver } = useDroppable({ id: 'file-drop-anywhere' })
  return <div ref={setNodeRef} className={isOver ? 'globalDropHint active' : 'globalDropHint'}>Drop SVG files to import</div>
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
  const [activeDragId, setActiveDragId] = useState<number | null>(null)
  const [draggingFiles, setDraggingFiles] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
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

  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      const hasFiles = Array.from(e.dataTransfer?.types ?? []).includes('Files')
      if (!hasFiles) return
      e.preventDefault()
      setDraggingFiles(true)
    }
    const onDragLeave = () => setDraggingFiles(false)
    const onDrop = (e: DragEvent) => {
      const hasFiles = Array.from(e.dataTransfer?.types ?? []).includes('Files')
      if (!hasFiles) return
      e.preventDefault()
      setDraggingFiles(false)
      onFiles(e.dataTransfer?.files ?? null)
    }
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('drop', onDrop)
    }
  })

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

  const onFiles = async (files: FileList | null) => {
    if (!files) return
    const svgFiles = Array.from(files).filter((f) => f.type.includes('svg') || f.name.toLowerCase().endsWith('.svg'))
    const loaded = await Promise.all(svgFiles.map(async (f) => ({ name: f.name, svg: await f.text() })))
    appendFrames(loaded.filter((x) => x.svg.includes('<svg')))
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(Number(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    setFrames((prev) => {
      const oldIndex = prev.findIndex((x) => x.id === active.id)
      const newIndex = prev.findIndex((x) => x.id === over.id)
      if (oldIndex < 0 || newIndex < 0) return prev
      return arrayMove(prev, oldIndex, newIndex)
    })
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
      {draggingFiles && <FileDropAnywhere />}

      <h3>Frames</h3>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <SortableContext items={frames.map((f) => f.id)} strategy={rectSortingStrategy}>
          <div className="svgFramesGrid">
            {frames.map((f, i) => (
              <SortableFrame
                key={f.id}
                frame={f}
                index={i}
                onToggle={(id, enabled) =>
                  setFrames((prev) => prev.map((x) => (x.id === id ? { ...x, enabled } : x)))
                }
                onDelete={removeFrame}
              />
            ))}

            <div className="svgThumb svgThumbAdd" onClick={() => fileRef.current?.click()} title="Add SVG files">
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
        </SortableContext>

        <DragOverlay>
          {activeDragId ? (
            <div className="svgThumb dragging overlay">
              <div
                className="svgThumbPreview"
                dangerouslySetInnerHTML={{ __html: frames.find((f) => f.id === activeDragId)?.svg ?? '' }}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

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

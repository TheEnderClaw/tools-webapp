import { useEffect, useMemo, useRef, useState } from 'react'
import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'

const STORAGE_KEY = 'enderclaw-markdown-editor-draft'

const toolGroups = [
  [
    { label: 'H1', action: () => document.execCommand('formatBlock', false, 'h1') },
    { label: 'H2', action: () => document.execCommand('formatBlock', false, 'h2') },
    { label: 'H3', action: () => document.execCommand('formatBlock', false, 'h3') },
    { label: 'P', action: () => document.execCommand('formatBlock', false, 'p') },
  ],
  [
    { label: 'B', action: () => document.execCommand('bold') },
    { label: 'I', action: () => document.execCommand('italic') },
    { label: 'S', action: () => document.execCommand('strikeThrough') },
    { label: 'Code', action: () => document.execCommand('formatBlock', false, 'pre') },
    { label: 'Quote', action: () => document.execCommand('formatBlock', false, 'blockquote') },
  ],
  [
    { label: 'UL', action: () => document.execCommand('insertUnorderedList') },
    { label: 'OL', action: () => document.execCommand('insertOrderedList') },
    { label: 'HR', action: () => document.execCommand('insertHorizontalRule') },
    {
      label: 'Link',
      action: () => {
        const url = window.prompt('Link URL:')
        if (url) document.execCommand('createLink', false, url)
      },
    },
    {
      label: 'Image',
      action: () => {
        const url = window.prompt('Image URL:')
        if (url) document.execCommand('insertImage', false, url)
      },
    },
  ],
] as const

const defaultHtml = '<h2>Markdown Editor</h2><p>Rich Text und Markdown beeinflussen sich gegenseitig.</p>'

function escapeHtml(input: string) {
  return input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function markdownToHtml(input: string) {
  const escaped = escapeHtml(input)
  return escaped
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/^- (.*)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .replace(/\n\n/g, '<br/><br/>')
}

export default function Tool() {
  const editorRef = useRef<HTMLDivElement | null>(null)
  const initializedRef = useRef(false)
  const [markdown, setMarkdown] = useState('')

  const turndown = useMemo(() => {
    const service = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', emDelimiter: '_', bulletListMarker: '-' })
    service.use(gfm as any)
    return service
  }, [])

  function updateMarkdownFromEditor() {
    const html = editorRef.current?.innerHTML ?? ''
    setMarkdown(turndown.turndown(html))
  }

  function applyMarkdownToEditor(md: string) {
    if (!editorRef.current) return
    editorRef.current.innerHTML = markdownToHtml(md)
  }

  useEffect(() => {
    if (initializedRef.current) return
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { markdown?: string; html?: string }
        if (editorRef.current) editorRef.current.innerHTML = parsed.html || defaultHtml
        setMarkdown(parsed.markdown ?? '')
      } catch {
        if (editorRef.current) editorRef.current.innerHTML = defaultHtml
        updateMarkdownFromEditor()
      }
    } else {
      if (editorRef.current) editorRef.current.innerHTML = defaultHtml
      updateMarkdownFromEditor()
    }
    initializedRef.current = true
  }, [])

  useEffect(() => {
    if (!initializedRef.current) return
    const payload = { markdown, html: editorRef.current?.innerHTML ?? '' }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }, [markdown])

  async function importMarkdown(file: File) {
    const text = await file.text()
    setMarkdown(text)
    applyMarkdownToEditor(text)
  }

  function exportMarkdown() {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'markdown-editor-export.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="toolPage">
      <h2>Markdown Editor</h2>
      <p>Rich text + markdown editor, beide Felder sind editierbar und synchronisierbar.</p>

      <div className="chipWrap">
        {toolGroups.map((group, i) => (
          <div key={i} className="row" style={{ flexWrap: 'wrap' }}>
            {group.map((btn) => (
              <button
                key={btn.label}
                onClick={() => {
                  editorRef.current?.focus()
                  btn.action()
                  updateMarkdownFromEditor()
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="row" style={{ flexWrap: 'wrap' }}>
        <button onClick={updateMarkdownFromEditor}>RichText → Markdown</button>
        <button onClick={() => applyMarkdownToEditor(markdown)}>Markdown → RichText</button>
        <label className="openBtn" style={{ display: 'inline-block' }}>
          Import .md
          <input type="file" accept=".md,text/markdown,text/plain" style={{ display: 'none' }} onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void importMarkdown(f)
          }} />
        </label>
        <button onClick={exportMarkdown}>Export .md</button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))' }}>
        <div>
          <h3>Rich Text</h3>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="preview"
            style={{ minHeight: 300 }}
            onInput={updateMarkdownFromEditor}
          />
        </div>
        <div>
          <h3>Markdown</h3>
          <textarea
            className="mono"
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            onBlur={() => applyMarkdownToEditor(markdown)}
            style={{ minHeight: 300, width: '100%' }}
          />
        </div>
      </div>
    </div>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'
import { marked } from 'marked'

const STORAGE_KEY = 'enderclaw-markdown-editor-draft'

function selectedTextOrFallback(fallback = 'code') {
  const text = window.getSelection()?.toString().trim()
  return text && text.length > 0 ? text : fallback
}

function insertInlineCode() {
  const text = selectedTextOrFallback('inline code')
  document.execCommand('insertHTML', false, `<code>${text}</code>`)
}

function insertCodeBlock() {
  const text = selectedTextOrFallback('multiline\ncode block')
  document.execCommand('insertHTML', false, `<pre><code>${text}</code></pre><p></p>`)
}

function insertTableWithSize() {
  const rowsInput = window.prompt('Rows?', '2')
  const colsInput = window.prompt('Columns?', '2')
  const rows = Math.max(1, Math.min(20, Number(rowsInput || 2)))
  const cols = Math.max(1, Math.min(10, Number(colsInput || 2)))

  if (!Number.isFinite(rows) || !Number.isFinite(cols)) return

  const head = `<tr>${Array.from({ length: cols }, (_, i) => `<th>Header ${i + 1}</th>`).join('')}</tr>`
  const body = Array.from({ length: rows }, (_, r) => `<tr>${Array.from({ length: cols }, (_, c) => `<td>R${r + 1}C${c + 1}</td>`).join('')}</tr>`).join('')

  document.execCommand('insertHTML', false, `<table><thead>${head}</thead><tbody>${body}</tbody></table><p></p>`)
}

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
    { label: 'Inline Code', action: insertInlineCode },
    { label: 'Code Block', action: insertCodeBlock },
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
    { label: 'Table', action: insertTableWithSize },
  ],
] as const

const defaultHtml = '<h2>Markdown Editor</h2><p>Rich Text und Markdown synchronisieren live.</p>'

export default function Tool() {
  const editorRef = useRef<HTMLDivElement | null>(null)
  const initializedRef = useRef(false)
  const syncSourceRef = useRef<'rich' | 'markdown' | null>(null)
  const [markdown, setMarkdown] = useState('')

  const turndown = useMemo(() => {
    const service = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', emDelimiter: '_', bulletListMarker: '-' })
    service.use(gfm as any)
    return service
  }, [])

  function updateMarkdownFromEditor() {
    const html = editorRef.current?.innerHTML ?? ''
    syncSourceRef.current = 'rich'
    setMarkdown(turndown.turndown(html))
  }

  function applyMarkdownToEditor(md: string) {
    if (!editorRef.current) return
    editorRef.current.innerHTML = marked.parse(md) as string
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

    if (syncSourceRef.current === 'markdown') {
      applyMarkdownToEditor(markdown)
    }

    const payload = { markdown, html: editorRef.current?.innerHTML ?? '' }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    syncSourceRef.current = null
  }, [markdown])

  async function importMarkdown(file: File) {
    const text = await file.text()
    syncSourceRef.current = 'markdown'
    setMarkdown(text)
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
      <p>Rich text + markdown editor, beide Felder sind live synchron.</p>

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
            onChange={(e) => {
              syncSourceRef.current = 'markdown'
              setMarkdown(e.target.value)
            }}
            style={{ minHeight: 300, width: '100%' }}
          />
        </div>
      </div>
    </div>
  )
}

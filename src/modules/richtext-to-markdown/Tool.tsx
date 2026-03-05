import { useEffect, useMemo, useRef, useState } from 'react'
import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'

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
    {
      label: 'Table',
      action: () => {
        document.execCommand(
          'insertHTML',
          false,
          '<table><thead><tr><th>Column A</th><th>Column B</th></tr></thead><tbody><tr><td>Row 1</td><td>Value</td></tr><tr><td>Row 2</td><td>Value</td></tr></tbody></table><p></p>',
        )
      },
    },
  ],
] as const

export default function Tool() {
  const editorRef = useRef<HTMLDivElement | null>(null)
  const [markdown, setMarkdown] = useState('')

  const turndown = useMemo(() => {
    const service = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      emDelimiter: '_',
      bulletListMarker: '-',
    })
    service.use(gfm as any)
    return service
  }, [])

  function updateMarkdown() {
    const html = editorRef.current?.innerHTML ?? ''
    setMarkdown(turndown.turndown(html))
  }

  useEffect(() => {
    updateMarkdown()
  }, [])

  return (
    <div className="toolPage">
      <h2>Rich Text → Markdown</h2>
      <p>Write with rich text controls and get Markdown output instantly.</p>

      <div className="chipWrap">
        {toolGroups.map((group, i) => (
          <div key={i} className="row" style={{ flexWrap: 'wrap' }}>
            {group.map((btn) => (
              <button
                key={btn.label}
                onClick={() => {
                  editorRef.current?.focus()
                  btn.action()
                  updateMarkdown()
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="preview"
        style={{ minHeight: 220 }}
        onInput={updateMarkdown}
        dangerouslySetInnerHTML={{
          __html:
            '<h2>Start writing…</h2><p>This editor supports headings, lists, links, images, quotes, code blocks, and tables.</p>',
        }}
      />

      <label>
        Markdown output
        <textarea className="mono" readOnly value={markdown} style={{ minHeight: 260 }} />
      </label>
      <button onClick={() => navigator.clipboard.writeText(markdown)}>Copy Markdown</button>
    </div>
  )
}

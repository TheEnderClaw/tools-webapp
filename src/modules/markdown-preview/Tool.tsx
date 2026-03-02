import { useMemo, useState } from 'react'

function markdownToHtml(input: string) {
  const escaped = input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
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

export default function MarkdownPreviewTool() {
  const [markdown, setMarkdown] = useState('# Hello\n\n- Write markdown\n- See preview\n\n**Bold**, *italic*, and `inline code`.')
  const html = useMemo(() => markdownToHtml(markdown), [markdown])

  return (
    <div className="toolPage">
      <h2>Markdown Preview</h2>
      <div className="split">
        <textarea value={markdown} onChange={(e) => setMarkdown(e.target.value)} />
        <div className="preview" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  )
}

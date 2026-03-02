import { useState } from 'react'

const base = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'

export default function Tool() {
  const [n, setN] = useState(3)
  const text = Array.from({ length: n }, () => base).join('\n\n')

  return (
    <div className="toolPage">
      <h2>Lorem Generator</h2>
      <label>
        Paragraphs:{' '}
        <input type="number" min={1} max={20} value={n} onChange={(e) => setN(Number(e.target.value) || 1)} />
      </label>
      <textarea className="mono" readOnly value={text} />
    </div>
  )
}

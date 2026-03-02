import { useMemo, useState } from 'react'

export default function Tool() {
  const [t, setT] = useState('')
  const s = useMemo(
    () => ({
      chars: t.length,
      words: (t.trim().match(/\S+/g) || []).length,
      lines: t ? t.split(/\n/).length : 0,
    }),
    [t],
  )

  return (
    <div className="toolPage">
      <h2>Word Counter</h2>
      <textarea value={t} onChange={(e) => setT(e.target.value)} />
      <p className="result">
        Words: {s.words} · Chars: {s.chars} · Lines: {s.lines}
      </p>
    </div>
  )
}

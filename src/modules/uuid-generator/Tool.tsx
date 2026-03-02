import { useState } from 'react'

export default function Tool() {
  const [list, setList] = useState<string[]>([])

  return (
    <div className="toolPage">
      <h2>UUID Generator</h2>
      <button className="openBtn" onClick={() => setList([crypto.randomUUID(), ...list].slice(0, 20))}>
        Generate
      </button>
      <textarea className="mono" readOnly value={list.join('\n')} />
    </div>
  )
}

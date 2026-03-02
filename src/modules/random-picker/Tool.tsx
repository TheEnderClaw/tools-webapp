import { useState } from 'react'

export default function Tool() {
  const [input, setInput] = useState('Alice\nBob\nCharlie')
  const [out, setOut] = useState('')

  const pick = () => {
    const arr = input
      .split(/\n|,/)
      .map((x) => x.trim())
      .filter(Boolean)
    if (!arr.length) return setOut('No items')
    setOut(arr[Math.floor(Math.random() * arr.length)])
  }

  return (
    <div className="toolPage">
      <h2>Random Picker</h2>
      <textarea value={input} onChange={(e) => setInput(e.target.value)} />
      <button className="openBtn" onClick={pick}>
        Pick one
      </button>
      <textarea className="mono" readOnly value={out} />
    </div>
  )
}

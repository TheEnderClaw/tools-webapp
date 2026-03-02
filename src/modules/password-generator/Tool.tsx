import { useMemo, useState } from 'react'

function makePassword(length: number, upper: boolean, lower: boolean, numbers: boolean, symbols: boolean) {
  const U = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const L = 'abcdefghijkmnopqrstuvwxyz'
  const N = '23456789'
  const S = '!@#$%^&*()-_=+[]{}:;,.?'
  let set = ''
  if (upper) set += U
  if (lower) set += L
  if (numbers) set += N
  if (symbols) set += S
  if (!set) return ''
  const r = crypto.getRandomValues(new Uint32Array(length))
  return Array.from(r, (v) => set[v % set.length]).join('')
}

export default function PasswordGeneratorTool() {
  const [len, setLen] = useState(16)
  const [u, setU] = useState(true)
  const [l, setL] = useState(true)
  const [n, setN] = useState(true)
  const [s, setS] = useState(true)
  const [seed, setSeed] = useState(0)

  const password = useMemo(() => makePassword(len, u, l, n, s), [len, u, l, n, s, seed])

  return (
    <div className="toolPage">
      <h2>Password Generator</h2>
      <label>Length: {len}</label>
      <input type="range" min={8} max={64} value={len} onChange={(e) => setLen(Number(e.target.value))} />
      <div className="checks">
        <label><input type="checkbox" checked={u} onChange={(e) => setU(e.target.checked)} /> Uppercase</label>
        <label><input type="checkbox" checked={l} onChange={(e) => setL(e.target.checked)} /> Lowercase</label>
        <label><input type="checkbox" checked={n} onChange={(e) => setN(e.target.checked)} /> Numbers</label>
        <label><input type="checkbox" checked={s} onChange={(e) => setS(e.target.checked)} /> Symbols</label>
      </div>
      <button className="openBtn" onClick={() => setSeed((x) => x + 1)}>Generate new</button>
      <textarea className="mono" readOnly value={password || 'Enable at least one charset.'} />
    </div>
  )
}

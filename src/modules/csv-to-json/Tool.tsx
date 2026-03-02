import { useMemo, useState } from 'react'

export default function Tool() {
  const [csv, setCsv] = useState('name,age\nAlice,30\nBob,28')

  const out = useMemo(() => {
    try {
      const lines = csv.trim().split(/\n/)
      const h = lines[0].split(',').map((s) => s.trim())
      const rows = lines.slice(1).map((l) => {
        const c = l.split(',')
        return Object.fromEntries(h.map((k, i) => [k, (c[i] ?? '').trim()]))
      })
      return JSON.stringify(rows, null, 2)
    } catch {
      return 'Invalid CSV'
    }
  }, [csv])

  return (
    <div className="toolPage">
      <h2>CSV to JSON</h2>
      <textarea value={csv} onChange={(e) => setCsv(e.target.value)} />
      <textarea className="mono" readOnly value={out} />
    </div>
  )
}

import { useMemo, useState } from 'react'

const dec = (s: string) => JSON.stringify(JSON.parse(atob(s.replace(/-/g, '+').replace(/_/g, '/'))), null, 2)

export default function Tool() {
  const [jwt, setJwt] = useState('')

  const out = useMemo(() => {
    try {
      const [h, p] = jwt.split('.')
      if (!h || !p) return ''
      return `Header:\n${dec(h)}\n\nPayload:\n${dec(p)}`
    } catch {
      return 'Invalid JWT'
    }
  }, [jwt])

  return (
    <div className="toolPage">
      <h2>JWT Decoder</h2>
      <textarea value={jwt} onChange={(e) => setJwt(e.target.value)} />
      <textarea className="mono" readOnly value={out} />
    </div>
  )
}

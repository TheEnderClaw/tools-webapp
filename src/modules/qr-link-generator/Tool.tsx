import { useMemo, useState } from 'react'
export default function Tool(){
 const [url,setUrl]=useState('https://enderclaw.net')
 const src=useMemo(()=>`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}`,[url])
 return <div className="toolPage"><h2>QR Link Generator</h2><input value={url} onChange={e=>setUrl(e.target.value)} /><img src={src} alt="QR" width={220} height={220} /></div>
}

import { useState } from 'react'
async function sha256(s:string){const b=new TextEncoder().encode(s);const h=await crypto.subtle.digest('SHA-256',b);return Array.from(new Uint8Array(h)).map(x=>x.toString(16).padStart(2,'0')).join('')}
export default function Tool(){
 const [input,setInput]=useState(''); const [out,setOut]=useState('')
 return <div className="toolPage"><h2>SHA-256 Hasher</h2><textarea value={input} onChange={e=>setInput(e.target.value)} /><button className="openBtn" onClick={async()=>setOut(await sha256(input))}>Hash</button><textarea className="mono" readOnly value={out} /></div>
}

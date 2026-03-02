import { useState } from 'react'
const title=(s:string)=>s.toLowerCase().replace(/\w/g,m=>m.toUpperCase())
export default function Tool(){
 const [t,setT]=useState('')
 return <div className="toolPage"><h2>Text Case Converter</h2><textarea value={t} onChange={e=>setT(e.target.value)} /><div className="row"><button className="openBtn" onClick={()=>setT(t.toUpperCase())}>UPPER</button><button className="openBtn" onClick={()=>setT(t.toLowerCase())}>lower</button><button className="openBtn" onClick={()=>setT(title(t))}>Title</button></div></div>
}

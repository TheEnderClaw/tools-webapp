import { useState } from 'react'
export default function Tool(){
 const [input,setInput]=useState('{"hello":"world"}'); const [out,setOut]=useState(''); const [err,setErr]=useState('')
 const fmt=()=>{try{setErr(''); setOut(JSON.stringify(JSON.parse(input),null,2))}catch(e:any){setErr(e.message); setOut('')}}
 return <div className="toolPage"><h2>JSON Formatter</h2><textarea value={input} onChange={e=>setInput(e.target.value)} /><button className="openBtn" onClick={fmt}>Format</button>{err&&<p className="result">Error: {err}</p>}<textarea className="mono" readOnly value={out} /></div>
}

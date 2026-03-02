import { useState } from 'react'
export default function Tool(){
  const [input,setInput]=useState('')
  const [output,setOutput]=useState('')
  const enc=()=>setOutput(btoa(unescape(encodeURIComponent(input))))
  const dec=()=>{try{setOutput(decodeURIComponent(escape(atob(input))))}catch{setOutput('Invalid Base64')}}
  return <div className="toolPage"><h2>Base64</h2><textarea value={input} onChange={e=>setInput(e.target.value)} /><div className="row"><button className="openBtn" onClick={enc}>Encode</button><button className="openBtn" onClick={dec}>Decode</button></div><textarea className="mono" readOnly value={output} /></div>
}

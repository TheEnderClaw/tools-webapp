import { useState } from 'react'
export default function Tool(){
 const [input,setInput]=useState(''); const [output,setOutput]=useState('')
 return <div className="toolPage"><h2>URL Encode/Decode</h2><textarea value={input} onChange={e=>setInput(e.target.value)} /><div className="row"><button className="openBtn" onClick={()=>setOutput(encodeURIComponent(input))}>Encode</button><button className="openBtn" onClick={()=>{try{setOutput(decodeURIComponent(input))}catch{setOutput('Invalid encoded input')}}}>Decode</button></div><textarea className="mono" readOnly value={output} /></div>
}

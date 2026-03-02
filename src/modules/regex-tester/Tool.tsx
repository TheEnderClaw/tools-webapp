import { useMemo, useState } from 'react'
export default function Tool(){
 const [pattern,setPattern]=useState('\b\w{4}\b'); const [flags,setFlags]=useState('g'); const [text,setText]=useState('test this text with four word size')
 const out=useMemo(()=>{try{const re=new RegExp(pattern,flags); return JSON.stringify([...text.matchAll(re)].map(m=>m[0]),null,2)}catch(e:any){return 'Error: '+e.message}},[pattern,flags,text])
 return <div className="toolPage"><h2>Regex Tester</h2><input value={pattern} onChange={e=>setPattern(e.target.value)} /><input value={flags} onChange={e=>setFlags(e.target.value)} /><textarea value={text} onChange={e=>setText(e.target.value)} /><textarea className="mono" readOnly value={out} /></div>
}

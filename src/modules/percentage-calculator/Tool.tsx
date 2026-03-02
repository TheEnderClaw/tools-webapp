import { useMemo, useState } from 'react'
export default function Tool(){
 const [part,setPart]=useState('25'); const [whole,setWhole]=useState('200'); const [pct,setPct]=useState('15')
 const p=Number(part), w=Number(whole), pc=Number(pct)
 const res=useMemo(()=>({ratio:(Number.isFinite(p)&&Number.isFinite(w)&&w!==0)?(p/w*100).toFixed(2):'—', fromPct:(Number.isFinite(pc)&&Number.isFinite(w))?(w*pc/100).toFixed(2):'—'}),[p,w,pc])
 return <div className="toolPage"><h2>Percentage Calculator</h2><label>Part<input value={part} onChange={e=>setPart(e.target.value)} /></label><label>Whole<input value={whole} onChange={e=>setWhole(e.target.value)} /></label><p className="result">Part is {res.ratio}% of whole</p><label>{pct}% of whole</label><input value={pct} onChange={e=>setPct(e.target.value)} /><p className="result">Result: {res.fromPct}</p></div>
}

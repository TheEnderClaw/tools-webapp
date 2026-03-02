import { useMemo, useState } from 'react'
export default function Tool(){
 const [ts,setTs]=useState(String(Math.floor(Date.now()/1000)))
 const [iso,setIso]=useState(new Date().toISOString())
 const tsToIso=useMemo(()=>{const n=Number(ts); return Number.isFinite(n)?new Date((ts.length>10?n:n*1000)).toISOString():'Invalid'},[ts])
 const isoToTs=useMemo(()=>{const t=Date.parse(iso); return Number.isFinite(t)?String(Math.floor(t/1000)):'Invalid'},[iso])
 return <div className="toolPage"><h2>Timestamp Converter</h2><label>UNIX Timestamp</label><input value={ts} onChange={e=>setTs(e.target.value)} /><p className="result">ISO: {tsToIso}</p><label>ISO Date</label><input value={iso} onChange={e=>setIso(e.target.value)} /><p className="result">UNIX: {isoToTs}</p></div>
}

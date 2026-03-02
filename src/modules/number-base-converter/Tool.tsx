import { useMemo, useState } from 'react'
export default function Tool(){
 const [v,setV]=useState('255'); const [base,setBase]=useState(10)
 const n=useMemo(()=>parseInt(v,base),[v,base])
 return <div className="toolPage"><h2>Number Base Converter</h2><input value={v} onChange={e=>setV(e.target.value)} /><select value={base} onChange={e=>setBase(Number(e.target.value))}><option value={2}>BIN</option><option value={8}>OCT</option><option value={10}>DEC</option><option value={16}>HEX</option></select><p className="result">BIN: {Number.isFinite(n)?n.toString(2):'Invalid'}</p><p className="result">OCT: {Number.isFinite(n)?n.toString(8):'Invalid'}</p><p className="result">DEC: {Number.isFinite(n)?n.toString(10):'Invalid'}</p><p className="result">HEX: {Number.isFinite(n)?n.toString(16).toUpperCase():'Invalid'}</p></div>
}

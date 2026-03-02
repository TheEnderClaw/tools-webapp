import { useMemo, useState } from 'react'
export default function Tool(){
 const [price,setPrice]=useState('4.99'); const [qty,setQty]=useState('750')
 const unit=useMemo(()=>{const p=Number(price),q=Number(qty); return Number.isFinite(p)&&Number.isFinite(q)&&q>0?(p/q).toFixed(4):'—'},[price,qty])
 return <div className="toolPage"><h2>Unit Price Calculator</h2><label>Price<input value={price} onChange={e=>setPrice(e.target.value)} /></label><label>Quantity<input value={qty} onChange={e=>setQty(e.target.value)} /></label><p className="result">Price per unit: {unit}</p></div>
}

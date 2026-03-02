import { useState } from 'react'
const hexToRgb=(h:string)=>{const m=h.replace('#','');if(!/^[0-9a-fA-F]{6}$/.test(m))return null;return {r:parseInt(m.slice(0,2),16),g:parseInt(m.slice(2,4),16),b:parseInt(m.slice(4,6),16)}}
const rgbToHex=(r:number,g:number,b:number)=>'#'+[r,g,b].map(x=>Math.max(0,Math.min(255,x)).toString(16).padStart(2,'0')).join('')
export default function Tool(){
 const [hex,setHex]=useState('#3366ff'); const [rgb,setRgb]=useState('51,102,255')
 const parsed=hexToRgb(hex)
 return <div className="toolPage"><h2>Color Converter</h2><label>HEX<input value={hex} onChange={e=>setHex(e.target.value)} /></label><p className="result">RGB: {parsed?`${parsed.r}, ${parsed.g}, ${parsed.b}`:'Invalid HEX'}</p><label>RGB (r,g,b)<input value={rgb} onChange={e=>setRgb(e.target.value)} /></label><p className="result">HEX: {(()=>{const p=rgb.split(',').map(x=>Number(x.trim())); return p.length===3&&p.every(Number.isFinite)?rgbToHex(p[0],p[1],p[2]):'Invalid RGB'})()}</p><div style={{height:40,borderRadius:8,background:parsed?hex:'#000'}} /></div>
}

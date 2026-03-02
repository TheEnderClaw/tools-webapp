import { useEffect, useState } from 'react'
export default function Tool(){
 const [sec,setSec]=useState(25*60); const [run,setRun]=useState(false)
 useEffect(()=>{if(!run)return; const id=setInterval(()=>setSec(s=>s>0?s-1:0),1000); return ()=>clearInterval(id)},[run])
 const mm=String(Math.floor(sec/60)).padStart(2,'0'); const ss=String(sec%60).padStart(2,'0')
 return <div className="toolPage"><h2>Pomodoro Timer</h2><p style={{fontSize:'2rem',margin:0}}>{mm}:{ss}</p><div className="row"><button className="openBtn" onClick={()=>setRun(!run)}>{run?'Pause':'Start'}</button><button className="openBtn" onClick={()=>{setRun(false);setSec(25*60)}}>Reset</button></div></div>
}

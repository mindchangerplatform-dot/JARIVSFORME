"use client";
import {useEffect,useState} from "react";
import {Gate,Card,SectionHead,api} from "../../components/jarvis";

type Todo={id:string,title:string,subject:string,time:string,done:boolean};

export default function Todo(){
  const [items,setItems]=useState<Todo[]>([]);
  const [title,setTitle]=useState("");
  const [subject,setSubject]=useState("Physics");
  const [time,setTime]=useState("");
  const [busy,setBusy]=useState(false);

  async function load(){setItems(await api("/api/missions"))}
  useEffect(()=>{load().catch(()=>{})},[]);

  async function add(){
    if(!title.trim()||busy)return;
    setBusy(true);
    try{
      const x=await api("/api/missions",{method:"POST",body:JSON.stringify({title,subject,time})});
      setItems(v=>[x,...v]);setTitle("");setTime("");
    }finally{setBusy(false)}
  }
  async function toggle(x:Todo){
    const n=await api("/api/missions/"+x.id,{method:"PATCH",body:JSON.stringify({done:!x.done})});
    setItems(v=>v.map(a=>a.id===x.id?n:a));
  }
  async function remove(id:string){
    await api("/api/missions/"+id,{method:"DELETE"});
    setItems(v=>v.filter(x=>x.id!==id));
  }

  const open=items.filter(x=>!x.done).length;
  const done=items.filter(x=>x.done).length;

  return <Gate title="Todo" subtitle="Your simple execution list. JARVIS can also add and complete tasks from Voice Command.">
    <div className="stats">
      <div className="stat-card"><span className="stat-icon">○</span><small>Open</small><strong>{open}</strong><em>tasks remaining</em></div>
      <div className="stat-card"><span className="stat-icon">✓</span><small>Done</small><strong>{done}</strong><em>completed</em></div>
    </div>
    <Card>
      <SectionHead kicker="QUICK ADD" title="What needs to get done?"/>
      <div className="inline-form">
        <input value={title} onChange={e=>setTitle(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="e.g. Solve 25 Thermodynamics PYQs"/>
        <select value={subject} onChange={e=>setSubject(e.target.value)}><option>Physics</option><option>Chemistry</option><option>Mathematics</option><option>General</option></select>
        <input value={time} onChange={e=>setTime(e.target.value)} placeholder="Time (optional)"/>
        <button className="primary" onClick={add}>{busy?"Adding…":"＋ Add"}</button>
      </div>
    </Card>
    <Card>
      <SectionHead kicker="EXECUTION" title="Today's Todo"/>
      {items.length?items.map(x=><div className={"todo "+(x.done?"done":"")} key={x.id}>
        <button onClick={()=>toggle(x)}>{x.done?"✓":"○"}</button>
        <div><b>{x.title}</b><small>{x.time||"Flexible"} · {x.subject}</small></div>
        <button className="ghost" onClick={()=>remove(x.id)}>×</button>
      </div>):<div className="empty">No tasks yet. Add one or say: “JARVIS, add Thermodynamics PYQs to my Todo.”</div>}
    </Card>
  </Gate>
}
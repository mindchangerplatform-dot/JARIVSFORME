"use client";
import {useEffect,useMemo,useState} from "react";
import {Gate,Card,SectionHead,Stat,api} from "../../components/jarvis";

const subjects=["Physics","Chemistry","Mathematics"];

export default function Backlog(){
  const [items,setItems]=useState<any[]>([]);
  const [tab,setTab]=useState("Overview");
  const [subject,setSubject]=useState("Physics");
  const [topic,setTopic]=useState("");
  const [priority,setPriority]=useState("HIGH");
  const [notes,setNotes]=useState("");
  const [analysis,setAnalysis]=useState("");
  const [busy,setBusy]=useState(false);

  async function load(){setItems(await api("/api/backlog"))}
  useEffect(()=>{load().catch(()=>{})},[]);

  async function add(){
    if(!topic.trim()||busy)return;
    setBusy(true);
    try{
      const x=await api("/api/backlog",{method:"POST",body:JSON.stringify({subject,topic,priority,notes})});
      setItems(v=>[x,...v]);setTopic("");setNotes("");setTab("Overview");
    }finally{setBusy(false)}
  }

  async function patch(id:string,p:any){
    const x=await api("/api/backlog/"+id,{method:"PATCH",body:JSON.stringify(p)});
    setItems(v=>v.map(a=>a.id===id?x:a));
  }

  async function diagnose(){
    setBusy(true);setAnalysis("");
    try{
      const x=await api("/api/ai/chat",{method:"POST",body:JSON.stringify({message:"Act as my Backlog 360 recovery coach. Analyze my current unfinished backlog, group it by subject, identify the highest-impact bottlenecks, and give me an exact order for what to study next. Include a realistic 7-day recovery strategy. Do not invent syllabus data."})});
      setAnalysis(x.answer||"No diagnosis returned.");
    }catch(e:any){setAnalysis(e.message||"Diagnosis failed.")}finally{setBusy(false)}
  }

  const open=items.filter(x=>x.status!=="DONE");
  const high=open.filter(x=>x.priority==="HIGH");
  const counts=useMemo(()=>subjects.map(s=>({s,total:open.filter(x=>x.subject===s).length,done:items.filter(x=>x.subject===s&&x.status==="DONE").length})),[items]);

  return <Gate title="Backlog 360" subtitle="One recovery system for chapters, sub-topics, priorities and unfinished work. JARVIS uses it as long-term memory.">
    <div className="tabbar">{["Overview","Add / Manage","AI Recovery"].map(x=><button className={tab===x?"active":""} onClick={()=>setTab(x)} key={x}>{x}</button>)}</div>

    {tab==="Overview"&&<>
      <div className="stats">
        <Stat label="Open backlog" value={open.length} meta="unfinished items" icon="◒"/>
        <Stat label="High priority" value={high.length} meta="act first" icon="!"/>
        <Stat label="Completed" value={items.filter(x=>x.status==="DONE").length} meta="all time" icon="✓"/>
      </div>
      <Card>
        <SectionHead kicker="360 VIEW" title="Recovery map"/>
        <div className="tracker-grid">{counts.map(c=><div className="tracker-subject" key={c.s}><div className="tracker-ring"><b>{c.done}</b><small> / {c.done+c.total}</small></div><h3>{c.s}</h3><p>{c.total} open items</p></div>)}</div>
      </Card>
      <Card>
        <SectionHead kicker="NEXT ACTIONS" title="What is waiting?"/>
        {open.length?open.map(x=><div className="list-row" key={x.id}>
          <span className={"priority "+String(x.priority).toLowerCase()}>{x.priority}</span>
          <div><b>{x.subject} · {x.topic}</b><small>{x.notes||"No extra notes"}</small></div>
          <select value={x.priority} onChange={e=>patch(x.id,{priority:e.target.value})}><option>HIGH</option><option>MEDIUM</option><option>LOW</option></select>
          <button className="ghost" onClick={()=>patch(x.id,{status:"DONE"})}>✓ Done</button>
        </div>):<div className="empty">Backlog is clear.</div>}
      </Card>
    </>}

    {tab==="Add / Manage"&&<Card>
      <SectionHead kicker="CHAPTER → SUB-TOPIC" title="Add exact recovery work"/>
      <div className="form-grid">
        <label>Subject<select value={subject} onChange={e=>setSubject(e.target.value)}>{subjects.map(s=><option key={s}>{s}</option>)}</select></label>
        <label>Chapter / sub-topic<input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Thermodynamics → First Law"/></label>
        <label>Priority<select value={priority} onChange={e=>setPriority(e.target.value)}><option>HIGH</option><option>MEDIUM</option><option>LOW</option></select></label>
      </div>
      <label>Recovery notes<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Pending lecture, PYQs, revision, exact weak point…"/></label>
      <button className="primary" onClick={add}>{busy?"Saving…":"＋ Add to Backlog 360"}</button>
      <p className="muted">Voice works too: “JARVIS, add Circular Motion as high-priority backlog.”</p>
    </Card>}

    {tab==="AI Recovery"&&<Card>
      <SectionHead kicker="AI BACKLOG COACH" title="Turn backlog into an exact attack order"/>
      <p className="muted">JARVIS reads your backlog, recent study logs, Todo and Error Book before deciding what deserves attention.</p>
      <button className="primary" onClick={diagnose} disabled={busy}>{busy?"Analyzing…":"✦ Analyze my backlog now"}</button>
      {analysis&&<div className="ai-report"><h3>JARVIS diagnosis</h3><p>{analysis}</p></div>}
    </Card>}
  </Gate>

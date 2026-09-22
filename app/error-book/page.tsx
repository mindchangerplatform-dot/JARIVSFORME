"use client";
import {useEffect,useState} from "react";
import {Gate,Card,SectionHead,api} from "../../components/jarvis";

export default function ErrorBook(){
  const [tab,setTab]=useState("Log Mistake");
  const [errors,setErrors]=useState<any[]>([]);
  const [subject,setSubject]=useState("Physics");
  const [chapter,setChapter]=useState("");
  const [type,setType]=useState("Conceptual Gap");
  const [q,setQ]=useState("");
  const [attempt,setAttempt]=useState("");
  const [correct,setCorrect]=useState("");
  const [busy,setBusy]=useState(false);

  async function load(){setErrors(await api("/api/errors"))}
  useEffect(()=>{load().catch(()=>{})},[]);

  async function save(){
    if(!q.trim()||busy)return;
    setBusy(true);
    try{
      const e=await api("/api/errors",{method:"POST",body:JSON.stringify({subject,chapter,error_type:type,question:q,attempt,correct})});
      setErrors(v=>[e,...v]);setQ("");setAttempt("");setCorrect("");setTab("Vault");
    }finally{setBusy(false)}
  }
  async function update(id:string,patch:any){
    const e=await api("/api/errors/"+id,{method:"PATCH",body:JSON.stringify(patch)});
    setErrors(v=>v.map(x=>x.id===id?e:x));
  }

  const due=errors.filter(e=>!e.resolved&&e.next_review<=new Date().toISOString().slice(0,10)).length;

  return <Gate title="Error Book" subtitle="Permanent mistake memory. Every saved error becomes evidence JARVIS can use to teach and plan better.">
    <div className="tabbar">
      {["Log Mistake","Vault","Review Due"].map(x=><button className={tab===x?"active":""} onClick={()=>setTab(x)} key={x}>{x}</button>)}
    </div>
    {tab==="Log Mistake"&&<Card>
      <SectionHead kicker="SAVE THE FAILURE" title="Give JARVIS the exact mistake"/>
      <div className="form-grid">
        <label>Subject<select value={subject} onChange={e=>setSubject(e.target.value)}><option>Physics</option><option>Chemistry</option><option>Mathematics</option></select></label>
        <label>Chapter<input value={chapter} onChange={e=>setChapter(e.target.value)} placeholder="Thermodynamics"/></label>
        <label>Error type<select value={type} onChange={e=>setType(e.target.value)}><option>Conceptual Gap</option><option>Calculation Slip</option><option>Sign Convention</option><option>Formula Forgotten</option><option>Silly Mistake</option></select></label>
      </div>
      <label>Question / concept<textarea value={q} onChange={e=>setQ(e.target.value)} placeholder="Paste the question or describe the concept."/></label>
      <label>What did I do wrong?<textarea value={attempt} onChange={e=>setAttempt(e.target.value)} placeholder="Your approach / wrong step"/></label>
      <label>Correct idea / solution<textarea value={correct} onChange={e=>setCorrect(e.target.value)} placeholder="Correct method, formula, or explanation"/></label>
      <button className="primary" onClick={save}>{busy?"Saving…":"🧠 Save to Error Book"}</button>
      <p className="muted">You can also say: “JARVIS, save this as a Physics conceptual error…”</p>
    </Card>}
    {tab==="Vault"&&<Card>
      <SectionHead kicker="PERMANENT VAULT" title={errors.length+" saved mistakes"}/>
      {errors.length?errors.map((e,i)=><details className="error-item" key={e.id} open={i===0}>
        <summary><span className={e.resolved?"good":"bad"}>●</span> [{e.subject}] {e.chapter||"Unknown"} · {e.error_type}</summary>
        <div><p><b>Question:</b> {e.question}</p><p><b>Your mistake:</b> {e.attempt||"—"}</p><p><b>Correct:</b> {e.correct||"—"}</p>
          <div className="action-row">
            {!e.resolved&&<button className="secondary" onClick={()=>update(e.id,{resolved:true})}>✓ Mark mastered</button>}
            <button className="ghost" onClick={()=>update(e.id,{next_review:new Date(Date.now()+3*86400000).toISOString().slice(0,10),resolved:false})}>↻ Review in 3 days</button>
          </div>
        </div>
      </details>):<div className="empty">No mistakes saved yet.</div>}
    </Card>}
    {tab==="Review Due"&&<Card>
      <SectionHead kicker="SPACED REVIEW" title={due+" mistakes due now"}/>
      {errors.filter(e=>!e.resolved&&e.next_review<=new Date().toISOString().slice(0,10)).map(e=><div className="list-row" key={e.id}>
        <div><b>{e.subject} · {e.chapter||"Unknown"}</b><small>{e.error_type} · review date {e.next_review}</small></div>
        <button className="secondary" onClick={()=>update(e.id,{resolved:true})}>✓ Mastered</button>
      </div>)}
      {!due&&<div className="empty">Nothing is due right now. Good.</div>}
    </Card>}
  </Gate>
}

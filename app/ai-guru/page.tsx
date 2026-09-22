"use client";
import {useEffect,useRef,useState} from "react";
import {Gate,api} from "../../components/jarvis";

type Msg={role:"user"|"assistant",content:string};

export default function AIGuru(){
  const [msg,setMsg]=useState("");
  const [busy,setBusy]=useState(false);
  const [history,setHistory]=useState<Msg[]>([]);
  const [listening,setListening]=useState(false);
  const [voiceStatus,setVoiceStatus]=useState("Voice command ready");
  const [speaking,setSpeaking]=useState(false);
  const [autoVoice,setAutoVoice]=useState(true);
  const rec=useRef<any>(null);

  useEffect(()=>()=>{try{rec.current?.stop()}catch{}},[]);

  async function speak(text:string){
    if(!text||speaking)return;
    setSpeaking(true);
    try{
      const token=localStorage.getItem("jarvis_token")||"";
      const r=await fetch("https://jarivsforme-api.onrender.com/api/voice/speak",{
        method:"POST",
        headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},
        body:JSON.stringify({text})
      });
      if(!r.ok)throw new Error();
      const blob=await r.blob();
      const url=URL.createObjectURL(blob);
      const audio=new Audio(url);
      audio.onended=()=>{URL.revokeObjectURL(url);setSpeaking(false)};
      audio.onerror=()=>{URL.revokeObjectURL(url);setSpeaking(false)};
      await audio.play();
    }catch{
      try{
        const u=new SpeechSynthesisUtterance(text);
        u.lang="en-IN";u.rate=.95;
        u.onend=()=>setSpeaking(false);u.onerror=()=>setSpeaking(false);
        speechSynthesis.cancel();speechSynthesis.speak(u);
      }catch{setSpeaking(false)}
    }
  }

  async function ask(text:string,voice=false){
    const q=text.trim();
    if(!q||busy)return;
    setMsg("");
    setVoiceStatus(voice?"JARVIS is thinking…":"");
    setBusy(true);
    setHistory(h=>[...h,{role:"user",content:q}]);
    try{
      const x=await api("/api/ai/chat",{method:"POST",body:JSON.stringify({message:q})});
      const answer=x.answer||"I couldn't generate a response.";
      setHistory(h=>[...h,{role:"assistant",content:answer}]);
      if(voice&&autoVoice) speak(answer);
    }catch(e:any){
      const answer=e.message||"AI request failed.";
      setHistory(h=>[...h,{role:"assistant",content:answer}]);
      if(voice&&autoVoice)speak(answer);
    }finally{setBusy(false);if(!voice)setVoiceStatus("")}
  }

  async function voiceCommand(text:string){
    if(!text.trim())return;
    setBusy(true);setVoiceStatus("Executing voice command…");
    setHistory(h=>[...h,{role:"user",content:"🎙 "+text}]);
    try{
      const x=await api("/api/ai/command",{method:"POST",body:JSON.stringify({command:text})});
      const answer=x.message||"Done.";
      setHistory(h=>[...h,{role:"assistant",content:answer}]);
      if(autoVoice)await speak(answer);
    }catch(e:any){
      const answer=e.message||"Voice command failed.";
      setHistory(h=>[...h,{role:"assistant",content:answer}]);
      if(autoVoice)await speak(answer);
    }finally{setBusy(false);setVoiceStatus("Voice command ready")}
  }

  function startVoice(){
    const SR=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
    if(!SR){setVoiceStatus("Chrome voice input is required.");return}
    if(listening){try{rec.current?.stop()}catch{};setListening(false);return}
    const r=new SR();
    rec.current=r;
    r.lang="en-IN";r.interimResults=true;r.continuous=false;
    r.onstart=()=>{setListening(true);setVoiceStatus("Listening… say a command or ask JARVIS anything");};
    r.onresult=(e:any)=>{
      let finalText="";
      let live="";
      for(let i=e.resultIndex;i<e.results.length;i++){
        const t=e.results[i][0].transcript;
        live+=t;
        if(e.results[i].isFinal)finalText+=t;
      }
      if(finalText.trim()){setMsg(finalText.trim());voiceCommand(finalText.trim())}
      else if(live)setMsg(live);
    };
    r.onerror=()=>{setListening(false);setVoiceStatus("Could not hear that. Tap the mic and try again.")};
    r.onend=()=>setListening(false);
    r.start();
  }

  return <Gate title="AI Tutor" subtitle="Your personal JEE tutor. Ask doubts, learn concepts, plan study, and control Todo / Backlog / Error Book with your voice.">
    <div className="ai-layout">
      <aside className="chat-sidebar">
        <button className="primary full" onClick={()=>{setHistory([]);setMsg("");}}>＋ New Chat</button>
        <div className="side-label">TRY JARVIS</div>
        {[
          "Teach me Thermodynamics from basics.",
          "Analyze my backlog and tell me what to do first.",
          "Explain this JEE question step by step.",
          "I made a mistake. Help me understand why."
        ].map(x=><button className="chat-item" key={x} onClick={()=>setMsg(x)}>{x}</button>)}
        <div className="voice-mini">
          <span className={listening?"pulse":""}>●</span>
          <div><b>{listening?"Listening":"Voice ready"}</b><small>English / Hinglish</small></div>
        </div>
      </aside>

      <main className="chat-main">
        <div className="ai-toolbar">
          <div><span className="status-dot"/> JARVIS AI online</div>
          <label className="voice-toggle"><input type="checkbox" checked={autoVoice} onChange={e=>setAutoVoice(e.target.checked)}/> Auto voice</label>
        </div>

        <div className="chat-scroll">
          {!history.length&&<div className="ai-welcome">
            <span className="ai-orb">✦</span>
            <h2>Talk to JARVIS</h2>
            <p>Type a doubt or press the microphone. Voice commands can actually update your Todo, Backlog 360 and Error Book.</p>
            <div className="suggestions">
              {["JARVIS, add 20 Thermodynamics PYQs to my Todo.","JARVIS, add Circular Motion as high-priority backlog.","JARVIS, save this as a Physics conceptual error."].map(x=><button key={x} onClick={()=>setMsg(x)}>{x}</button>)}
            </div>
          </div>}
          {history.map((m,i)=><div className={"chat-bubble "+m.role} key={i}>
            <span>{m.role==="user"?"You":"JARVIS"}</span><p>{m.content}</p>
            {m.role==="assistant"&&<button className="speak-btn" onClick={()=>speak(m.content)}>{speaking?"🔊 Speaking…":"🔊 Speak"}</button>}
          </div>)}
          {busy&&<div className="chat-bubble assistant"><span>JARVIS</span><p>Thinking…</p></div>}
        </div>

        <div className="composer">
          <textarea value={msg} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();ask(msg)}}} placeholder="Ask your AI tutor anything…"/>
          <div>
            <button className={listening?"voice-active":"voice-btn"} onClick={startVoice}>{listening?"🔴 Listening…":"🎙 Voice command"}</button>
            <button className="primary" onClick={()=>ask(msg)} disabled={busy}>{busy?"Thinking…":"Send ↑"}</button>
          </div>
          {voiceStatus&&<small className="voice-status">{voiceStatus}</small>}
        </div>
      </main>
    </div>
  </Gate>

"use client";

import { useMemo, useState } from "react";

const initial = {
  hours: 5.5,
  questions: 83,
  accuracy: 68,
  backlog: 12,
  streak: 4
};

export default function Home() {
  const [stats, setStats] = useState(initial);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  const progress = useMemo(() => Math.min(100, Math.round((stats.hours / 8) * 100)), [stats.hours]);

  function logStudy() {
    setStats((s) => ({ ...s, hours: Math.min(12, +(s.hours + 0.5).toFixed(1)) }));
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">J</span><div><strong>JARVIS</strong><small>FOR ME</small></div></div>
        <nav>
          <a className="active">Dashboard</a>
          <a>AI Mentor</a>
          <a>Study Planner</a>
          <a>Backlog</a>
          <a>Practice</a>
          <a>Tests</a>
          <a>Error Book</a>
          <a>Analytics</a>
        </nav>
        <div className="mentor-card">
          <span className="pulse" />
          <div><b>Mentor online</b><small>Ready to plan your day.</small></div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div><span className="eyebrow">TUESDAY · 22 SEPTEMBER</span><h1>Good evening, warrior.</h1><p>Your JEE journey, tracked in one place.</p></div>
          <button className="ghost">⚙ Settings</button>
        </header>

        <div className="hero">
          <div><span className="tag">TODAY'S MISSION</span><h2>Make today count.</h2><p>8 hours planned · 120 questions · revise Thermodynamics.</p></div>
          <button className="primary" onClick={logStudy}>＋ Log 30 min</button>
        </div>

        <div className="stats">
          <Stat label="Study hours" value={stats.hours.toFixed(1)} suffix="/ 8h" meta="Today's progress" />
          <Stat label="Questions" value={stats.questions} suffix="/ 120" meta="67 questions left" />
          <Stat label="Accuracy" value={stats.accuracy + "%"} suffix="" meta="Target ≥ 75%" />
          <Stat label="Backlog" value={stats.backlog} suffix="" meta="3 due for revision" />
        </div>

        <div className="grid">
          <section className="panel wide">
            <div className="panel-head"><div><span className="eyebrow">DAILY PLAN</span><h3>Today's study blocks</h3></div><span className="status">AI generated</span></div>
            <Plan time="6:00–7:30 PM" title="Chemistry · Thermodynamics" detail="Concept revision + 25 PYQs" done />
            <Plan time="7:45–9:15 PM" title="Mathematics · Circular Motion" detail="Theory + 30 mixed questions" />
            <Plan time="9:45–11:15 PM" title="Physics · Laws of Motion" detail="Friction + FBD practice" />
          </section>

          <section className="panel">
            <div className="panel-head"><div><span className="eyebrow">AI MENTOR</span><h3>Quick check-in</h3></div></div>
            <p className="mentor-text">“You are at {stats.hours}h today. Finish the next block before switching topics.”</p>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tell JARVIS what you studied..." />
            <button className="primary full" onClick={() => setSaved(true)}>{saved ? "Saved ✓" : "Update mentor"}</button>
          </section>

          <section className="panel">
            <div className="panel-head"><div><span className="eyebrow">BACKLOG</span><h3>Needs attention</h3></div><span className="count">{stats.backlog}</span></div>
            <Backlog subject="Chemistry" topic="Thermodynamics" priority="HIGH" />
            <Backlog subject="Maths" topic="Circular Motion" priority="HIGH" />
            <Backlog subject="Physics" topic="Laws of Motion" priority="MEDIUM" />
          </section>

          <section className="panel wide">
            <div className="panel-head"><div><span className="eyebrow">STREAK</span><h3>Consistency</h3></div><b>{stats.streak} days</b></div>
            <div className="progress-row"><span>Weekly study target</span><b>{progress}%</b></div>
            <div className="progress"><i style={{ width: progress + "%" }} /></div>
            <div className="days">{["M","T","W","T","F","S","S"].map((d, i) => <span key={i} className={i < 4 ? "filled" : ""}>{d}</span>)}</div>
          </section>
        </div>

        <footer>JARVISFORME · AI JEE Mentor <span>Supabase + OpenAI + ElevenLabs ready</span></footer>
      </section>
    </main>
  );
}

function Stat({label, value, suffix, meta}:{label:string;value:string|number;suffix:string;meta:string}) {
  return <div className="stat"><span>{label}</span><strong>{value}<em>{suffix}</em></strong><small>{meta}</small></div>;
}
function Plan({time,title,detail,done=false}:{time:string;title:string;detail:string;done?:boolean}) {
  return <div className={"plan " + (done ? "done" : "")}><span className="check">{done ? "✓" : ""}</span><div><small>{time}</small><b>{title}</b><p>{detail}</p></div></div>;
}
function Backlog({subject,topic,priority}:{subject:string;topic:string;priority:string}) {
  return <div className="backlog"><div><small>{subject}</small><b>{topic}</b></div><span className={priority==="HIGH"?"high":"medium"}>{priority}</span></div>;
}
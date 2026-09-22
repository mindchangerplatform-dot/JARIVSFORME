require("dotenv").config();
const express=require("express");
const cors=require("cors");
const bcrypt=require("bcryptjs");
const jwt=require("jsonwebtoken");
const OpenAI=require("openai");
const {Pool}=require("pg");

const app=express();
app.use(cors({origin:true,credentials:true}));
app.use(express.json({limit:"1mb"}));

const PORT=process.env.PORT||10000;
const JWT_SECRET=process.env.JWT_SECRET||"change-me-in-render";
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL?{rejectUnauthorized:false}:false});
const openai=process.env.OPENAI_API_KEY?new OpenAI({apiKey:process.env.OPENAI_API_KEY}):null;

async function initDb(){
  if(!process.env.DATABASE_URL) return;
  await pool.query(`
    create table if not exists users(
      id uuid primary key default gen_random_uuid(),
      email text unique not null,
      password_hash text not null,
      name text not null default 'Student',
      target_exam text default 'JEE Main + Advanced',
      target_year int,
      daily_target_hours numeric(4,1) default 8,
      created_at timestamptz not null default now()
    );
    create table if not exists study_logs(
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      log_date date not null default current_date,
      study_minutes int not null default 0,
      questions int not null default 0,
      correct int not null default 0,
      notes text,
      created_at timestamptz not null default now()
    );
    create table if not exists backlog(
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      subject text not null,
      topic text not null,
      priority text not null default 'MEDIUM',
      status text not null default 'OPEN',
      due_date date,
      notes text,
      created_at timestamptz not null default now()
    );
    create table if not exists daily_plans(
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      plan_date date not null default current_date,
      subject text not null,
      topic text not null,
      start_time text,
      end_time text,
      task text,
      completed boolean not null default false,
      created_at timestamptz not null default now()
    );
    create table if not exists mentor_memory(
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      memory_type text not null,
      content text not null,
      importance int not null default 3,
      created_at timestamptz not null default now()
    );
    create table if not exists mission_tasks(id uuid primary key default gen_random_uuid(),user_id uuid not null references users(id) on delete cascade,title text not null,subject text default 'General',time text,done boolean not null default false,created_at timestamptz not null default now());
    create table if not exists error_book(id uuid primary key default gen_random_uuid(),user_id uuid not null references users(id) on delete cascade,subject text not null,chapter text,error_type text,question text,attempt text,correct text,resolved boolean not null default false,next_review date,created_at timestamptz not null default now());
    create table if not exists chat_messages(
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      role text not null check(role in ('user','assistant')),
      content text not null,
      created_at timestamptz not null default now()
    );
    create index if not exists study_logs_user_date on study_logs(user_id,log_date);
    create index if not exists backlog_user_status on backlog(user_id,status);
    create index if not exists chat_user_date on chat_messages(user_id,created_at);
  `);
}

function auth(req,res,next){
  const h=req.headers.authorization||"";
  const token=h.startsWith("Bearer ")?h.slice(7):null;
  if(!token) return res.status(401).json({error:"Login required"});
  try{req.user=jwt.verify(token,JWT_SECRET);next();}catch{return res.status(401).json({error:"Session expired"});}
}

app.get("/health",async(req,res)=>{
  try{if(process.env.DATABASE_URL) await pool.query("select 1");res.json({ok:true,ai:!!openai,db:!!process.env.DATABASE_URL,voice:true});}
  catch(e){res.status(503).json({ok:false,error:e.message});}
});

app.post("/api/auth/register",async(req,res)=>{
  try{
    const {email,password,name}=req.body||{};
    if(!email||!password||password.length<6) return res.status(400).json({error:"Email and a password of at least 6 characters are required"});
    const hash=await bcrypt.hash(password,12);
    const r=await pool.query("insert into users(email,password_hash,name) values($1,$2,$3) returning id,email,name,target_exam,target_year,daily_target_hours",[email.toLowerCase().trim(),hash,name||"Student"]);
    const user=r.rows[0];
    const token=jwt.sign({id:user.id,email:user.email,name:user.name},JWT_SECRET,{expiresIn:"30d"});
    res.json({token,user});
  }catch(e){res.status(e.code==="23505"?409:500).json({error:e.code==="23505"?"Email already registered":"Registration failed"});}
});

app.post("/api/auth/login",async(req,res)=>{
  try{
    const {email,password}=req.body||{};
    const r=await pool.query("select id,email,name,password_hash,target_exam,target_year,daily_target_hours from users where email=$1",[String(email||"").toLowerCase().trim()]);
    if(!r.rowCount||!(await bcrypt.compare(password||"",r.rows[0].password_hash))) return res.status(401).json({error:"Invalid email or password"});
    const user=r.rows[0]; delete user.password_hash;
    const token=jwt.sign({id:user.id,email:user.email,name:user.name},JWT_SECRET,{expiresIn:"30d"});
    res.json({token,user});
  }catch(e){res.status(500).json({error:"Login failed"});}
});

app.get("/api/me",auth,async(req,res)=>{
  const r=await pool.query("select id,email,name,target_exam,target_year,daily_target_hours from users where id=$1",[req.user.id]);
  res.json(r.rows[0]||null);
});

app.get("/api/dashboard",auth,async(req,res)=>{
  const [logs,backlog,plans]=await Promise.all([
    pool.query("select coalesce(sum(study_minutes),0) minutes,coalesce(sum(questions),0) questions,coalesce(sum(correct),0) correct from study_logs where user_id=$1 and log_date>=current_date-6",[req.user.id]),
    pool.query("select count(*) total,count(*) filter(where priority='HIGH' and status<>'DONE') high from backlog where user_id=$1 and status<>'DONE'",[req.user.id]),
    pool.query("select * from daily_plans where user_id=$1 and plan_date=current_date order by start_time nulls last",[req.user.id])
  ]);
  const s=logs.rows[0]; const accuracy=Number(s.questions)?Math.round(Number(s.correct)/Number(s.questions)*100):0;
  res.json({hours:Number(s.minutes)/60,questions:Number(s.questions),accuracy,backlog:Number(backlog.rows[0].total),highBacklog:Number(backlog.rows[0].high),plans:plans.rows});
});

app.post("/api/study/log",auth,async(req,res)=>{
  const {minutes=30,questions=0,correct=0,notes=""}=req.body||{};
  const r=await pool.query("insert into study_logs(user_id,study_minutes,questions,correct,notes) values($1,$2,$3,$4,$5) returning *",[req.user.id,Math.max(0,Number(minutes)),Math.max(0,Number(questions)),Math.max(0,Number(correct)),notes]);
  res.json(r.rows[0]);
});

app.get("/api/backlog",auth,async(req,res)=>{
  const r=await pool.query("select * from backlog where user_id=$1 order by case priority when 'HIGH' then 1 when 'MEDIUM' then 2 else 3 end,created_at desc",[req.user.id]);res.json(r.rows);
});

app.post("/api/backlog",auth,async(req,res)=>{
  const {subject,topic,priority="MEDIUM",notes=""}=req.body||{};
  const r=await pool.query("insert into backlog(user_id,subject,topic,priority,notes) values($1,$2,$3,$4,$5) returning *",[req.user.id,subject,topic,priority,notes]);res.json(r.rows[0]);
});

async function buildContext(userId){
  const [u,l,b,p,m,c]=await Promise.all([
    pool.query("select name,target_exam,target_year,daily_target_hours from users where id=$1",[userId]),
    pool.query("select log_date,study_minutes,questions,correct,notes from study_logs where user_id=$1 order by log_date desc,created_at desc limit 20",[userId]),
    pool.query("select subject,topic,priority,status,due_date,notes from backlog where user_id=$1 and status<>'DONE' order by case priority when 'HIGH' then 1 when 'MEDIUM' then 2 else 3 end limit 30",[userId]),
    pool.query("select plan_date,subject,topic,start_time,end_time,task,completed from daily_plans where user_id=$1 order by plan_date desc limit 20",[userId]),
    pool.query("select memory_type,content,importance from mentor_memory where user_id=$1 order by importance desc,created_at desc limit 20",[userId]),
    pool.query("select role,content from chat_messages where user_id=$1 order by created_at desc limit 12",[userId])
  ]);
  return JSON.stringify({profile:u.rows[0],recentStudy:l.rows,backlog:b.rows,plans:p.rows,memory:m.rows,recentChat:c.rows.reverse()});
}

app.patch("/api/backlog/:id",auth,async(req,res)=>{const {status,priority}=req.body||{};const r=await pool.query("update backlog set status=coalesce($1,status),priority=coalesce($2,priority) where id=$3 and user_id=$4 returning *",[status||null,priority||null,req.params.id,req.user.id]);if(!r.rowCount)return res.status(404).json({error:"Backlog item not found"});res.json(r.rows[0]);});
app.get("/api/missions",auth,async(req,res)=>{const r=await pool.query("select * from mission_tasks where user_id=$1 order by done,created_at desc",[req.user.id]);res.json(r.rows);});
app.post("/api/missions",auth,async(req,res)=>{const {title,subject="General",time=""}=req.body||{};if(!title)return res.status(400).json({error:"Title required"});const r=await pool.query("insert into mission_tasks(user_id,title,subject,time) values($1,$2,$3,$4) returning *",[req.user.id,title,subject,time]);res.json(r.rows[0]);});
app.patch("/api/missions/:id",auth,async(req,res)=>{const r=await pool.query("update mission_tasks set done=$1 where id=$2 and user_id=$3 returning *",[!!req.body.done,req.params.id,req.user.id]);res.json(r.rows[0]||null);});
app.delete("/api/missions/:id",auth,async(req,res)=>{await pool.query("delete from mission_tasks where id=$1 and user_id=$2",[req.params.id,req.user.id]);res.json({ok:true});});
app.get("/api/errors",auth,async(req,res)=>{const r=await pool.query("select * from error_book where user_id=$1 order by resolved,next_review nulls last,created_at desc",[req.user.id]);res.json(r.rows);});
app.post("/api/errors",auth,async(req,res)=>{const {subject,chapter="",error_type="Conceptual Gap",question="",attempt="",correct=""}=req.body||{};const r=await pool.query("insert into error_book(user_id,subject,chapter,error_type,question,attempt,correct,next_review) values($1,$2,$3,$4,$5,$6,$7,current_date+1) returning *",[req.user.id,subject,chapter,error_type,question,attempt,correct]);res.json(r.rows[0]);});
app.patch("/api/errors/:id",auth,async(req,res)=>{const r=await pool.query("update error_book set resolved=coalesce($1,resolved),next_review=coalesce($2,next_review) where id=$3 and user_id=$4 returning *",[req.body.resolved??null,req.body.next_review||null,req.params.id,req.user.id]);res.json(r.rows[0]||null);});

app.post("/api/ai/chat",auth,async(req,res)=>{
  const message=String(req.body?.message||"").trim();
  if(!message) return res.status(400).json({error:"Message is required"});
  if(!openai) return res.status(503).json({error:"AI is not configured yet. Add OPENAI_API_KEY in Render."});
  const context=await buildContext(req.user.id);
  await pool.query("insert into chat_messages(user_id,role,content) values($1,'user',$2)",[req.user.id,message]);
  try{
    const response=await openai.responses.create({
      model:process.env.OPENAI_MODEL||"gpt-5-mini",
      instructions:"You are JARVISFORME, a direct but supportive JEE Main + Advanced study mentor. Use the student's actual data. Never invent progress. Give practical next actions. If asked for a plan, make it realistic and time-blocked. Keep answers concise unless a lesson is requested. You can understand Hinglish.",
      input:"STUDENT CONTEXT:\n"+context+"\n\nSTUDENT MESSAGE:\n"+message
    });
    const answer=response.output_text||"I couldn't generate a response.";
    await pool.query("insert into chat_messages(user_id,role,content) values($1,'assistant',$2)",[req.user.id,answer]);
    res.json({answer});
  }catch(e){res.status(500).json({error:"AI request failed",detail:e.message});}
});

app.post("/api/ai/plan",auth,async(req,res)=>{
  if(!openai) return res.status(503).json({error:"AI is not configured yet. Add OPENAI_API_KEY in Render."});
  const context=await buildContext(req.user.id);
  const response=await openai.responses.create({
    model:process.env.OPENAI_MODEL||"gpt-5-mini",
    instructions:"Create a practical JEE study plan for today from the supplied student context. Return ONLY valid JSON array. Each item must have subject,topic,start_time,end_time,task. Do not exceed the student's daily target hours. Prioritize overdue/high backlog and weak performance.",
    input:context
  });
  let text=response.output_text||"[]";
  try{const plan=JSON.parse(text.replace(/^```json|^```|```$/g,"").trim());
    await pool.query("delete from daily_plans where user_id=$1 and plan_date=current_date",[req.user.id]);
    for(const x of plan) await pool.query("insert into daily_plans(user_id,subject,topic,start_time,end_time,task) values($1,$2,$3,$4,$5,$6)",[req.user.id,x.subject,x.topic,x.start_time,x.end_time,x.task]);
    res.json({plan});
  }catch{res.status(500).json({error:"AI returned invalid plan data"});}
});

app.post("/api/voice/speak",auth,async(req,res)=>{
  const text=String(req.body?.text||"").trim();
  if(!text) return res.status(400).json({error:"Text required"});
  if(!process.env.ELEVENLABS_API_KEY||!process.env.ELEVENLABS_VOICE_ID) return res.status(503).json({error:"ElevenLabs is not configured; browser voice remains available."});
  try{
    const r=await fetch("https://api.elevenlabs.io/v1/text-to-speech/"+encodeURIComponent(process.env.ELEVENLABS_VOICE_ID),{
      method:"POST",
      headers:{"xi-api-key":process.env.ELEVENLABS_API_KEY,"Content-Type":"application/json","Accept":"audio/mpeg"},
      body:JSON.stringify({text:text.slice(0,3000),model_id:process.env.ELEVENLABS_MODEL_ID||"eleven_multilingual_v2"})
    });
    if(!r.ok) return res.status(502).json({error:"ElevenLabs request failed"});
    const buf=Buffer.from(await r.arrayBuffer());
    res.setHeader("Content-Type","audio/mpeg");res.send(buf);
  }catch(e){res.status(500).json({error:"Voice generation failed"});}
});

app.post("/api/ai/memory",auth,async(req,res)=>{
  const {content,memory_type="preference",importance=3}=req.body||{};
  if(!content) return res.status(400).json({error:"Memory content required"});
  const r=await pool.query("insert into mentor_memory(user_id,memory_type,content,importance) values($1,$2,$3,$4) returning *",[req.user.id,memory_type,content,importance]);
  res.json(r.rows[0]);
});

app.listen(PORT,"0.0.0.0",async()=>{
  try{await initDb();console.log("JARVIS API running on",PORT);}catch(e){console.error("DB init failed",e);}
});

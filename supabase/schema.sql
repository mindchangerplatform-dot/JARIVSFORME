-- JARVISFORME Supabase schema
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  target_exam text default 'JEE Main + Advanced',
  target_year int,
  daily_target_hours numeric(4,1) default 8,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.backlog (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null check (subject in ('Physics','Chemistry','Maths')),
  topic text not null,
  priority text not null default 'MEDIUM' check (priority in ('LOW','MEDIUM','HIGH')),
  status text not null default 'OPEN' check (status in ('OPEN','IN_PROGRESS','DONE')),
  due_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  study_hours numeric(4,1) not null default 0,
  questions int not null default 0,
  correct int not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  unique(user_id, log_date)
);

create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  topic text not null,
  questions int not null default 0,
  correct int not null default 0,
  duration_minutes int not null default 0,
  session_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_date date not null default current_date,
  subject text not null,
  topic text not null,
  start_time time,
  end_time time,
  task text,
  completed boolean not null default false,
  source text not null default 'ai',
  created_at timestamptz not null default now()
);

create table if not exists public.mock_tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  test_name text not null,
  test_date date not null default current_date,
  total_questions int not null default 0,
  correct int not null default 0,
  score numeric(8,2),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.mentor_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  memory_type text not null,
  content text not null,
  importance int not null default 3 check (importance between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists backlog_user_status_idx on public.backlog(user_id, status);
create index if not exists logs_user_date_idx on public.daily_logs(user_id, log_date desc);
create index if not exists practice_user_date_idx on public.practice_sessions(user_id, session_date desc);
create index if not exists plans_user_date_idx on public.daily_plans(user_id, plan_date desc);
create index if not exists memory_user_type_idx on public.mentor_memory(user_id, memory_type);

alter table public.profiles enable row level security;
alter table public.backlog enable row level security;
alter table public.daily_logs enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.daily_plans enable row level security;
alter table public.mock_tests enable row level security;
alter table public.mentor_memory enable row level security;

drop policy if exists "profiles own rows" on public.profiles;
create policy "profiles own rows" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "backlog own rows" on public.backlog;
create policy "backlog own rows" on public.backlog for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "logs own rows" on public.daily_logs;
create policy "logs own rows" on public.daily_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "practice own rows" on public.practice_sessions;
create policy "practice own rows" on public.practice_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "plans own rows" on public.daily_plans;
create policy "plans own rows" on public.daily_plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "tests own rows" on public.mock_tests;
create policy "tests own rows" on public.mock_tests for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "memory own rows" on public.mentor_memory;
create policy "memory own rows" on public.mentor_memory for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- CyberAI initial schema

create table if not exists module_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  module_id text not null,
  score int not null,
  max_score int not null,
  answers jsonb not null default '[]',
  completed_at timestamptz default now(),
  unique (user_id, module_id)
);

create table if not exists certificates (
  user_id uuid primary key references auth.users,
  cert_id text not null,
  issued_at timestamptz default now()
);

create table if not exists ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  endpoint text not null,
  created_at timestamptz default now()
);

-- RLS
alter table module_progress enable row level security;
alter table certificates enable row level security;
alter table ai_usage enable row level security;

create policy "Users own their progress"
  on module_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users own their certificates"
  on certificates for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users own their usage"
  on ai_usage for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

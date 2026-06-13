-- Migration 002: robust scoring + lesson progress

-- Add new columns to module_progress
alter table module_progress
  add column if not exists passed boolean not null default false,
  add column if not exists max_served_points int,
  add column if not exists served_question_ids jsonb not null default '[]',
  add column if not exists option_orders jsonb not null default '{}';

-- lesson_progress: per-user, per-item completion tracking for the Learn tab
create table if not exists lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  module_id text not null,
  item_id text not null,
  completed_at timestamptz default now(),
  unique (user_id, module_id, item_id)
);

alter table lesson_progress enable row level security;

create policy "Users own their lesson progress"
  on lesson_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

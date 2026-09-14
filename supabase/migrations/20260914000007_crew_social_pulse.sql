-- App #7 — Social Pulse (analytics crew). Connects socials → what content works, best times, growth,
-- cross-platform insights, prioritized recommendations. Per-run + per-agent trail, RLS per user.
-- Runs on the universal engine (crew_id "social_pulse", schema "social_report").

create table if not exists public.social_pulse_runs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  account_id   uuid,
  task_id      uuid references public.tasks on delete set null,
  platforms    text[] not null default '{}',
  goal         text,
  time_range   text,
  results      jsonb,                 -- the full social_report (blocks)
  total_cost   numeric(12,6) not null default 0,
  status       text not null default 'running',   -- running | done | failed
  created_at   timestamptz not null default now()
);
create index if not exists social_pulse_runs_user_idx on public.social_pulse_runs (user_id, created_at desc);
alter table public.social_pulse_runs enable row level security;
drop policy if exists "own social_pulse_runs" on public.social_pulse_runs;
create policy "own social_pulse_runs" on public.social_pulse_runs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Per-agent trail. run_id = social_pulse_runs.id (matches the engine's agentCall insert convention).
create table if not exists public.social_pulse_run_steps (
  id          uuid primary key default gen_random_uuid(),
  run_id      uuid not null references public.social_pulse_runs on delete cascade,
  user_id     uuid not null references auth.users on delete cascade,
  account_id  uuid,
  agent       text not null,   -- analyst | insighter | verifier
  input       jsonb,
  output      jsonb,
  model_used  text,
  tokens_in   int not null default 0,
  tokens_out  int not null default 0,
  cost_usd    numeric(12,6) not null default 0,
  status      text not null default 'ok',
  created_at  timestamptz not null default now()
);
create index if not exists social_pulse_run_steps_run_idx on public.social_pulse_run_steps (run_id, created_at);
alter table public.social_pulse_run_steps enable row level security;
drop policy if exists "own social_pulse_run_steps" on public.social_pulse_run_steps;
create policy "own social_pulse_run_steps" on public.social_pulse_run_steps for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into public.mini_apps
  (slug, name, description, category, icon, who_for, tags, autonomy_level, brief_template, config_schema, workflow_def, est_credit_cost, is_published, sort_order)
values
(
  'social-pulse',
  'Social Pulse',
  'Connect your socials and a specialist crew tells you what''s actually working — which content types and posting times win, your best and worst posts (with fixes), follower growth, and a prioritized plan. The job Sprout Social does at $249/mo, pay-per-use.',
  'analytics', '📊',
  'Small businesses, solopreneurs and creators who post regularly but have no affordable way to know what''s working.',
  array['social','analytics','instagram','tiktok','performance','insights','growth'], 3,
  'Analyze {{platforms}} over {{time_range}} and tell me {{goal}}.',
  '[
    {"key":"platforms","question":"Which platforms do you want to analyze?","type":"multi","options":["Instagram","TikTok","Facebook","LinkedIn","All connected"]},
    {"key":"goal","question":"What do you want to learn?","type":"choice","options":["What content works best","Best times to post","Growth trend","Full analysis"]},
    {"key":"time_range","question":"Set your analysis window","type":"choice","options":["Last 7 days","Last 14 days","Last 30 days"]},
    {"key":"output_target","question":"Where should it go?","type":"choice","options":["Chat","Email","Dashboard"]}
  ]'::jsonb,
  '{"steps":[{"id":"pulse","kind":"crew","crew_id":"social_pulse","task_type":"reasoning","schema":"social_report"}]}'::jsonb,
  1.5, true, 15
)
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category, icon = excluded.icon,
  who_for = excluded.who_for, tags = excluded.tags, autonomy_level = excluded.autonomy_level,
  brief_template = excluded.brief_template, config_schema = excluded.config_schema, workflow_def = excluded.workflow_def,
  est_credit_cost = excluded.est_credit_cost, is_published = excluded.is_published, sort_order = excluded.sort_order;

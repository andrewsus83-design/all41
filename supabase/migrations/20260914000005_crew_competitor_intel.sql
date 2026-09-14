-- App #6 — Competitor Intelligence (crew tier). Watch competitors → what changed, why it matters, how to respond.
-- Per-run + per-agent trail, RLS per user, account_id (tenancy-ready). Runs on the universal engine (crew_id "competitor_intel").
-- Snapshots + intel also compound in the graph (knowledge_nodes) — the living competitive memory.

-- The "watch" config (a scheduled watch = a user_app_instance; this table is the durable watch profile — future watch-management UI).
create table if not exists public.competitor_watches (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  account_id   uuid,
  competitors  jsonb,                 -- [{name, url}]
  focus        text[] not null default '{}',
  positioning  text,
  schedule     text,                  -- once | weekly | monthly
  output_depth text,                  -- battlecard | changes_only
  status       text not null default 'active',
  created_at   timestamptz not null default now()
);
create index if not exists competitor_watches_user_idx on public.competitor_watches (user_id, created_at desc);
alter table public.competitor_watches enable row level security;
drop policy if exists "own competitor_watches" on public.competitor_watches;
create policy "own competitor_watches" on public.competitor_watches for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.competitor_runs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  account_id   uuid,
  watch_id     uuid references public.competitor_watches on delete set null,
  task_id      uuid references public.tasks on delete set null,
  snapshot     jsonb,                 -- current captured state per competitor
  changes      jsonb,                 -- material changes (post-classification)
  intel        jsonb,                 -- analysis + battlecard + trends (the full report)
  total_cost   numeric(12,6) not null default 0,
  status       text not null default 'running',   -- running | done | failed
  created_at   timestamptz not null default now()
);
create index if not exists competitor_runs_user_idx on public.competitor_runs (user_id, created_at desc);
alter table public.competitor_runs enable row level security;
drop policy if exists "own competitor_runs" on public.competitor_runs;
create policy "own competitor_runs" on public.competitor_runs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Per-agent trail. run_id = competitor_runs.id (matches the engine's agentCall insert convention).
create table if not exists public.competitor_run_steps (
  id          uuid primary key default gen_random_uuid(),
  run_id      uuid not null references public.competitor_runs on delete cascade,
  user_id     uuid not null references auth.users on delete cascade,
  account_id  uuid,
  agent       text not null,   -- monitor | change_detector | classifier | analyst | battlecard | verifier
  input       jsonb,
  output      jsonb,
  model_used  text,
  tokens_in   int not null default 0,
  tokens_out  int not null default 0,
  cost_usd    numeric(12,6) not null default 0,
  status      text not null default 'ok',
  created_at  timestamptz not null default now()
);
create index if not exists competitor_run_steps_run_idx on public.competitor_run_steps (run_id, created_at);
alter table public.competitor_run_steps enable row level security;
drop policy if exists "own competitor_run_steps" on public.competitor_run_steps;
create policy "own competitor_run_steps" on public.competitor_run_steps for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- App #6 — the core crew app. Add-on watches (Pricing Watch, Deep-Dive) ship as fast-follows.
insert into public.mini_apps
  (slug, name, description, category, icon, who_for, tags, autonomy_level, brief_template, config_schema, workflow_def, est_credit_cost, is_published, sort_order)
values
(
  'competitor-intelligence',
  'Competitor Intelligence',
  'Give it your competitors and a specialist crew watches them — telling you what changed, why it matters, and how to respond, with a dynamic battlecard. The job Crayon and Klue do at $15k–40k/year, for a few credits per run.',
  'research', '🔭',
  'Founders, marketers and small businesses who need to know what competitors are doing but can''t afford enterprise CI tools or the time to track manually.',
  array['competitor','intelligence','battlecard','monitoring','market','research'], 3,
  'Watch {{competitors}} for {{focus}} changes and tell me what changed, why it matters and how to respond — {{schedule}}.',
  '[
    {"key":"competitors","question":"Who are your competitors?","type":"text","placeholder":"1–5 names or URLs, comma-separated"},
    {"key":"focus","question":"What do you care about most?","type":"multi","options":["Pricing","New products","Marketing/messaging","Hiring","Everything"]},
    {"key":"positioning","question":"What''s your business? (to frame threats to you)","type":"text","placeholder":"what you sell and to whom"},
    {"key":"output_depth","question":"Want a battlecard?","type":"choice","options":["Yes, how to beat them","Just tell me what changed"]},
    {"key":"schedule","question":"How often?","type":"choice","options":["Once","Weekly","Monthly"]},
    {"key":"output_target","question":"Where should it go?","type":"choice","options":["Chat","Email","Dashboard"]}
  ]'::jsonb,
  '{"steps":[{"id":"intel","kind":"crew","crew_id":"competitor_intel","task_type":"reasoning","schema":"competitor_report"}]}'::jsonb,
  2.5, true, 14
)
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category, icon = excluded.icon,
  who_for = excluded.who_for, tags = excluded.tags, autonomy_level = excluded.autonomy_level,
  brief_template = excluded.brief_template, config_schema = excluded.config_schema, workflow_def = excluded.workflow_def,
  est_credit_cost = excluded.est_credit_cost, is_published = excluded.is_published, sort_order = excluded.sort_order;

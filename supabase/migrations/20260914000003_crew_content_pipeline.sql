-- App #5 — Content Pipeline (crew tier). One idea → a week of channel-native content in the brand voice.
-- Upgrades the original single-LLM `content-pipeline` (seed) to a full Level-3 crew (crew_id "content"),
-- matching Apps #1–4. Per-run + per-agent trail, RLS per user, account_id (tenancy-ready).

create table if not exists public.content_runs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  account_id   uuid,
  task_id      uuid references public.tasks on delete set null,
  idea         text,                      -- seed: topic/sentence/URL/past-post ref
  output_set   text,                      -- blog_social | social | newsletter | everything
  channels     text[] not null default '{}',
  tone         text,                      -- or 'brand_voice'
  status       text not null default 'running',  -- running | done | failed
  content      jsonb,                     -- {summary, core, repurposes[], schedule[]}
  total_cost   numeric(12,6) not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists content_runs_user_idx on public.content_runs (user_id, created_at desc);
alter table public.content_runs enable row level security;
drop policy if exists "own content_runs" on public.content_runs;
create policy "own content_runs" on public.content_runs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Per-agent trail. run_id = content_runs.id (matches the engine's agentCall insert convention). account_id tenancy-ready.
create table if not exists public.content_run_steps (
  id          uuid primary key default gen_random_uuid(),
  run_id      uuid not null references public.content_runs on delete cascade,
  user_id     uuid not null references auth.users on delete cascade,
  account_id  uuid,
  agent       text not null,   -- strategist | researcher | writer | repurposer | editor | verifier
  input       jsonb,
  output      jsonb,
  model_used  text,
  tokens_in   int not null default 0,
  tokens_out  int not null default 0,
  cost_usd    numeric(12,6) not null default 0,
  status      text not null default 'ok',
  created_at  timestamptz not null default now()
);
create index if not exists content_run_steps_run_idx on public.content_run_steps (run_id, created_at);
alter table public.content_run_steps enable row level security;
drop policy if exists "own content_run_steps" on public.content_run_steps;
create policy "own content_run_steps" on public.content_run_steps for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Upgrade the existing content-pipeline app to the crew (was a single-LLM Level-2). Upsert replaces the thin version.
insert into public.mini_apps
  (slug, name, description, category, icon, who_for, tags, autonomy_level, brief_template, config_schema, workflow_def, est_credit_cost, is_published, sort_order)
values
(
  'content-pipeline',
  'Content Pipeline',
  'Give it one idea and a specialist crew turns it into a week of ready-to-post content — a blog, channel-native social posts and a newsletter — in your brand voice, grounded in real research. The job a content team or Jasper+Buffer does, for cents per piece.',
  'content', '✍️',
  'Solo founders, small businesses and creators who need consistent content but have no time, no team and no content-strategy skill.',
  array['content','blog','social','newsletter','repurpose','brand-voice','writing'], 3,
  'Turn {{idea}} into {{output_set}} for {{channels}} in a {{tone}} voice, {{schedule}}.',
  '[
    {"key":"idea","question":"What''s the idea?","type":"text","placeholder":"a topic, a sentence, a URL, or a past post to turn into more"},
    {"key":"output_set","question":"What do you need?","type":"choice","options":["Blog + social","Just social posts","Newsletter","Everything"]},
    {"key":"channels","question":"Which platforms?","type":"multi","options":["LinkedIn","X","Instagram","Blog","Email"]},
    {"key":"tone","question":"Tone?","type":"choice","options":["Professional","Casual","Bold","Friendly","Use my brand voice"]},
    {"key":"schedule","question":"How often?","type":"choice","options":["Once","Weekly"]},
    {"key":"output_target","question":"Where should it go?","type":"choice","options":["Chat","Dashboard"]}
  ]'::jsonb,
  '{"steps":[{"id":"content","kind":"crew","crew_id":"content","task_type":"reasoning","schema":"content_report"}]}'::jsonb,
  2.0, true, 13
)
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category, icon = excluded.icon,
  who_for = excluded.who_for, tags = excluded.tags, autonomy_level = excluded.autonomy_level,
  brief_template = excluded.brief_template, config_schema = excluded.config_schema, workflow_def = excluded.workflow_def,
  est_credit_cost = excluded.est_credit_cost, is_published = excluded.is_published, sort_order = excluded.sort_order;

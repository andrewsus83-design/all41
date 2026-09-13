-- Professional-grade CREW app tier (docs/APP1_SEO_GEO_COMPLETE.md).
-- One audit run + per-agent audit trail, RLS per user. Plus DataForSEO/PageSpeed cost rows and the flagship app.

create table if not exists public.seo_runs (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users on delete cascade,
  task_id           uuid references public.tasks on delete set null,
  site_url          text,
  competitor_urls   text[] not null default '{}',
  goal              text,
  selected_products jsonb,
  status            text not null default 'running',   -- running | done | failed
  health_score_seo  int,
  health_score_geo  int,
  report            jsonb,
  total_cost        numeric(12,6) not null default 0,
  created_at        timestamptz not null default now()
);
create index if not exists seo_runs_user_idx on public.seo_runs (user_id, created_at desc);
alter table public.seo_runs enable row level security;
create policy "own seo_runs" on public.seo_runs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.seo_run_steps (
  id          uuid primary key default gen_random_uuid(),
  run_id      uuid not null references public.seo_runs on delete cascade,
  user_id     uuid not null references auth.users on delete cascade,
  agent       text not null,                 -- crawler | technical | keyword | competitor | social | geo | prioritizer | verifier
  input       jsonb,
  output      jsonb,
  model_used  text,
  tokens_in   int not null default 0,
  tokens_out  int not null default 0,
  cost_usd    numeric(12,6) not null default 0,
  status      text not null default 'ok',
  created_at  timestamptz not null default now()
);
create index if not exists seo_run_steps_run_idx on public.seo_run_steps (run_id, created_at);
alter table public.seo_run_steps enable row level security;
create policy "own seo_run_steps" on public.seo_run_steps for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- cost rows for the new data tools (crew passes exact costUsd, but these make the admin cost table + estimates honest)
insert into public.cost_rates (api_provider, api_model, input_rate, output_rate, unit, source) values
  ('dataforseo','serp',       0.0020, 0, 'per_call', 'seed'),
  ('dataforseo','keywords',   0.0100, 0, 'per_call', 'seed'),
  ('dataforseo','backlinks',  0.0200, 0, 'per_call', 'seed'),
  ('google','pagespeed',      0.0000, 0, 'per_call', 'seed')
on conflict (api_provider, api_model) do nothing;

-- The flagship crew app — a team of specialists, Google + AI-search (GEO), plain-language prioritized plan.
insert into public.mini_apps
  (slug, name, description, category, icon, who_for, tags, autonomy_level, brief_template, config_schema, workflow_def, est_credit_cost, is_published, sort_order)
values (
  'seo-geo-optimizer',
  'SEO & GEO Optimizer',
  'A specialist team audits your site for Google search AND AI answers, then hands you a prioritized plain-language plan.',
  'marketing',
  '📈',
  'Business owners who can''t afford an SEO agency or find SEMrush too complex.',
  array['seo','geo','ai-search','audit','website','competitors'],
  3,
  'Audit {{site_url}} to {{goal}}, looking at {{product_scope}}, compared with {{competitor_urls}} — run it {{schedule}}.',
  '[
    {"key":"site_url","question":"What''s your website?","type":"text","placeholder":"yourbusiness.com"},
    {"key":"goal","question":"What matters most?","type":"choice","options":["get found on Google","get cited by AI","both","beat a competitor"]},
    {"key":"product_scope","question":"Which products?","type":"choice","options":["all of them","just the top sellers"]},
    {"key":"competitor_urls","question":"Any competitors to compare? (optional)","type":"text","placeholder":"competitor1.com, competitor2.com"},
    {"key":"business","question":"What do you sell or do?","type":"text","placeholder":"e.g. handmade candles for gift shops"},
    {"key":"schedule","question":"How often?","type":"choice","options":["Once","Monthly"]},
    {"key":"output_target","question":"Where should it go?","type":"choice","options":["Chat","Email","Dashboard"]}
  ]'::jsonb,
  '{"steps":[{"id":"audit","kind":"crew","crew_id":"seo_geo","task_type":"reasoning","schema":"seo_report"}]}'::jsonb,
  4.0,
  true,
  5
)
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category, icon = excluded.icon,
  who_for = excluded.who_for, tags = excluded.tags, autonomy_level = excluded.autonomy_level,
  brief_template = excluded.brief_template, config_schema = excluded.config_schema, workflow_def = excluded.workflow_def,
  est_credit_cost = excluded.est_credit_cost, is_published = excluded.is_published, sort_order = excluded.sort_order;

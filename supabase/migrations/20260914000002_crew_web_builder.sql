-- App #4 — Web Builder (crew tier). Configure a brand → a crew builds a live, conversion-optimized
-- site hosted at brand.all41.app, then keeps it optimized. Per-run + per-agent trail, RLS per user.
-- Runs on the universal engine (crew_id "web_builder"). Build = pay-per-use; ongoing care = credits per run (no subscription).

create table if not exists public.websites (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users on delete cascade,
  account_id           uuid,                          -- future white-label (set to the owner for now)
  task_id              uuid references public.tasks on delete set null,
  brand_name           text,
  what_they_do         text,
  audience             text,
  pages                jsonb,                         -- [{type,slug,headline,subhead,value_prop,proof,cta,cta_href,has_nav}]
  products             jsonb,                         -- [{name,price,image,desc}]
  style                jsonb,                         -- extracted + preset style tokens {palette,typography,tone,layout}
  reference_urls       text[] not null default '{}',  -- sites the user liked (Design Extractor — inspire, never copy)
  checkout_url         text,                          -- user's existing checkout (all41 links to it; processes no payment)
  subdomain            text,                          -- <slug>.all41.app
  vercel_deployment_id text,                          -- Vercel behind the scenes (null until real deploy is wired)
  status               text not null default 'building',  -- building | live | deploy_pending | failed | paused
  build_cost           numeric(12,6) not null default 0,
  created_at           timestamptz not null default now()
);
create index if not exists websites_user_idx on public.websites (user_id, created_at desc);
alter table public.websites enable row level security;
drop policy if exists "own websites" on public.websites;
create policy "own websites" on public.websites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Per-agent build trail. run_id = websites.id (matches the engine's agentCall insert convention).
create table if not exists public.website_build_steps (
  id          uuid primary key default gen_random_uuid(),
  run_id      uuid not null references public.websites on delete cascade,
  user_id     uuid not null references auth.users on delete cascade,
  agent       text not null,   -- interviewer | extractor | copywriter | builder | seo_geo | deployer | verifier
  input       jsonb,
  output      jsonb,
  model_used  text,
  tokens_in   int not null default 0,
  tokens_out  int not null default 0,
  cost_usd    numeric(12,6) not null default 0,
  status      text not null default 'ok',
  created_at  timestamptz not null default now()
);
create index if not exists website_build_steps_run_idx on public.website_build_steps (run_id, created_at);
alter table public.website_build_steps enable row level security;
drop policy if exists "own website_build_steps" on public.website_build_steps;
create policy "own website_build_steps" on public.website_build_steps for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Ongoing care runs (SEO/GEO / content / health check) — credits per run, never a subscription. (Care crews: fast-follow.)
create table if not exists public.website_care_runs (
  id          uuid primary key default gen_random_uuid(),
  website_id  uuid not null references public.websites on delete cascade,
  user_id     uuid not null references auth.users on delete cascade,
  run_type    text,            -- seo | geo | content_update | monitor | health
  input       jsonb,
  output      jsonb,
  cost_usd    numeric(12,6) not null default 0,
  status      text not null default 'running',
  created_at  timestamptz not null default now()
);
create index if not exists website_care_runs_site_idx on public.website_care_runs (website_id, created_at desc);
alter table public.website_care_runs enable row level security;
drop policy if exists "own website_care_runs" on public.website_care_runs;
create policy "own website_care_runs" on public.website_care_runs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- App #4 — the core build crew app. Ongoing-care apps (Health & Hosting Check, SEO/GEO Care) ship as fast-follows.
insert into public.mini_apps
  (slug, name, description, category, icon, who_for, tags, autonomy_level, brief_template, config_schema, workflow_def, est_credit_cost, is_published, sort_order)
values
(
  'web-builder',
  'Web Builder',
  'Configure your brand and a specialist crew builds a live, conversion-optimized website hosted at your own all41.app address — then keeps it optimized. The job Wix + an SEO agency do, without you touching either. Build once, care on credits, no subscription.',
  'websites', '🌐',
  'Small businesses and solopreneurs who need a site that gets found and converts — without learning web design or SEO.',
  array['website','landing page','builder','hosting','conversion','seo','no-code'], 3,
  'Build a {{style_preset}} website for {{brand_name}} — {{what_they_do}} for {{audience}} — with the CTA pointing to {{checkout_url}}.',
  '[
    {"key":"brand_name","question":"What''s your business?","type":"text","placeholder":"your business name"},
    {"key":"what_they_do","question":"What do you do?","type":"text","placeholder":"e.g. bookkeeping for freelancers"},
    {"key":"audience","question":"Who''s it for?","type":"text","placeholder":"your ideal customer, in one line"},
    {"key":"pages","question":"What pages?","type":"multi","options":["Home","About","Products/Services","Contact","Blog"]},
    {"key":"products","question":"Got products/services? (optional)","type":"text","placeholder":"name, price, one line each — or leave blank"},
    {"key":"reference_urls","question":"Any sites whose style you like? (optional)","type":"text","placeholder":"2–3 URLs, comma-separated — we take inspiration, never copy"},
    {"key":"style_preset","question":"Style feel?","type":"choice","options":["Clean","Bold","Warm","Minimal"]},
    {"key":"checkout_url","question":"Buy link / checkout? (optional)","type":"text","placeholder":"your existing checkout link — we link to it, never process payment"},
    {"key":"schedule","question":"How often?","type":"choice","options":["Once"]},
    {"key":"output_target","question":"Where should it go?","type":"choice","options":["Dashboard","Chat"]}
  ]'::jsonb,
  '{"steps":[{"id":"build","kind":"crew","crew_id":"web_builder","task_type":"reasoning","schema":"website_report"}]}'::jsonb,
  6.0, true, 12
)
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category, icon = excluded.icon,
  who_for = excluded.who_for, tags = excluded.tags, autonomy_level = excluded.autonomy_level,
  brief_template = excluded.brief_template, config_schema = excluded.config_schema, workflow_def = excluded.workflow_def,
  est_credit_cost = excluded.est_credit_cost, is_published = excluded.is_published, sort_order = excluded.sort_order;

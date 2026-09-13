-- App #3 — Clip Video (crew tier). Long video → hook-scored vertical clips.
-- Per-run + per-agent trail, RLS per user. Runs on the universal engine (crew_id "clip").

create table if not exists public.clip_runs (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users on delete cascade,
  task_id             uuid references public.tasks on delete set null,
  source_url          text,
  source_file_path    text,
  source_duration_sec int,
  num_clips_requested text,                       -- '3' | '5' | '10' | 'auto'
  vibe                text,                       -- 'punchy' | 'full'
  target              text,                       -- 'download' | 'tiktok' | 'reels' | 'shorts'
  focus_prompt        text,
  status              text not null default 'running',   -- running | done | failed
  clips               jsonb,                      -- [{title,start_sec,end_sec,virality_score,dimension_scores,hook_type,caption,render_category,clip_file,status,why}]
  total_cost          numeric(12,6) not null default 0,
  created_at          timestamptz not null default now()
);
create index if not exists clip_runs_user_idx on public.clip_runs (user_id, created_at desc);
alter table public.clip_runs enable row level security;
drop policy if exists "own clip_runs" on public.clip_runs;
create policy "own clip_runs" on public.clip_runs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.clip_run_steps (
  id          uuid primary key default gen_random_uuid(),
  run_id      uuid not null references public.clip_runs on delete cascade,
  user_id     uuid not null references auth.users on delete cascade,
  agent       text not null,   -- transcriber | moment_finder | hook_optimizer | render_router | clip_editor | caption_renderer | captioner | quality_checker
  input       jsonb,
  output      jsonb,
  model_used  text,
  tokens_in   int not null default 0,
  tokens_out  int not null default 0,
  cost_usd    numeric(12,6) not null default 0,
  status      text not null default 'ok',
  created_at  timestamptz not null default now()
);
create index if not exists clip_run_steps_run_idx on public.clip_run_steps (run_id, created_at);
alter table public.clip_run_steps enable row level security;
drop policy if exists "own clip_run_steps" on public.clip_run_steps;
create policy "own clip_run_steps" on public.clip_run_steps for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- App #3 — the core crew app. "Turn any video into clips for ~$0.60." (add-ons ship as fast-follows.)
insert into public.mini_apps
  (slug, name, description, category, icon, who_for, tags, autonomy_level, brief_template, config_schema, workflow_def, est_credit_cost, is_published, sort_order)
values
(
  'clip-video',
  'Clip Video',
  'Give it a long video and a specialist crew turns it into short vertical clips — hook-scored, reframed, captioned — ready for TikTok, Reels and Shorts. The job Opus Clip charges $15–50/mo for, pay-per-use.',
  'video', '🎬',
  'Creators, coaches, marketers and solo founders repurposing long video who won''t pay a monthly clipper subscription.',
  array['video','clips','shorts','tiktok','reels','repurpose','media_extraction'], 3,
  'Turn {{source_url}} into {{num_clips}} short vertical clips for {{target}} — {{vibe}} hooks{{focus_prompt}}.',
  '[
    {"key":"source_url","question":"Paste the video link (or upload)","type":"text","placeholder":"YouTube/podcast link — or attach the file in My Apps after publishing"},
    {"key":"num_clips","question":"How many clips?","type":"choice","options":["3","5","10","Auto"]},
    {"key":"vibe","question":"Vibe?","type":"choice","options":["Punchy hooks","Full thoughts"]},
    {"key":"captions","question":"Captions?","type":"choice","options":["Branded animated captions","Plain / none"]},
    {"key":"target","question":"Where to?","type":"choice","options":["Download","TikTok","Reels","Shorts"]},
    {"key":"focus_prompt","question":"Focus on anything? (optional)","type":"text","placeholder":"e.g. product demos, emotional stories"},
    {"key":"schedule","question":"How often?","type":"choice","options":["Once","Every new episode"]},
    {"key":"output_target","question":"Where should it go?","type":"choice","options":["Chat","Dashboard"]}
  ]'::jsonb,
  '{"steps":[{"id":"clip","kind":"crew","crew_id":"clip","task_type":"reasoning","schema":"clip_report"}]}'::jsonb,
  0.6, true, 11
)
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category, icon = excluded.icon,
  who_for = excluded.who_for, tags = excluded.tags, autonomy_level = excluded.autonomy_level,
  brief_template = excluded.brief_template, config_schema = excluded.config_schema, workflow_def = excluded.workflow_def,
  est_credit_cost = excluded.est_credit_cost, is_published = excluded.is_published, sort_order = excluded.sort_order;

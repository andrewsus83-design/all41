-- App #2 — Proposal / RFP Maker (crew tier, Shipley + MBB). Per-run + per-agent trail, RLS per user.

create table if not exists public.proposal_runs (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users on delete cascade,
  task_id           uuid references public.tasks on delete set null,
  rfp_file_path     text,
  bidder_id         uuid,
  tone              text,                       -- government | commercial
  deadline          date,
  status            text not null default 'running',
  compliance_matrix jsonb,
  proposal          jsonb,
  win_themes        jsonb,
  flags             jsonb,
  total_cost        numeric(12,6) not null default 0,
  created_at        timestamptz not null default now()
);
create index if not exists proposal_runs_user_idx on public.proposal_runs (user_id, created_at desc);
alter table public.proposal_runs enable row level security;
drop policy if exists "own proposal_runs" on public.proposal_runs;
create policy "own proposal_runs" on public.proposal_runs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.proposal_run_steps (
  id          uuid primary key default gen_random_uuid(),
  run_id      uuid not null references public.proposal_runs on delete cascade,
  user_id     uuid not null references auth.users on delete cascade,
  agent       text not null,
  input       jsonb,
  output      jsonb,
  model_used  text,
  tokens_in   int not null default 0,
  tokens_out  int not null default 0,
  cost_usd    numeric(12,6) not null default 0,
  status      text not null default 'ok',
  created_at  timestamptz not null default now()
);
create index if not exists proposal_run_steps_run_idx on public.proposal_run_steps (run_id, created_at);
alter table public.proposal_run_steps enable row level security;
drop policy if exists "own proposal_run_steps" on public.proposal_run_steps;
create policy "own proposal_run_steps" on public.proposal_run_steps for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- App #2 + its add-ons (Part 5 launch set). Full Proposal Draft = the core crew app.
insert into public.mini_apps
  (slug, name, description, category, icon, who_for, tags, autonomy_level, brief_template, config_schema, workflow_def, est_credit_cost, is_published, sort_order)
values
(
  'proposal-rfp-maker',
  'Proposal / RFP Maker',
  'Paste an RFP and a specialist team produces a compliance-checked, consultant-grade proposal draft — the Shipley method agencies charge thousands for.',
  'consulting', '📝',
  'Consultants, agencies and contractors who bid for work and can''t afford a proposal team.',
  array['proposal','rfp','bid','shipley','writing'], 3,
  'Write a {{tone}} proposal for {{bidder}} from this RFP, emphasising {{emphasis}} — due {{deadline}}.',
  '[
    {"key":"rfp_text","question":"Paste the RFP","type":"text","placeholder":"Paste the RFP text here — or attach the file in My Apps after publishing"},
    {"key":"bidder","question":"Who''s bidding?","type":"text","placeholder":"your company name"},
    {"key":"tone","question":"Tone?","type":"choice","options":["commercial","government"]},
    {"key":"emphasis","question":"Anything to emphasise? (optional)","type":"text","placeholder":"a key strength or differentiator"},
    {"key":"deadline","question":"Deadline? (optional)","type":"text","placeholder":"2026-10-15"},
    {"key":"schedule","question":"How often?","type":"choice","options":["Once","Monthly"]},
    {"key":"output_target","question":"Where should it go?","type":"choice","options":["Chat","Email","Dashboard"]}
  ]'::jsonb,
  '{"steps":[{"id":"proposal","kind":"crew","crew_id":"proposal","task_type":"reasoning","schema":"proposal_report"}]}'::jsonb,
  9.0, true, 7
),
(
  'bid-no-bid',
  'Bid / No-Bid Analysis',
  'Should you even bid? Weigh an RFP against your strengths and the competition and get a clear go/skip call.',
  'consulting', '⚖️',
  'Anyone deciding which RFPs are worth the effort.',
  array['proposal','rfp','bid','decision'], 1,
  'Should {{bidder}} bid on this RFP? Give a clear go or skip, {{schedule}}, delivered to {{output_target}}.',
  '[
    {"key":"rfp_text","question":"Paste the RFP","type":"text","placeholder":"Paste the RFP text here"},
    {"key":"bidder","question":"Who''s deciding?","type":"text","placeholder":"your company name"},
    {"key":"schedule","question":"How often?","type":"choice","options":["Once","Monthly"]},
    {"key":"output_target","question":"Where should it go?","type":"choice","options":["Chat","Email","Dashboard"]}
  ]'::jsonb,
  '{"steps":[{"id":"assess","kind":"llm","task_type":"reasoning","schema":"report","prompt":"Assess whether {{bidder}} should bid on this RFP. Weigh the required scope against typical strengths, the likely competition, effort, and win probability, then give a clear BID or NO-BID recommendation with reasons and the top risks. Use the RFP and any attached materials. Cite the RFP.\n\nRFP:\n{{rfp_text}}"}]}'::jsonb,
  2.0, true, 8
),
(
  'proposal-review',
  'Proposal Review',
  'Run a proposal you already wrote through an evaluator-style compliance check and get a gap report before you submit.',
  'consulting', '🔍',
  'Anyone about to submit a proposal who wants a second set of eyes.',
  array['proposal','rfp','compliance','review'], 1,
  'Review {{bidder}}''s proposal against this RFP and list every gap before we submit, {{schedule}}.',
  '[
    {"key":"rfp_text","question":"Paste the RFP","type":"text","placeholder":"Paste the RFP text here"},
    {"key":"proposal_text","question":"Paste your draft proposal","type":"text","placeholder":"Paste your proposal draft here"},
    {"key":"bidder","question":"Whose proposal?","type":"text","placeholder":"your company name"},
    {"key":"schedule","question":"How often?","type":"choice","options":["Once","Monthly"]},
    {"key":"output_target","question":"Where should it go?","type":"choice","options":["Chat","Email","Dashboard"]}
  ]'::jsonb,
  '{"steps":[{"id":"review","kind":"llm","task_type":"reasoning","schema":"report","prompt":"Act as a strict proposal evaluator. Check {{bidder}}''s proposal against every requirement in the RFP: is each answered, in the right place, in the required format? List every gap, weak win theme, and unsupported claim, ranked by how much it could cost the bid. Cite the RFP.\n\nRFP:\n{{rfp_text}}\n\nPROPOSAL:\n{{proposal_text}}"}]}'::jsonb,
  3.5, true, 9
),
(
  'past-performance-library',
  'Past-Performance Library',
  'Turn your old proposals and case studies into clean, reusable proof points your future bids pull from automatically.',
  'consulting', '🗂️',
  'Firms that bid often and want each proposal sharper than the last.',
  array['proposal','past-performance','library','proof'], 1,
  'Organise {{bidder}}''s past work into reusable proof points, {{schedule}}.',
  '[
    {"key":"materials_text","question":"Paste past proposals / case studies","type":"text","placeholder":"Paste past work here — or attach files in My Apps"},
    {"key":"bidder","question":"Whose past work?","type":"text","placeholder":"your company name"},
    {"key":"schedule","question":"How often?","type":"choice","options":["Once","Monthly"]},
    {"key":"output_target","question":"Where should it go?","type":"choice","options":["Chat","Email","Dashboard"]}
  ]'::jsonb,
  '{"steps":[{"id":"structure","kind":"llm","task_type":"summarize","schema":"answer","prompt":"Organise {{bidder}}''s past work into clean, reusable proof points. For each project: the client, the scope, the outcome (with numbers where stated), and the win theme it supports. Keep only what is stated — never invent results. Use the pasted text and any attached materials.\n\nPAST WORK:\n{{materials_text}}"}]}'::jsonb,
  0.6, true, 10
)
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category, icon = excluded.icon,
  who_for = excluded.who_for, tags = excluded.tags, autonomy_level = excluded.autonomy_level,
  brief_template = excluded.brief_template, config_schema = excluded.config_schema, workflow_def = excluded.workflow_def,
  est_credit_cost = excluded.est_credit_cost, is_published = excluded.is_published, sort_order = excluded.sort_order;

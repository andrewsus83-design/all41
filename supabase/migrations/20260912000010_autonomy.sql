-- all41 autonomy levels (docs/APP_AUTONOMY_GUIDE.md):
--   1 = fixed pipeline, 2 = branching workflow, 3 = bounded autonomous agent (step cap + credit ceiling + metered + pre-flight + verify).
-- Safe to re-run: `if not exists` on the column, idempotent updates, upsert on slug for the three Level-3 templates.

alter table public.mini_apps
  add column if not exists autonomy_level smallint not null default 1 check (autonomy_level in (1, 2, 3));

comment on column public.mini_apps.autonomy_level is '1 fixed pipeline · 2 branching workflow · 3 bounded agent (see docs/APP_AUTONOMY_GUIDE.md)';

-- Level 2 = any conditional step (`when`) or two-plus thinking steps in the workflow.
update public.mini_apps
set autonomy_level = 2
where autonomy_level = 1
  and (
    exists (select 1 from jsonb_array_elements(coalesce(workflow_def->'steps', '[]'::jsonb)) s where s ? 'when')
    or (select count(*) from jsonb_array_elements(coalesce(workflow_def->'steps', '[]'::jsonb)) s where s->>'kind' = 'llm') >= 2
  );

-- Level 2 by classification in the guide (branching by source / channel / segment / document type / threshold).
update public.mini_apps
set autonomy_level = 2
where slug in ('morning-briefing', 'content-pipeline', 'email-campaign', 'crm-lite', 'invoice-tracker', 'social-monitor')
  and autonomy_level < 3;

-- Any workflow that carries an `agent` step is Level 3, whatever else is set.
update public.mini_apps
set autonomy_level = 3
where exists (select 1 from jsonb_array_elements(coalesce(workflow_def->'steps', '[]'::jsonb)) s where s->>'kind' = 'agent');

-- ---- Level-3 templates -------------------------------------------------------------------------------------------
-- Agent step shape: {"id","kind":"agent","task_type","schema","goal","tools":[...],"max_steps","credit_ceiling_usd","verify"}
--   max_steps_from   : {"key":"depth","values":{"quick":4,"standard":8,"deep":12}} — the step cap follows an answer (case-insensitive).
--   tools_if         : {"search":"check_web=Yes"} — a tool is only offered when the condition (same grammar as `when`) holds.
--   paste_keys       : config keys whose pasted text is treated as user data (D# refs), not inlined into the goal.
insert into public.mini_apps (slug, name, description, category, icon, who_for, tags, brief_template, config_schema, workflow_def, est_credit_cost, is_published, sort_order, autonomy_level) values
('deep-research', 'Deep Research Report', 'An open-ended investigation of one question — it decides where to look, digs deeper where it matters, and stops when it has enough.', 'research', '🔬', 'Anyone facing a decision that needs real homework — a market, a supplier, a technology, a move — and no time to do a week of reading.', array['research','report','investigation','market','deep work'],
 'Dig into {{question}} — I need it for {{purpose}}. Depth: {{depth}}. Run {{schedule}}, delivered to {{output_target}}.',
 '[{"key":"question","question":"What do you want investigated?","type":"text","placeholder":"e.g. is there room for a premium coffee subscription in Jakarta"},{"key":"purpose","question":"What will you use it for?","type":"text","placeholder":"e.g. deciding whether to launch in Q1"},{"key":"depth","question":"How deep should it go?","type":"choice","options":["Quick","Standard","Deep"]},{"key":"schedule","question":"How often?","type":"choice","options":["Once","Weekly","Monthly"]},{"key":"output_target","question":"Where should it go?","type":"choice","options":["Chat","Email","Dashboard"]}]'::jsonb,
 '{"steps":[{"id":"agent","kind":"agent","task_type":"reasoning","schema":"report","goal":"Investigate this question thoroughly: {{question}}. The user needs it for: {{purpose}}. Find the facts that change the decision — size, players, prices, trends, risks, and what people who tried it learned. Look wider first, then go deeper only where it matters. Stop when new searches stop adding anything. Write a report: a plain summary, a comparison table of the main options or players (them vs what the user has), the threats, the opportunities, and one clear next move. Every number needs a source.","tools":["search","crawl","graph","user_data"],"max_steps":8,"max_steps_from":{"key":"depth","values":{"quick":4,"standard":8,"deep":12}},"credit_ceiling_usd":0.60,"verify":true}]}'::jsonb,
 0.60, true, 4, 3),
('competitive-intel', 'Competitive Intelligence', 'A real intelligence report on one competitor — it picks what to read, digs where it matters, and compares them to you.', 'research', '🕵️', 'Founders and marketers who want more than a pricing-page screenshot: what a rival is actually doing, and what to do about it.', array['competitor','intelligence','research','positioning','report'],
 'Build a competitive intelligence report on {{company}} compared with {{us}}, focusing on {{focus}}, {{schedule}}, delivered to {{output_target}}.',
 '[{"key":"company","question":"Which competitor?","type":"text","placeholder":"e.g. Kopi Kenangan"},{"key":"us","question":"Who are you, in one line?","type":"text","placeholder":"e.g. a 3-outlet specialty coffee brand in Bandung"},{"key":"focus","question":"What should it focus on?","type":"multi","options":["Pricing","Product & features","Marketing & positioning","Customers & reviews","Hiring & team","Funding & news"]},{"key":"schedule","question":"How often?","type":"choice","options":["Once","Weekly","Monthly"]},{"key":"output_target","question":"Where should it go?","type":"choice","options":["Chat","Email","Dashboard"]}]'::jsonb,
 '{"steps":[{"id":"agent","kind":"agent","task_type":"reasoning","schema":"report","goal":"Build a competitive intelligence report on {{company}}, compared with the user ({{us}}). Focus on: {{focus}}. Decide which sources to read — their site, pricing, job posts, reviews, news — and go deeper only where something matters to the user. Use the user''s own context and data for the ''you'' side. Write: a plain summary, a side-by-side table (them vs you) per focus area, 3 threats, 3 opportunities, and one recommended next move. Every claim needs a source; say what you could not find.","tools":["search","crawl","graph","user_data"],"max_steps":8,"credit_ceiling_usd":0.60,"verify":true}]}'::jsonb,
 0.60, true, 5, 3),
('due-diligence', 'Due Diligence Summary', 'Reads a set of documents for one decision, decides what is material, and surfaces the red flags.', 'consulting', '🧐', 'Anyone about to sign, buy, invest, hire, or partner — who has a pile of documents and needs to know what actually matters.', array['due diligence','documents','red flags','contract','decision','consulting'],
 'Read through {{source_text}} and tell me what matters for this decision: {{decision}}. Also check the web: {{check_web}}. Run {{schedule}}, delivered to {{output_target}}.',
 '[{"key":"source_text","question":"Paste the documents (or attach them in My Apps)","type":"text","placeholder":"paste it here — or attach docs in My Apps"},{"key":"decision","question":"What decision is this for?","type":"choice","options":["Signing a contract","Buying a business","Investing","Hiring a key person","Choosing a supplier or partner","Something else"]},{"key":"check_web","question":"Should it also check the web?","type":"choice","options":["Yes","No"]},{"key":"schedule","question":"How often?","type":"choice","options":["Once"]},{"key":"output_target","question":"Where should it go?","type":"choice","options":["Chat","Email","Dashboard"]}]'::jsonb,
 '{"steps":[{"id":"agent","kind":"agent","task_type":"reasoning","schema":"answer","goal":"Do due diligence for this decision: {{decision}}. Start by reading the user''s documents (use the user_data tool first). Decide what is material to the decision, then go back for the details that matter. Only check the web if that tool is offered. Write: a plain answer on whether anything here should stop or change the decision, key points as a list of RED FLAGS first (each starting ''RED FLAG:'', with where it is in the documents) then the things that look fine, one next action, and gaps for anything the documents do not cover. Never guess a number that is not in the documents.","tools":["graph","user_data"],"tools_if":{"search":"check_web=Yes","crawl":"check_web=Yes"},"paste_keys":["source_text"],"max_steps":8,"credit_ceiling_usd":0.40,"verify":true}]}'::jsonb,
 0.40, true, 6, 3)
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category, icon = excluded.icon, who_for = excluded.who_for,
  tags = excluded.tags, brief_template = excluded.brief_template, config_schema = excluded.config_schema, workflow_def = excluded.workflow_def,
  est_credit_cost = excluded.est_credit_cost, is_published = excluded.is_published, sort_order = excluded.sort_order, autonomy_level = excluded.autonomy_level;

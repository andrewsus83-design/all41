-- Seed: cost rates (source='seed' — re-scraped daily by Task 4.2), routing weights, mini app catalog.
insert into public.cost_rates (api_provider, api_model, input_rate, output_rate, unit, source) values
  ('openrouter','anthropic/claude-sonnet-4.5',      3.00, 15.00, 'per_1m_tokens','seed'),
  ('openrouter','anthropic/claude-haiku-4.5',       1.00,  5.00, 'per_1m_tokens','seed'),
  ('openrouter','openai/gpt-5-mini',                0.25,  2.00, 'per_1m_tokens','seed'),
  ('openrouter','openai/gpt-5',                     1.25, 10.00, 'per_1m_tokens','seed'),
  ('openrouter','google/gemini-2.5-flash',          0.30,  2.50, 'per_1m_tokens','seed'),
  ('openrouter','google/gemini-2.5-pro',            1.25, 10.00, 'per_1m_tokens','seed'),
  ('openrouter','perplexity/sonar',                 1.00,  1.00, 'per_1m_tokens','seed'),
  ('openrouter','meta-llama/llama-3.3-70b-instruct',0.13,  0.40, 'per_1m_tokens','seed'),
  ('openai',    'text-embedding-3-small',           0.02,  0.00, 'per_1m_tokens','seed'),
  ('firecrawl', 'scrape',                           0.001, 0,    'per_page','seed'),
  ('serpapi',   'search',                           0.00166, 0,  'per_call','seed'),
  ('mock',      'mock-model',                       0.20,  1.20, 'per_1m_tokens','seed')
on conflict (api_provider, api_model) do nothing;

insert into public.routing_weights (task_type, model, weight, is_leader) values
  ('classify',  'openrouter:meta-llama/llama-3.3-70b-instruct', 1.0, true),
  ('classify',  'openrouter:anthropic/claude-haiku-4.5',        0.8, false),
  ('research',  'openrouter:perplexity/sonar',                  1.0, true),
  ('research',  'openrouter:google/gemini-2.5-flash',           0.7, false),
  ('synthesis', 'openrouter:openai/gpt-5-mini',                 1.0, true),
  ('synthesis', 'openrouter:anthropic/claude-sonnet-4.5',       0.9, false),
  ('reasoning', 'openrouter:anthropic/claude-sonnet-4.5',       1.0, true),
  ('reasoning', 'openrouter:openai/gpt-5',                      0.9, false),
  ('code',      'openrouter:anthropic/claude-sonnet-4.5',       1.0, true),
  ('crawl',     'openrouter:google/gemini-2.5-flash',           1.0, true),
  ('content',   'openrouter:anthropic/claude-sonnet-4.5',       1.0, true),
  ('content',   'openrouter:openai/gpt-5-mini',                 0.9, false),
  ('summarize', 'openrouter:google/gemini-2.5-flash',           1.0, true),
  ('verify',    'openrouter:openai/gpt-5-mini',                 1.0, true),
  ('edges',     'openrouter:meta-llama/llama-3.3-70b-instruct', 1.0, true)
on conflict (task_type, model) do nothing;

insert into public.mini_apps (slug, name, description, category, icon, config_schema, workflow_def, est_credit_cost, is_published, sort_order) values
('morning-briefing', 'Morning Briefing',
 'A daily digest of what matters in your niche — news, trends, and what to do about it.',
 'research', '☀️',
 '[
   {"key":"topic","question":"What should I watch for you every morning?","type":"text","placeholder":"e.g. AI tools for agencies, Indonesian fintech"},
   {"key":"angle","question":"What lens?","type":"choice","options":["Opportunities","Competitors","Industry news","All"]},
   {"key":"schedule","question":"How often?","type":"choice","options":["Once","Daily","Weekly"]},
   {"key":"output_target","question":"Where should it go?","type":"choice","options":["Chat","Email","Dashboard"]}
 ]',
 '{"steps":[
   {"id":"search","kind":"search","task_type":"research","prompt":"Latest developments (past 24-72h) about: {{topic}}. Lens: {{angle}}."},
   {"id":"brief","kind":"llm","task_type":"summarize","schema":"briefing","prompt":"You are a sharp analyst. From the research below, write a morning briefing about {{topic}} through the lens of {{angle}}: 5 bullets max, each with why-it-matters and one concrete action. Cite sources."}
 ]}',
 0.02, true, 1),
('competitor-crawler', 'Competitor Crawler',
 'Track a competitor’s pricing, features, or content — and get a comparison report.',
 'research', '🔎',
 '[
   {"key":"competitor","question":"Who’s the competitor to track?","type":"text","placeholder":"e.g. Jasper AI or jasper.ai"},
   {"key":"compare","question":"Compare what?","type":"choice","options":["Pricing","Features","Content","All"]},
   {"key":"schedule","question":"How often?","type":"choice","options":["Once","Weekly","Monthly"]},
   {"key":"output_target","question":"Where should results go?","type":"choice","options":["Chat","Email","Dashboard"]}
 ]',
 '{"steps":[
   {"id":"search","kind":"search","task_type":"research","prompt":"{{competitor}} {{compare}} official site"},
   {"id":"crawl","kind":"crawl","task_type":"crawl","prompt":"{{competitor}}"},
   {"id":"report","kind":"llm","task_type":"synthesis","schema":"report","prompt":"Compare {{competitor}} on {{compare}} against the user’s own context (below). Produce a structured report: summary, side-by-side table, 3 threats, 3 opportunities, recommended next move. Cite sources."}
 ]}',
 0.12, true, 2),
('content-pipeline', 'Content Pipeline',
 'Turn one idea into platform-ready posts, grounded in your own notes and voice.',
 'content', '✍️',
 '[
   {"key":"idea","question":"What’s the idea or topic?","type":"text","placeholder":"e.g. Why solo founders should track cost per task"},
   {"key":"platforms","question":"Which platforms?","type":"multi","options":["LinkedIn","X","Newsletter","Blog"]},
   {"key":"tone","question":"Tone?","type":"choice","options":["Direct","Warm","Contrarian","Educational"]},
   {"key":"schedule","question":"How often?","type":"choice","options":["Once","Weekly"]}
 ]',
 '{"steps":[
   {"id":"draft","kind":"llm","task_type":"content","schema":"content_pack","prompt":"Using the user’s grounded context below, write platform-native drafts about: {{idea}}. Platforms: {{platforms}}. Tone: {{tone}}. Return one draft per platform with hooks and a CTA. Cite which context you drew on."}
 ]}',
 0.04, true, 3)
on conflict (slug) do nothing;

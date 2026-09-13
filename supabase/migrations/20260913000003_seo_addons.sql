-- all41 SEO/GEO recurring ADD-ONS — the LAUNCH SET (docs/APP1_SEO_GEO_COMPLETE.md Part 5 §G).
-- Pay-per-run scheduled services, NOT subscriptions: turning one on just sets a schedule;
-- each run deducts credits only when it actually runs; the owner can stop anytime and is
-- never charged for a failed run. The scheduler (lib/jobs/runDueInstances) fires any active
-- instance on its next_run_at regardless of app, so these run on schedule with no engine change.
-- Idempotent: upserts on slug. Validated: placeholders in {{ }} are config keys; schemas in
-- {briefing,report,answer,seo_report}; step kinds in {search,crawl,llm,agent,crew}; slugs unique.

insert into public.mini_apps
  (slug, name, description, category, icon, who_for, tags, autonomy_level, brief_template, config_schema, workflow_def, est_credit_cost, is_published, sort_order)
values
(
  'geo-monitor',
  'GEO Visibility Monitor',
  'Re-tests every week whether AI answer engines cite your brand, and tracks your share of voice and sentiment against rivals.',
  'marketing',
  '🛰️',
  'Brands that want to know whether ChatGPT, Perplexity and Google''s AI answers recommend them — and whether that is getting better or worse.',
  array['geo','ai-search','citations','share-of-voice','monitor'],
  1,
  'Every {{schedule}}, check whether AI assistants (ChatGPT, Perplexity, Google AI) cite {{brand}} for {{topics}} and tell me what changed since last time — send it to {{output_target}}.',
  '[{"key": "brand", "question": "What is your brand or business name?", "type": "text", "placeholder": "e.g. Kopi Nusantara"}, {"key": "topics", "question": "What topics should you be recommended for?", "type": "text", "placeholder": "e.g. specialty coffee beans, cafe supplies"}, {"key": "competitors", "question": "Any rivals to compare share of voice with? (optional)", "type": "text", "placeholder": "e.g. Brand A, Brand B"}, {"key": "schedule", "question": "How often?", "type": "choice", "options": ["Weekly", "Monthly"]}, {"key": "output_target", "question": "Where should it go?", "type": "choice", "options": ["Chat", "Email", "Dashboard"]}]'::jsonb,
  '{"steps": [{"id": "cite_test", "kind": "search", "task_type": "research", "prompt": "best {{topics}} — which brands are recommended? Compare {{brand}} against {{competitors}}. reviews, reputation, who gets named"}, {"id": "brand_check", "kind": "search", "task_type": "research", "prompt": "\"{{brand}}\" {{topics}} recommended OR reviewed OR mentioned reddit forum comparison"}, {"id": "report", "kind": "llm", "task_type": "synthesis", "schema": "report", "prompt": "You are testing whether AI answer engines cite {{brand}}. From the results below judge: (1) is {{brand}} named or recommended for {{topics}}, and on which sources (Reddit, review sites, listicles); (2) share of voice versus {{competitors}} — who gets mentioned more; (3) overall sentiment. Build the table with each row a dimension (visibility, sentiment, citation sources) where them = the rivals and you = {{brand}}. If a previous run appears in your context, say clearly what changed since last time; otherwise mark this as the first baseline. List the biggest threats and opportunities and one next move. Cite sources."}]}'::jsonb,
  0.9,
  true,
  6
),
(
  'gap-finder',
  'Gap Finder',
  'Finds this period''s new openings — keyword, content, competitor and AI-search gaps you can still win.',
  'marketing',
  '🧭',
  'Owners who want the fresh openings each period — the keywords, content and competitor moves they can still get ahead of.',
  array['gaps','keywords','content','competitors','opportunities'],
  1,
  'Every {{schedule}}, find new {{focus}} openings for {{site_url}} versus {{competitor_urls}} and tell me what is new since last time — send it to {{output_target}}.',
  '[{"key": "site_url", "question": "What is your website?", "type": "text", "placeholder": "yourbusiness.com"}, {"key": "focus", "question": "What kind of openings matter most?", "type": "choice", "options": ["keyword", "content", "competitor", "AI-search (GEO)", "all"]}, {"key": "competitor_urls", "question": "Any competitors to watch? (optional)", "type": "text", "placeholder": "competitor1.com, competitor2.com"}, {"key": "schedule", "question": "How often?", "type": "choice", "options": ["Weekly", "Monthly"]}, {"key": "output_target", "question": "Where should it go?", "type": "choice", "options": ["Chat", "Email", "Dashboard"]}]'::jsonb,
  '{"steps": [{"id": "scan", "kind": "search", "task_type": "research", "prompt": "new {{focus}} opportunities for {{site_url}}: keywords and topics {{competitor_urls}} rank for, content they publish, gaps this month"}, {"id": "read_site", "kind": "crawl", "task_type": "crawl", "prompt": "{{site_url}}"}, {"id": "report", "kind": "llm", "task_type": "synthesis", "schema": "report", "prompt": "Find this period''s new openings for {{site_url}} (focus: {{focus}}). Using the search results and the crawl of the site below, identify gaps: keywords and topics competitors cover that this site does not, content worth adding, and competitor moves worth answering. Build the table with them = {{competitor_urls}} and you = {{site_url}} across each gap area. List threats and opportunities, and one next move to grab first. If a previous run appears in your context, focus on what is NEW since last time. Cite sources."}]}'::jsonb,
  1.5,
  true,
  7
),
(
  'rank-pulse',
  'Rank Pulse',
  'Tracks where you sit for your priority keywords and flags the moves that actually matter.',
  'marketing',
  '📊',
  'Anyone tracking a handful of priority keywords who just wants to know if they moved — up or down.',
  array['rank','keywords','positions','tracking','seo'],
  1,
  'Every {{schedule}}, check where {{site_url}} ranks for {{keywords}} in {{location}} and flag anything that moved — send it to {{output_target}}.',
  '[{"key": "site_url", "question": "What is your website?", "type": "text", "placeholder": "yourbusiness.com"}, {"key": "keywords", "question": "Which priority keywords should I track?", "type": "text", "placeholder": "e.g. coffee beans jakarta, wholesale coffee supplier"}, {"key": "location", "question": "Where should I check from? (optional)", "type": "text", "placeholder": "e.g. Jakarta, United States"}, {"key": "schedule", "question": "How often?", "type": "choice", "options": ["Weekly", "Monthly"]}, {"key": "output_target", "question": "Where should it go?", "type": "choice", "options": ["Chat", "Email", "Dashboard"]}]'::jsonb,
  '{"steps": [{"id": "check", "kind": "search", "task_type": "research", "prompt": "{{keywords}} — top ranking pages {{location}}; where does {{site_url}} appear in the results"}, {"id": "pulse", "kind": "llm", "task_type": "summarize", "schema": "briefing", "prompt": "From the results below, report where {{site_url}} shows up for each priority keyword: {{keywords}} (location: {{location}}). Make one item per keyword: the headline is the keyword plus its current position (or ''not in the top results''), why_it_matters says whether it is a meaningful move, and action is what to do about it. If a previous run appears in your context, flag which keywords moved up or down since last time and by roughly how much; otherwise set this as the baseline. Do not invent exact ranks you cannot see — say ''appears around page N'' when unsure. Cite sources."}]}'::jsonb,
  0.2,
  true,
  8
),
(
  'site-health',
  'Site Health Monitor',
  'Re-checks your site''s technical health each week and alerts you to new errors — broken pages, speed drops, pages falling out of Google.',
  'marketing',
  '🩺',
  'Owners who want to hear about a broken page, a speed drop or a page dropping out of Google before their customers do.',
  array['site-health','technical-seo','core-web-vitals','crawl','alerts'],
  1,
  'Every {{schedule}}, re-check the technical health of {{site_url}} ({{key_pages}}) for {{watch_for}} and alert me to anything new — send it to {{output_target}}.',
  '[{"key": "site_url", "question": "What is your website?", "type": "text", "placeholder": "yourbusiness.com"}, {"key": "key_pages", "question": "Any key pages to watch closely? (optional)", "type": "text", "placeholder": "e.g. /pricing, /checkout"}, {"key": "watch_for", "question": "What should I watch for?", "type": "multi", "options": ["Broken pages & links", "Speed drops", "Pages dropping out of Google", "Missing titles or meta", "Broken structured data"]}, {"key": "schedule", "question": "How often?", "type": "choice", "options": ["Weekly", "Monthly"]}, {"key": "output_target", "question": "Where should it go?", "type": "choice", "options": ["Chat", "Email", "Dashboard"]}]'::jsonb,
  '{"steps": [{"id": "crawl", "kind": "crawl", "task_type": "crawl", "prompt": "{{site_url}}"}, {"id": "health", "kind": "llm", "task_type": "reasoning", "schema": "report", "prompt": "Re-check the technical health of {{site_url}} (key pages: {{key_pages}}). From the crawled page below, look for {{watch_for}}: broken links or pages, missing titles or meta descriptions, slow or heavy pages, pages blocked from search (noindex or robots), and broken structured data. Build the table with them = the expected or last-known-good state and you = what you see now, one row per health area. List new errors as threats, quick fixes as opportunities, and the single most urgent fix as the next move. If a previous run appears in your context, only raise what is NEW or worse since last time. Flag anything you cannot verify from a single page rather than guessing. Cite sources (the crawled page)."}]}'::jsonb,
  0.5,
  true,
  9
),
(
  'advanced-research',
  'Advanced Research',
  'The premium deep dive — a bounded specialist that decides where to look, digs deeper where it matters, and hands you one sharp, sourced answer.',
  'marketing',
  '🔭',
  'When you need the deep dive — a sharper-than-a-human answer to a hard question, with every claim sourced.',
  array['research','deep-dive','agent','premium','sources'],
  3,
  'Research {{topic}} at {{depth}} depth, making sure to cover {{must_cover}} — run {{schedule}} and send the findings to {{output_target}}.',
  '[{"key": "topic", "question": "What should I research?", "type": "text", "placeholder": "e.g. is there room for a premium coffee subscription in Jakarta"}, {"key": "must_cover", "question": "Anything it must cover? (optional)", "type": "text", "placeholder": "e.g. pricing, main players, regulation"}, {"key": "depth", "question": "How deep should it go?", "type": "choice", "options": ["Quick", "Standard", "Deep"]}, {"key": "schedule", "question": "How often?", "type": "choice", "options": ["Once", "Monthly"]}, {"key": "output_target", "question": "Where should it go?", "type": "choice", "options": ["Chat", "Email", "Dashboard"]}]'::jsonb,
  '{"steps": [{"id": "research", "kind": "agent", "task_type": "research", "schema": "answer", "goal": "Deeply research and answer this: {{topic}}. Be sure to cover: {{must_cover}}. Gather current evidence with search and by reading (crawl) the best pages, and draw on the user''s own connected knowledge (graph) where it helps. Look wider first, then go deeper only where it matters, and stop when new searches stop adding anything. Write one clear, plain-language answer with the key points, what to do next, and an honest list of what you could not confirm. Cite every factual claim with a source. Match the effort to {{depth}} depth.", "tools": ["search", "crawl", "graph"], "max_steps": 12, "max_steps_from": {"key": "depth", "values": {"quick": 6, "standard": 9, "deep": 12}}, "credit_ceiling_usd": 1.5, "verify": true}]}'::jsonb,
  1.5,
  true,
  10
)
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category, icon = excluded.icon,
  who_for = excluded.who_for, tags = excluded.tags, autonomy_level = excluded.autonomy_level,
  brief_template = excluded.brief_template, config_schema = excluded.config_schema, workflow_def = excluded.workflow_def,
  est_credit_cost = excluded.est_credit_cost, is_published = excluded.is_published, sort_order = excluded.sort_order;

-- Drop the aggregator; route directly to first-party providers. Benchmark (Task 4.1) decides leaders.
delete from public.routing_weights where model like 'openrouter:%';
delete from public.cost_rates where api_provider = 'openrouter';

insert into public.cost_rates (api_provider, api_model, input_rate, output_rate, unit, source) values
  ('anthropic','claude-opus-5',            5.00, 25.00,'per_1m_tokens','seed'),
  ('anthropic','claude-sonnet-5',          2.00, 10.00,'per_1m_tokens','seed'),
  ('anthropic','claude-haiku-4-5',         1.00,  5.00,'per_1m_tokens','seed'),
  ('openai',   'gpt-5',                    1.25, 10.00,'per_1m_tokens','seed'),
  ('openai',   'gpt-5-mini',               0.25,  2.00,'per_1m_tokens','seed'),
  ('openai',   'gpt-5-nano',               0.05,  0.40,'per_1m_tokens','seed'),
  ('google',   'gemini-2.5-pro',           1.25, 10.00,'per_1m_tokens','seed'),
  ('google',   'gemini-2.5-flash',         0.30,  2.50,'per_1m_tokens','seed'),
  ('google',   'gemini-2.5-flash-lite',    0.10,  0.40,'per_1m_tokens','seed'),
  ('groq',     'llama-3.3-70b-versatile',  0.59,  0.79,'per_1m_tokens','seed'),
  ('groq',     'openai/gpt-oss-120b',      0.15,  0.60,'per_1m_tokens','seed'),
  ('perplexity','sonar',                   1.00,  1.00,'per_1m_tokens','seed'),
  ('perplexity','sonar-pro',               3.00, 15.00,'per_1m_tokens','seed'),
  ('deepseek', 'deepseek-chat',            0.27,  1.10,'per_1m_tokens','seed'),
  ('deepseek', 'deepseek-reasoner',        0.55,  2.19,'per_1m_tokens','seed'),
  ('xai',      'grok-4',                   3.00, 15.00,'per_1m_tokens','seed'),
  ('xai',      'grok-4-fast',              0.20,  0.50,'per_1m_tokens','seed'),
  ('mistral',  'mistral-large-latest',     2.00,  6.00,'per_1m_tokens','seed'),
  ('mistral',  'mistral-small-latest',     0.10,  0.30,'per_1m_tokens','seed')
on conflict (api_provider, api_model) do nothing;

insert into public.routing_weights (task_type, model, weight, is_leader) values
  ('classify',  'groq:llama-3.3-70b-versatile', 1.0, true),
  ('classify',  'anthropic:claude-haiku-4-5',    0.9, false),
  ('classify',  'google:gemini-2.5-flash-lite',  0.8, false),
  ('research',  'perplexity:sonar-pro',          1.0, true),
  ('research',  'perplexity:sonar',              0.8, false),
  ('research',  'google:gemini-2.5-flash',       0.7, false),
  ('synthesis', 'openai:gpt-5-mini',             1.0, true),
  ('synthesis', 'anthropic:claude-sonnet-5',     0.9, false),
  ('synthesis', 'google:gemini-2.5-flash',       0.8, false),
  ('reasoning', 'anthropic:claude-sonnet-5',     1.0, true),
  ('reasoning', 'openai:gpt-5',                  0.9, false),
  ('reasoning', 'deepseek:deepseek-reasoner',    0.8, false),
  ('reasoning', 'anthropic:claude-opus-5',       0.7, false),
  ('code',      'anthropic:claude-sonnet-5',     1.0, true),
  ('code',      'openai:gpt-5',                  0.9, false),
  ('code',      'deepseek:deepseek-chat',        0.8, false),
  ('content',   'anthropic:claude-sonnet-5',     1.0, true),
  ('content',   'openai:gpt-5-mini',             0.9, false),
  ('content',   'xai:grok-4-fast',               0.7, false),
  ('crawl',     'google:gemini-2.5-flash',       1.0, true),
  ('summarize', 'google:gemini-2.5-flash',       1.0, true),
  ('summarize', 'anthropic:claude-haiku-4-5',    0.9, false),
  ('summarize', 'mistral:mistral-small-latest',  0.7, false),
  ('verify',    'openai:gpt-5-mini',             1.0, true),
  ('verify',    'anthropic:claude-haiku-4-5',    0.9, false),
  ('edges',     'groq:llama-3.3-70b-versatile',  1.0, true),
  ('edges',     'google:gemini-2.5-flash-lite',  0.9, false)
on conflict (task_type, model) do nothing;

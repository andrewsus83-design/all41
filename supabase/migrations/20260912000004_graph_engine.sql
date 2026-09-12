-- Graph engine: cost-rate rows for the zero-key dev mode (mock embeddings / mock AI-edge pass).
-- Both price at 0 so api_usage_log rows are written but nothing is deducted.
insert into public.cost_rates (api_provider, api_model, input_rate, output_rate, unit, source) values
  ('mock', 'mock-embed', 0, 0, 'per_1m_tokens', 'seed'),
  ('mock', 'mock-edge',  0, 0, 'per_1m_tokens', 'seed')
on conflict (api_provider, api_model) do nothing;

-- Task hub + source lookups used by /ingest, /link, /link/ai
create index if not exists idx_nodes_user_source on public.knowledge_nodes (user_id, source_type, source_id);

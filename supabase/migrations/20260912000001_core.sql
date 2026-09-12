-- all41 core schema · Master Plan §13 + Graph Engine Spec §3
-- Rules: RLS on every user table (auth.uid() = user_id); admin via app_metadata.role='admin';
-- money in numeric(12,6) USD; credit_ledger append-only; every provider call metered.

create extension if not exists vector;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------
create or replace function public.is_admin() returns boolean
language sql stable as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
$$;

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  display_name  text,
  avatar_url    text,
  plan          text not null default 'payg',           -- 'payg' | 'team' (v2)
  role          text,                                   -- what they do (onboarding q)
  onboarded_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "own profile" on public.profiles for all
  using (auth.uid() = id or public.is_admin()) with check (auth.uid() = id or public.is_admin());
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- files
-- ---------------------------------------------------------------
create table public.files (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users on delete cascade,
  name                 text not null,
  type                 text,
  size_bytes           bigint,
  storage_path         text not null,
  folder               text,
  graphify_indexed     boolean not null default false,
  graphify_node_count  int not null default 0,
  created_at           timestamptz not null default now()
);
create index files_user_idx on public.files (user_id, created_at desc);
alter table public.files enable row level security;
create policy "own files" on public.files for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- user tables (spreadsheet-like)
-- ---------------------------------------------------------------
create table public.user_tables (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  name        text not null,
  columns     jsonb not null default '[]',
  icon        text,
  created_at  timestamptz not null default now()
);
alter table public.user_tables enable row level security;
create policy "own tables" on public.user_tables for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.user_rows (
  id          uuid primary key default gen_random_uuid(),
  table_id    uuid not null references public.user_tables on delete cascade,
  user_id     uuid not null references auth.users on delete cascade,
  data        jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index user_rows_table_idx on public.user_rows (table_id);
alter table public.user_rows enable row level security;
create policy "own rows" on public.user_rows for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- connections (user's OWN world via OAuth — tokens encrypted, never client-readable)
-- ---------------------------------------------------------------
create table public.connections (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references auth.users on delete cascade,
  provider                 text not null,               -- 'gmail' | 'gdrive' | 'gcal'
  access_token_encrypted   bytea,
  refresh_token_encrypted  bytea,
  scopes                   text[],
  status                   text not null default 'active',
  last_synced_at           timestamptz,
  created_at               timestamptz not null default now(),
  unique (user_id, provider)
);
alter table public.connections enable row level security;
-- users may see status only via a view; raw tokens are service-role only
create policy "own connections read" on public.connections for select using (auth.uid() = user_id);
create policy "own connections delete" on public.connections for delete using (auth.uid() = user_id);
revoke select (access_token_encrypted, refresh_token_encrypted) on public.connections from authenticated, anon;

-- ---------------------------------------------------------------
-- mini app catalog (templates built once by the founder)
-- ---------------------------------------------------------------
create table public.mini_apps (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  name             text not null,
  description      text,
  category         text,
  icon             text,
  config_schema    jsonb not null default '[]',   -- questions the briefing asks
  workflow_def     jsonb not null default '{}',   -- pre-built steps + routing
  est_credit_cost  numeric(12,6) not null default 0.05,
  is_published     boolean not null default false,
  sort_order       int not null default 100,
  created_at       timestamptz not null default now()
);
alter table public.mini_apps enable row level security;
create policy "published apps readable" on public.mini_apps for select
  using (is_published or public.is_admin());
create policy "admin manages apps" on public.mini_apps for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------
-- mini app instances (a user's configured copy)
-- ---------------------------------------------------------------
create table public.user_app_instances (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users on delete cascade,
  mini_app_id    uuid not null references public.mini_apps,
  name           text,
  config         jsonb not null default '{}',
  schedule       text not null default 'once',   -- 'once' | 'daily' | 'weekly' | 'monthly' | cron
  output_target  text not null default 'chat',   -- 'chat' | 'email' | 'dashboard'
  next_run_at    timestamptz,
  last_run_at    timestamptz,
  run_count      int not null default 0,
  status         text not null default 'active', -- 'active' | 'paused' | 'done'
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index uai_user_idx on public.user_app_instances (user_id);
create index uai_due_idx on public.user_app_instances (next_run_at) where status = 'active';
alter table public.user_app_instances enable row level security;
create policy "own instances" on public.user_app_instances for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger uai_updated before update on public.user_app_instances
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------
create table public.tasks (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users on delete cascade,
  task_type        text,                          -- from intent classifier (closed set)
  briefing         jsonb not null default '{}',   -- What/Goal/Condition/Execute/Track
  status           text not null default 'draft', -- draft|queued|running|done|failed|blocked
  models_used      text[] not null default '{}',
  total_cost       numeric(12,6) not null default 0,   -- COGS
  total_billed     numeric(12,6) not null default 0,   -- charged to user
  result           jsonb,
  error            text,
  app_instance_id  uuid references public.user_app_instances on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  completed_at     timestamptz
);
create index tasks_user_idx on public.tasks (user_id, created_at desc);
alter table public.tasks enable row level security;
create policy "own tasks" on public.tasks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger tasks_updated before update on public.tasks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- cost rates (re-scraped daily)
-- ---------------------------------------------------------------
create table public.cost_rates (
  api_provider  text not null,
  api_model     text not null,
  input_rate    numeric(14,8) not null default 0,   -- USD per unit (1M tokens, or per call/page)
  output_rate   numeric(14,8) not null default 0,
  unit          text not null default 'per_1m_tokens', -- per_1m_tokens | per_call | per_page | per_1k_chars
  source        text,                                  -- 'seed' | 'scrape' | 'manual'
  updated_at    timestamptz not null default now(),
  primary key (api_provider, api_model)
);
alter table public.cost_rates enable row level security;
create policy "rates readable" on public.cost_rates for select using (true);
create policy "admin manages rates" on public.cost_rates for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------
-- routing weights (the model router config; benchmark updates it)
-- ---------------------------------------------------------------
create table public.routing_weights (
  task_type    text not null,
  model        text not null,          -- provider/model id as used by callModel
  weight       numeric(6,3) not null default 1,
  is_leader    boolean not null default false,
  updated_at   timestamptz not null default now(),
  primary key (task_type, model)
);
alter table public.routing_weights enable row level security;
create policy "weights readable" on public.routing_weights for select using (true);
create policy "admin manages weights" on public.routing_weights for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------
-- api usage log — THE financial source of truth
-- ---------------------------------------------------------------
create table public.api_usage_log (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users on delete set null,   -- null for system jobs (benchmark)
  task_id        uuid references public.tasks on delete set null,
  api_provider   text not null,
  api_model      text not null,
  call_kind      text not null default 'llm',   -- llm|embedding|crawl|search|voice|graph_edge|benchmark
  input_tokens   int not null default 0,
  output_tokens  int not null default 0,
  api_credits    numeric(14,6) not null default 0,   -- non-token units (pages, calls)
  latency_ms     int,
  cost_usd       numeric(12,6) not null,
  rate_snapshot  jsonb,
  markup         numeric(6,3) not null default 3.2,
  platform_fee   numeric(6,4) not null default 0.06,
  billed_usd     numeric(12,6) not null,
  status         text not null default 'ok',          -- ok | error
  error          text,
  created_at     timestamptz not null default now()
);
create index aul_user_idx on public.api_usage_log (user_id, created_at desc);
create index aul_task_idx on public.api_usage_log (task_id);
create index aul_day_idx on public.api_usage_log (created_at);
alter table public.api_usage_log enable row level security;
create policy "own usage read" on public.api_usage_log for select
  using (auth.uid() = user_id or public.is_admin());
-- inserts only via service role (server), never from the client

-- ---------------------------------------------------------------
-- credit ledger (append-only) + balance cache (row-locked)
-- ---------------------------------------------------------------
create table public.credit_balances (
  user_id      uuid primary key references auth.users on delete cascade,
  balance_usd  numeric(12,6) not null default 0,
  updated_at   timestamptz not null default now()
);
alter table public.credit_balances enable row level security;
create policy "own balance read" on public.credit_balances for select
  using (auth.uid() = user_id or public.is_admin());

create table public.credit_ledger (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users on delete cascade,
  type               text not null check (type in ('topup','deduct','grant','refund')),
  amount_usd         numeric(12,6) not null,          -- always positive; sign implied by type
  balance_after      numeric(12,6) not null,
  task_id            uuid references public.tasks on delete set null,
  stripe_payment_id  text,
  note               text,
  created_at         timestamptz not null default now()
);
create index ledger_user_idx on public.credit_ledger (user_id, created_at desc);
create unique index ledger_stripe_uidx on public.credit_ledger (stripe_payment_id) where stripe_payment_id is not null;
alter table public.credit_ledger enable row level security;
create policy "own ledger read" on public.credit_ledger for select
  using (auth.uid() = user_id or public.is_admin());
-- append-only: no update/delete even for service role paths (enforced by trigger)
create or replace function public.ledger_immutable() returns trigger
language plpgsql as $$
begin raise exception 'credit_ledger is append-only'; end $$;
create trigger ledger_no_update before update or delete on public.credit_ledger
  for each row execute function public.ledger_immutable();

-- Stripe event idempotency
create table public.stripe_events (
  id            text primary key,          -- evt_...
  type          text not null,
  processed_at  timestamptz not null default now()
);
alter table public.stripe_events enable row level security;

-- The atomic credit primitive. SECURITY DEFINER, service_role only.
-- Locks the user's balance row so concurrent deductions serialize → no double-spend.
create or replace function public.credit_apply(
  p_user_id uuid,
  p_type text,
  p_amount numeric,
  p_task_id uuid default null,
  p_stripe_payment_id text default null,
  p_note text default null
) returns numeric
language plpgsql security definer set search_path = public as $$
declare
  v_bal numeric(12,6);
  v_new numeric(12,6);
begin
  if p_amount is null or p_amount < 0 then
    raise exception 'INVALID_AMOUNT';
  end if;
  insert into credit_balances (user_id) values (p_user_id) on conflict (user_id) do nothing;
  select balance_usd into v_bal from credit_balances where user_id = p_user_id for update;

  if p_type in ('topup','grant','refund') then
    v_new := v_bal + p_amount;
  elsif p_type = 'deduct' then
    if v_bal < p_amount then
      raise exception 'INSUFFICIENT_CREDIT' using detail = format('balance=%s needed=%s', v_bal, p_amount);
    end if;
    v_new := v_bal - p_amount;
  else
    raise exception 'INVALID_TYPE';
  end if;

  insert into credit_ledger (user_id, type, amount_usd, balance_after, task_id, stripe_payment_id, note)
  values (p_user_id, p_type, p_amount, v_new, p_task_id, p_stripe_payment_id, p_note);
  update credit_balances set balance_usd = v_new, updated_at = now() where user_id = p_user_id;
  return v_new;
end $$;
revoke all on function public.credit_apply(uuid,text,numeric,uuid,text,text) from public, anon, authenticated;

create or replace function public.credit_balance(p_user_id uuid) returns numeric
language sql security definer set search_path = public as $$
  select coalesce((select balance_usd from credit_balances where user_id = p_user_id), 0)
$$;
revoke all on function public.credit_balance(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------
-- free credit on signup (anti-abuse): granted once email is verified,
-- once per normalized email, once per device fingerprint
-- ---------------------------------------------------------------
create table public.free_credit_grants (
  user_id        uuid primary key references auth.users on delete cascade,
  email_key      text not null unique,     -- normalized (dots/plus stripped for gmail)
  fingerprint    text,
  amount_usd     numeric(12,6) not null,
  granted_at     timestamptz not null default now()
);
create index fcg_fp_idx on public.free_credit_grants (fingerprint);
alter table public.free_credit_grants enable row level security;

create or replace function public.normalize_email(p_email text) returns text
language sql immutable as $$
  select case
    when split_part(lower(p_email),'@',2) in ('gmail.com','googlemail.com')
      then replace(split_part(split_part(lower(p_email),'@',1),'+',1),'.','') || '@gmail.com'
    else split_part(lower(p_email),'@',1) || '@' || split_part(lower(p_email),'@',2)
  end
$$;

-- Called by the app after email verification (service role). Returns amount granted (0 if blocked).
create or replace function public.grant_free_credit(p_user_id uuid, p_fingerprint text default null)
returns numeric
language plpgsql security definer set search_path = public as $$
declare
  v_email text;
  v_confirmed timestamptz;
  v_key text;
  v_amount numeric := 2.00;
begin
  select email, email_confirmed_at into v_email, v_confirmed from auth.users where id = p_user_id;
  if v_email is null or v_confirmed is null then return 0; end if;
  v_key := normalize_email(v_email);
  if exists (select 1 from free_credit_grants where user_id = p_user_id) then return 0; end if;
  if exists (select 1 from free_credit_grants where email_key = v_key) then return 0; end if;
  if p_fingerprint is not null and exists (select 1 from free_credit_grants where fingerprint = p_fingerprint) then return 0; end if;
  insert into free_credit_grants (user_id, email_key, fingerprint, amount_usd)
  values (p_user_id, v_key, p_fingerprint, v_amount);
  perform credit_apply(p_user_id, 'grant', v_amount, null, null, 'welcome credit');
  return v_amount;
end $$;
revoke all on function public.grant_free_credit(uuid,text) from public, anon, authenticated;

-- auto-create profile on signup
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
          new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  insert into public.credit_balances (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------
-- daily P&L + benchmarks (admin-only)
-- ---------------------------------------------------------------
create table public.daily_pnl (
  date           date primary key,
  tasks          int not null default 0,
  users          int not null default 0,
  total_cogs     numeric(12,6) not null default 0,
  total_revenue  numeric(12,6) not null default 0,
  gross_profit   numeric(12,6) not null default 0,
  fixed_costs    numeric(12,6) not null default 0,
  net_profit     numeric(12,6) not null default 0,
  gross_margin   numeric(6,4),
  net_margin     numeric(6,4),
  by_provider    jsonb,
  alerts         jsonb,
  generated_at   timestamptz not null default now()
);
alter table public.daily_pnl enable row level security;
create policy "admin pnl" on public.daily_pnl for all using (public.is_admin());

create table public.benchmark_results (
  id            uuid primary key default gen_random_uuid(),
  date          date not null default current_date,
  task_type     text not null,
  model         text not null,
  score         numeric(6,3) not null,
  cost_per_run  numeric(12,6),
  latency_ms    int,
  is_leader     boolean not null default false,
  details       jsonb,
  created_at    timestamptz not null default now()
);
create index bench_date_idx on public.benchmark_results (date desc, task_type);
alter table public.benchmark_results enable row level security;
create policy "benchmarks readable" on public.benchmark_results for select using (true);
create policy "admin manages benchmarks" on public.benchmark_results for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------
-- KNOWLEDGE GRAPH (Graph Engine Spec §3)
-- ---------------------------------------------------------------
create table public.knowledge_nodes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users on delete cascade,
  title         text,
  content       text not null,
  chunk_index   int,
  node_type     text not null,      -- file_chunk|task_output|note|entity|contact|app_result|document
  source_type   text,               -- file|task|app_instance|manual
  source_id     uuid,
  parent_node   uuid references public.knowledge_nodes on delete cascade,
  embedding     vector(1536),
  tags          text[] not null default '{}',
  entities      text[] not null default '{}',
  token_count   int,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_nodes_user      on public.knowledge_nodes (user_id);
create index idx_nodes_embedding on public.knowledge_nodes using hnsw (embedding vector_cosine_ops);
create index idx_nodes_source    on public.knowledge_nodes (source_type, source_id);
create index idx_nodes_type      on public.knowledge_nodes (user_id, node_type);
create index idx_nodes_parent    on public.knowledge_nodes (parent_node);
create unique index idx_nodes_entity_uidx on public.knowledge_nodes (user_id, lower(title)) where node_type = 'entity';
alter table public.knowledge_nodes enable row level security;
create policy "own nodes" on public.knowledge_nodes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger nodes_updated before update on public.knowledge_nodes
  for each row execute function public.set_updated_at();

create table public.knowledge_edges (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  from_node   uuid not null references public.knowledge_nodes on delete cascade,
  to_node     uuid not null references public.knowledge_nodes on delete cascade,
  relation    text not null,
  origin      text not null check (origin in ('deterministic','ai')),
  weight      numeric(6,3) not null default 1.0,
  confidence  numeric(4,3),
  created_at  timestamptz not null default now(),
  unique (from_node, to_node, relation)
);
create index idx_edges_user on public.knowledge_edges (user_id);
create index idx_edges_from on public.knowledge_edges (from_node);
create index idx_edges_to   on public.knowledge_edges (to_node);
alter table public.knowledge_edges enable row level security;
create policy "own edges" on public.knowledge_edges for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Stage 1: semantic anchor (service role passes user id explicitly; RLS also applies for authed callers)
create or replace function public.match_nodes(
  p_user_id uuid,
  p_query vector(1536),
  p_k int default 8,
  p_types text[] default null
) returns table (id uuid, title text, content text, node_type text, source_type text, source_id uuid,
                 parent_node uuid, token_count int, created_at timestamptz, similarity float)
language sql stable security definer set search_path = public as $$
  select n.id, n.title, n.content, n.node_type, n.source_type, n.source_id, n.parent_node,
         n.token_count, n.created_at, 1 - (n.embedding <=> p_query) as similarity
  from knowledge_nodes n
  where n.user_id = p_user_id
    and n.embedding is not null
    and (p_types is null or n.node_type = any(p_types))
  order by n.embedding <=> p_query
  limit p_k
$$;
revoke all on function public.match_nodes(uuid,vector,int,text[]) from public, anon, authenticated;

-- Stage 2: graph expansion up to N hops (returns distinct neighbor node ids with the strongest path weight)
create or replace function public.graph_expand(
  p_user_id uuid,
  p_seed_ids uuid[],
  p_hops int default 2,
  p_limit int default 60
) returns table (id uuid, hop int, path_weight numeric, via_relation text, via_origin text)
language sql stable security definer set search_path = public as $$
  with recursive walk as (
    select unnest(p_seed_ids) as id, 0 as hop, 1.0::numeric as path_weight, null::text as via_relation, null::text as via_origin
    union all
    select case when e.from_node = w.id then e.to_node else e.from_node end,
           w.hop + 1,
           w.path_weight * e.weight * coalesce(e.confidence, 1.0),
           e.relation, e.origin
    from walk w
    join knowledge_edges e on (e.from_node = w.id or e.to_node = w.id) and e.user_id = p_user_id
    where w.hop < p_hops
  )
  select id, min(hop) as hop, max(path_weight) as path_weight,
         (array_agg(via_relation order by hop))[1] as via_relation,
         (array_agg(via_origin order by hop))[1] as via_origin
  from walk
  where hop > 0 and not (id = any(p_seed_ids))
  group by id
  order by path_weight desc, hop asc
  limit p_limit
$$;
revoke all on function public.graph_expand(uuid,uuid[],int,int) from public, anon, authenticated;

-- ---------------------------------------------------------------
-- storage bucket for user files (folder-per-user)
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('user-files', 'user-files', false)
on conflict (id) do nothing;
create policy "users manage own folder" on storage.objects for all
  using (bucket_id = 'user-files' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'user-files' and (storage.foldername(name))[1] = auth.uid()::text);

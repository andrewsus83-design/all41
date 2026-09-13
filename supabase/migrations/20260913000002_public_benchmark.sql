-- Public monthly benchmark — Quality Layer 3 ("proof, not claims").
-- The SAME task run three ways (regular AI · all41 · professional stand-in), judged BLIND by
-- independent AI judges (and, later, real users). Results are published as-is. all41 never scores
-- its own output. These tables are PUBLIC-READ for published rows only; all writes are service-role.
--
-- Idempotent: safe to re-run (create table if not exists, drop/create policies, insert on conflict).

-- ---------------------------------------------------------------
-- one benchmark task per row
-- ---------------------------------------------------------------
create table if not exists public.public_benchmarks (
  id           uuid primary key default gen_random_uuid(),
  date         date not null default current_date,
  task_type    text not null,
  task_prompt  text not null,
  methodology  text not null default '',
  status       text not null default 'draft',   -- draft | illustrative (mock dry run) | published (live)
  published    boolean not null default false,
  is_mock      boolean not null default false,   -- true when produced on offline stand-in providers ($0 real spend)
  created_at   timestamptz not null default now()
);
create index if not exists public_benchmarks_pub_idx on public.public_benchmarks (published, date desc);

-- ---------------------------------------------------------------
-- the three outputs for a benchmark
-- ---------------------------------------------------------------
create table if not exists public.public_benchmark_entries (
  id             uuid primary key default gen_random_uuid(),
  benchmark_id   uuid not null references public.public_benchmarks on delete cascade,
  path           text not null check (path in ('regular_ai','all41','professional')),
  output         jsonb,
  label_revealed boolean not null default false,   -- judges score before labels are revealed
  published      boolean not null default false,   -- mirrors the parent so RLS stays a simple per-row check
  created_at     timestamptz not null default now()
);
create index if not exists public_benchmark_entries_bench_idx on public.public_benchmark_entries (benchmark_id);

-- ---------------------------------------------------------------
-- blind judge scores, per entry
-- ---------------------------------------------------------------
create table if not exists public.public_benchmark_scores (
  id             uuid primary key default gen_random_uuid(),
  benchmark_id   uuid not null references public.public_benchmarks on delete cascade,
  entry_id       uuid not null references public.public_benchmark_entries on delete cascade,
  judge          text not null,
  judge_kind     text not null check (judge_kind in ('ai','user')),
  completeness   int,
  accuracy       int,
  actionability  int,
  depth          int,
  overall        numeric(5,2),
  published      boolean not null default false,
  created_at     timestamptz not null default now()
);
create index if not exists public_benchmark_scores_bench_idx on public.public_benchmark_scores (benchmark_id);
create index if not exists public_benchmark_scores_entry_idx on public.public_benchmark_scores (entry_id);

-- ---------------------------------------------------------------
-- RLS — public can read ONLY published rows; every write is service-role (bypasses RLS).
-- ---------------------------------------------------------------
alter table public.public_benchmarks         enable row level security;
alter table public.public_benchmark_entries  enable row level security;
alter table public.public_benchmark_scores   enable row level security;

drop policy if exists "published benchmarks readable" on public.public_benchmarks;
create policy "published benchmarks readable" on public.public_benchmarks
  for select to anon, authenticated using (published = true);

drop policy if exists "published benchmark entries readable" on public.public_benchmark_entries;
create policy "published benchmark entries readable" on public.public_benchmark_entries
  for select to anon, authenticated using (published = true);

drop policy if exists "published benchmark scores readable" on public.public_benchmark_scores;
create policy "published benchmark scores readable" on public.public_benchmark_scores
  for select to anon, authenticated using (published = true);
-- No insert/update/delete policies for anon/authenticated: writes happen only via the service role.

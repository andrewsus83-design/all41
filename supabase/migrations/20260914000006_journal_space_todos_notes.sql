-- Home "journal" space: a renameable space name, a todo list (one-time / routine),
-- and freeform notes the user writes straight into the feed.

-- 1) A name for the user's space (defaults to "Your journal" in the UI when null).
alter table public.profiles add column if not exists space_name text;

-- 2) Todos — one-time or routine activities pinned above the feed.
create table if not exists public.journal_todos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  kind         text not null default 'once' check (kind in ('once', 'routine')),
  cadence      text check (cadence in ('daily', 'weekly', 'monthly')),
  done         boolean not null default false,
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);
alter table public.journal_todos enable row level security;
drop policy if exists "own journal_todos" on public.journal_todos;
create policy "own journal_todos" on public.journal_todos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists journal_todos_user_idx on public.journal_todos (user_id, done, created_at desc);

-- 3) Notes — written now, land at the top of the journal.
create table if not exists public.journal_notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);
alter table public.journal_notes enable row level security;
drop policy if exists "own journal_notes" on public.journal_notes;
create policy "own journal_notes" on public.journal_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists journal_notes_user_idx on public.journal_notes (user_id, created_at desc);

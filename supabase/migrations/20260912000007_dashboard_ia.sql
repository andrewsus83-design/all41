-- Dashboard IA: Calendar · Build · My Apps · Data · AI · Settings

-- Calendar: to-dos / reminders / scheduled runs per date (past = history, future = plan)
create table public.calendar_items (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users on delete cascade,
  date             date not null,
  title            text not null,
  note             text,
  kind             text not null default 'todo',   -- todo | reminder | run
  done             boolean not null default false,
  task_id          uuid references public.tasks on delete set null,
  app_instance_id  uuid references public.user_app_instances on delete cascade,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index calendar_user_date_idx on public.calendar_items (user_id, date);
alter table public.calendar_items enable row level security;
create policy "own calendar" on public.calendar_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger calendar_updated before update on public.calendar_items for each row execute function public.set_updated_at();

-- Data: docs (folder-like, markdown), alongside files + user_tables (sheets)
create table public.user_docs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  folder      text,
  title       text not null,
  content_md  text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index docs_user_idx on public.user_docs (user_id, folder);
alter table public.user_docs enable row level security;
create policy "own docs" on public.user_docs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger docs_updated before update on public.user_docs for each row execute function public.set_updated_at();
alter table public.user_tables add column if not exists folder text;
alter table public.user_tables add column if not exists updated_at timestamptz not null default now();

-- AI room: think-tank threads scoped to the user's apps + results
create table public.ai_threads (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users on delete cascade,
  title             text,
  app_instance_ids  uuid[] not null default '{}',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table public.ai_threads enable row level security;
create policy "own threads" on public.ai_threads for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger threads_updated before update on public.ai_threads for each row execute function public.set_updated_at();

create table public.ai_messages (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references public.ai_threads on delete cascade,
  user_id     uuid not null references auth.users on delete cascade,
  role        text not null check (role in ('user','assistant','system')),
  content     text not null,
  meta        jsonb,
  cost_usd    numeric(12,6) not null default 0,
  billed_usd  numeric(12,6) not null default 0,
  created_at  timestamptz not null default now()
);
create index ai_messages_thread_idx on public.ai_messages (thread_id, created_at);
alter table public.ai_messages enable row level security;
create policy "own messages" on public.ai_messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Build: a "custom" template so a plain-words brief can become a fully working app (draft → preview → publish)
insert into public.mini_apps (slug, name, description, category, icon, config_schema, workflow_def, est_credit_cost, is_published, sort_order) values
('custom', 'Custom app', 'Your own app from a plain-words brief. Runs once, on a schedule, or whenever you tap it.', 'custom', '✨',
 '[
   {"key":"what","question":"What should this app deliver each time it runs?","type":"text","placeholder":"e.g. A weekly list of new leads in Jakarta real estate with contact hints"},
   {"key":"goal","question":"What will you decide with it?","type":"text","placeholder":"e.g. Who to call first on Monday"},
   {"key":"needs_fresh","question":"Does it need fresh information from the web?","type":"choice","options":["Yes","No"]},
   {"key":"schedule","question":"How often?","type":"choice","options":["Once","Daily","Weekly","Monthly"]},
   {"key":"output_target","question":"Where should it go?","type":"choice","options":["Chat","Email","Dashboard"]}
 ]',
 '{"steps":[
   {"id":"search","kind":"search","task_type":"research","prompt":"{{what}}","when":"needs_fresh=Yes"},
   {"id":"run","kind":"llm","task_type":"reasoning","schema":"answer","prompt":"Deliver: {{what}}. This supports the decision: {{goal}}. Use the user context and any research below. Be concrete. Cite sources."}
 ]}',
 0.05, false, 99)
on conflict (slug) do nothing;

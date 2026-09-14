-- Admin console + multi-tenancy foundation.
-- (1) Organizations / teams (users create an org and invite members; org = billing + data scope).
-- (2) App versioning (every published manifest is snapshotted; rollback-able) + admin audit log.
-- Security: user-facing tables use RLS scoped to membership; admin-only tables use is_admin();
-- the admin console reads via the service-role client behind the requireAdmin() gate.

-- ---------------------------------------------------------------
-- Organizations & teams
-- ---------------------------------------------------------------
create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique,
  owner_id    uuid not null references auth.users on delete cascade,
  plan        text not null default 'payg',           -- payg | team (v2)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists organizations_owner_idx on public.organizations (owner_id);
alter table public.organizations enable row level security;

create table if not exists public.org_members (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations on delete cascade,
  user_id     uuid not null references auth.users on delete cascade,
  role        text not null default 'member' check (role in ('owner','admin','member')),
  created_at  timestamptz not null default now(),
  unique (org_id, user_id)
);
create index if not exists org_members_user_idx on public.org_members (user_id);
create index if not exists org_members_org_idx on public.org_members (org_id);
alter table public.org_members enable row level security;

create table if not exists public.org_invites (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations on delete cascade,
  email       text not null,
  role        text not null default 'member' check (role in ('owner','admin','member')),
  token       text not null unique default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  invited_by  uuid references auth.users on delete set null,
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists org_invites_org_idx on public.org_invites (org_id);
create index if not exists org_invites_email_idx on public.org_invites (lower(email));
alter table public.org_invites enable row level security;

-- RLS — subqueries reference `organizations` (owner) not `org_members`, to avoid recursive policies.
drop policy if exists "read own orgs" on public.organizations;
create policy "read own orgs" on public.organizations for select
  using (is_admin() or owner_id = auth.uid() or id in (select org_id from public.org_members where user_id = auth.uid()));
drop policy if exists "create orgs" on public.organizations;
create policy "create orgs" on public.organizations for insert with check (owner_id = auth.uid());
drop policy if exists "owner manages org" on public.organizations;
create policy "owner manages org" on public.organizations for update using (is_admin() or owner_id = auth.uid()) with check (is_admin() or owner_id = auth.uid());
drop policy if exists "owner deletes org" on public.organizations;
create policy "owner deletes org" on public.organizations for delete using (is_admin() or owner_id = auth.uid());

drop policy if exists "read org members" on public.org_members;
create policy "read org members" on public.org_members for select
  using (is_admin() or user_id = auth.uid() or org_id in (select id from public.organizations where owner_id = auth.uid()));
drop policy if exists "owner manages members" on public.org_members;
create policy "owner manages members" on public.org_members for all
  using (is_admin() or org_id in (select id from public.organizations where owner_id = auth.uid()))
  with check (is_admin() or org_id in (select id from public.organizations where owner_id = auth.uid()));

drop policy if exists "owner manages invites" on public.org_invites;
create policy "owner manages invites" on public.org_invites for all
  using (is_admin() or org_id in (select id from public.organizations where owner_id = auth.uid()))
  with check (is_admin() or org_id in (select id from public.organizations where owner_id = auth.uid()));

-- Backfill: a personal org per existing user, so account_id has a home for everyone.
insert into public.organizations (name, owner_id)
select coalesce(p.display_name, 'My workspace'), p.id from public.profiles p
where not exists (select 1 from public.organizations o where o.owner_id = p.id);
insert into public.org_members (org_id, user_id, role)
select o.id, o.owner_id, 'owner' from public.organizations o
where not exists (select 1 from public.org_members m where m.org_id = o.id and m.user_id = o.owner_id);

-- ---------------------------------------------------------------
-- App versioning + admin audit log (admin-only)
-- ---------------------------------------------------------------
alter table public.mini_apps add column if not exists version int not null default 1;
alter table public.mini_apps add column if not exists updated_at timestamptz not null default now();

create table if not exists public.app_versions (
  id           uuid primary key default gen_random_uuid(),
  mini_app_id  uuid references public.mini_apps on delete cascade,
  slug         text not null,
  version      int not null,
  manifest     jsonb not null,          -- full snapshot of the app manifest at this version
  changelog    text,
  created_by   uuid references auth.users on delete set null,
  created_at   timestamptz not null default now(),
  unique (slug, version)
);
create index if not exists app_versions_slug_idx on public.app_versions (slug, version desc);
alter table public.app_versions enable row level security;
drop policy if exists "admin app_versions" on public.app_versions;
create policy "admin app_versions" on public.app_versions for all using (is_admin()) with check (is_admin());

create table if not exists public.admin_audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor       uuid references auth.users on delete set null,
  action      text not null,            -- e.g. app.publish, member.grant_credit, key.save
  target      text,                     -- slug / user_id / key name
  detail      jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists admin_audit_log_idx on public.admin_audit_log (created_at desc);
alter table public.admin_audit_log enable row level security;
drop policy if exists "admin audit read" on public.admin_audit_log;
create policy "admin audit read" on public.admin_audit_log for select using (is_admin());

-- ---------------------------------------------------------------
-- Email inbox (outbound is logged here; inbound arrives via a provider webhook — admin-managed)
-- ---------------------------------------------------------------
create table if not exists public.inbox_messages (
  id           uuid primary key default gen_random_uuid(),
  direction    text not null default 'inbound' check (direction in ('inbound','outbound')),
  user_id      uuid references auth.users on delete set null,   -- the all41 user this relates to, if known
  from_email   text,
  to_email     text,
  subject      text,
  body         text,
  status       text not null default 'unread',   -- unread | read | replied | archived
  task_id      uuid references public.tasks on delete set null,
  meta         jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists inbox_messages_idx on public.inbox_messages (status, created_at desc);
alter table public.inbox_messages enable row level security;
drop policy if exists "admin inbox" on public.inbox_messages;
create policy "admin inbox" on public.inbox_messages for all using (is_admin()) with check (is_admin());

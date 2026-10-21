-- Core schema: organizations, events, guests, RSVPs and check-ins.
--
-- All objects are prefixed a41_ (helpers live in the a41_private schema)
-- because this database is shared with other apps (cf_*, wos_*). Nothing that
-- already exists is touched.
--
-- Rules that protect revenue (package, extra guests, capacity) are enforced
-- here, not only in the app: authenticated users cannot write billing columns,
-- and the guest list cannot grow past the paid capacity. Public guest pages
-- (invitation, RSVP) go through the server with the service role, so anon has
-- no table access except the package catalog.

create schema if not exists a41_private;
revoke all on schema a41_private from public;
grant usage on schema a41_private to authenticated;

-- ---------------------------------------------------------------------------
-- Package catalog (prices in IDR, see Context Profile v2.4)
-- ---------------------------------------------------------------------------

create table public.a41_packages (
  tier text primary key check (tier in ('free', 'starter', 'plus', 'pro', 'business', 'scale')),
  name text not null,
  sort_order smallint not null unique,
  guest_capacity integer not null check (guest_capacity > 0),
  price_idr integer not null check (price_idr >= 0),
  -- null = extra guests cannot be bought for this package
  extra_guest_price_idr integer check (extra_guest_price_idr > 0),
  -- null = WhatsApp add-on not available for this package
  whatsapp_fonnte_price_idr integer check (whatsapp_fonnte_price_idr > 0),
  whatsapp_official_price_idr integer check (whatsapp_official_price_idr > 0)
);

insert into public.a41_packages
  (tier, name, sort_order, guest_capacity, price_idr, extra_guest_price_idr, whatsapp_fonnte_price_idr, whatsapp_official_price_idr)
values
  ('free',     'Free',     0,    5,       0, null,   null,    null),
  ('starter',  'Starter',  1,   50,  150000, 3000,  50000,  100000),
  ('plus',     'Plus',     2,  300,  750000, 2500, 250000,  300000),
  ('pro',      'Pro',      3,  600, 1350000, 2250, 400000,  600000),
  ('business', 'Business', 4, 1500, 3000000, 2000, 800000, 1500000),
  ('scale',    'Scale',    5, 2500, 4500000, null, 1200000, 2500000);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.a41_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.a41_memberships (
  org_id uuid not null references public.a41_organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'staff')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create index a41_memberships_user_id_idx on public.a41_memberships (user_id);

create table public.a41_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.a41_organizations (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  -- becomes the subdomain: <slug>.all41.app
  slug text not null unique check (
    char_length(slug) between 3 and 40
    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    and slug not in (
      'www', 'app', 'api', 'admin', 'auth', 'login', 'signup', 'dashboard', 'mail', 'email',
      'smtp', 'support', 'help', 'status', 'billing', 'pay', 'static', 'assets', 'cdn', 'docs',
      'blog', 'info', 'staging', 'preview'
    )
  ),
  type text not null check (type in ('corporate', 'wedding')),
  timezone text not null default 'Asia/Jakarta',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  venue_name text check (char_length(venue_name) <= 160),
  venue_address text check (char_length(venue_address) <= 400),
  theme jsonb not null default '{}'::jsonb,
  -- billing columns: written by the server (payment webhook), never by users
  package text not null default 'free' references public.a41_packages (tier),
  extra_guests integer not null default 0 check (extra_guests >= 0 and extra_guests % 10 = 0),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index a41_events_org_id_idx on public.a41_events (org_id);

create table public.a41_guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.a41_events (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  email text check (email = lower(email) and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  -- E.164, e.g. +628123456789
  phone text check (phone ~ '^\+[1-9][0-9]{6,14}$'),
  tags text[] not null default '{}' check (cardinality(tags) <= 20),
  table_no text check (char_length(table_no) <= 20),
  status text not null default 'invited' check (status in ('invited', 'sent', 'opened', 'rsvp', 'checked_in')),
  -- unguessable key for the personal invitation link and the check-in QR
  token text not null unique default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, event_id)
);

create index a41_guests_event_id_idx on public.a41_guests (event_id);
create unique index a41_guests_event_email_key on public.a41_guests (event_id, email) where email is not null;
create unique index a41_guests_event_phone_key on public.a41_guests (event_id, phone) where phone is not null;

create table public.a41_rsvps (
  guest_id uuid primary key,
  event_id uuid not null,
  response text not null check (response in ('attending', 'declined')),
  -- the guest plus companions; companions are not counted against package capacity
  party_size smallint not null default 1 check (party_size between 1 and 10),
  meal_preference text check (char_length(meal_preference) <= 100),
  message text check (char_length(message) <= 500),
  answers jsonb not null default '{}'::jsonb,
  responded_at timestamptz not null default now(),
  foreign key (guest_id, event_id) references public.a41_guests (id, event_id) on delete cascade
);

create index a41_rsvps_event_id_idx on public.a41_rsvps (event_id);

create table public.a41_checkins (
  guest_id uuid primary key,
  event_id uuid not null,
  checked_in_by uuid references auth.users (id) on delete set null default auth.uid(),
  checked_in_at timestamptz not null default now(),
  foreign key (guest_id, event_id) references public.a41_guests (id, event_id) on delete cascade
);

create index a41_checkins_event_id_idx on public.a41_checkins (event_id);

-- ---------------------------------------------------------------------------
-- Helper functions (a41_private is not exposed through the Data API)
-- ---------------------------------------------------------------------------

create function a41_private.is_org_member(p_org uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.a41_memberships m
    where m.org_id = p_org and m.user_id = (select auth.uid())
  )
$$;

create function a41_private.is_org_owner(p_org uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.a41_memberships m
    where m.org_id = p_org and m.user_id = (select auth.uid()) and m.role = 'owner'
  )
$$;

create function a41_private.is_event_member(p_event uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.a41_events e
    join public.a41_memberships m on m.org_id = e.org_id
    where e.id = p_event and m.user_id = (select auth.uid())
  )
$$;

create function a41_private.is_event_owner(p_event uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.a41_events e
    join public.a41_memberships m on m.org_id = e.org_id
    where e.id = p_event and m.user_id = (select auth.uid()) and m.role = 'owner'
  )
$$;

revoke execute on function
  a41_private.is_org_member(uuid),
  a41_private.is_org_owner(uuid),
  a41_private.is_event_member(uuid),
  a41_private.is_event_owner(uuid)
from public;

grant execute on function
  a41_private.is_org_member(uuid),
  a41_private.is_org_owner(uuid),
  a41_private.is_event_member(uuid),
  a41_private.is_event_owner(uuid)
to authenticated;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create function a41_private.set_updated_at() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

create trigger a41_events_set_updated_at before update on public.a41_events
  for each row execute function a41_private.set_updated_at();
create trigger a41_guests_set_updated_at before update on public.a41_guests
  for each row execute function a41_private.set_updated_at();

-- The creator of an organization becomes its owner.
create function a41_private.add_creator_as_owner() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.created_by is not null then
    insert into public.a41_memberships (org_id, user_id, role) values (new.id, new.created_by, 'owner');
  end if;
  return new;
end
$$;

create trigger a41_organizations_add_owner after insert on public.a41_organizations
  for each row execute function a41_private.add_creator_as_owner();

-- Package rules: extra guests only where sold, capacity never shrinks after
-- purchase, and one active Free event per organization (active = not archived
-- and not yet ended).
create function a41_private.enforce_event_rules() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  new_pkg public.a41_packages;
  old_pkg public.a41_packages;
begin
  select * into new_pkg from public.a41_packages where tier = new.package;

  if new.extra_guests > 0 and new_pkg.extra_guest_price_idr is null then
    raise exception 'extra_guests_not_available'
      using errcode = 'check_violation', detail = format('Package %s cannot buy extra guests.', new.package);
  end if;

  if tg_op = 'UPDATE' then
    select * into old_pkg from public.a41_packages where tier = old.package;
    if new_pkg.guest_capacity + new.extra_guests < old_pkg.guest_capacity + old.extra_guests then
      raise exception 'capacity_cannot_decrease'
        using errcode = 'check_violation', detail = 'Paid capacity cannot be reduced.';
    end if;
  end if;

  if new.package = 'free' and new.status <> 'archived' and new.ends_at > now() then
    perform pg_advisory_xact_lock(hashtextextended(new.org_id::text, 0));
    if exists (
      select 1 from public.a41_events e
      where e.org_id = new.org_id and e.id <> new.id
        and e.package = 'free' and e.status <> 'archived' and e.ends_at > now()
    ) then
      raise exception 'free_event_limit'
        using errcode = 'check_violation', detail = 'Only one active Free event is allowed per organization.';
    end if;
  end if;

  return new;
end
$$;

create trigger a41_events_enforce_rules before insert or update on public.a41_events
  for each row execute function a41_private.enforce_event_rules();

-- The guest list cannot grow past package capacity plus purchased extra guests.
create function a41_private.enforce_guest_capacity() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  capacity integer;
  current_count integer;
begin
  -- lock the event row so concurrent imports cannot both pass the check
  select p.guest_capacity + e.extra_guests into capacity
  from public.a41_events e
  join public.a41_packages p on p.tier = e.package
  where e.id = new.event_id
  for update of e;

  select count(*) into current_count from public.a41_guests where event_id = new.event_id;

  if current_count >= capacity then
    raise exception 'guest_capacity_exceeded'
      using errcode = 'check_violation', detail = format('The guest list is full (%s of %s).', current_count, capacity);
  end if;

  return new;
end
$$;

create trigger a41_guests_enforce_capacity before insert on public.a41_guests
  for each row execute function a41_private.enforce_guest_capacity();

create function a41_private.mark_guest_rsvp() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.a41_guests set status = 'rsvp'
  where id = new.guest_id and status in ('invited', 'sent', 'opened');
  return new;
end
$$;

create trigger a41_rsvps_mark_guest after insert or update on public.a41_rsvps
  for each row execute function a41_private.mark_guest_rsvp();

create function a41_private.mark_guest_checked_in() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.a41_guests set status = 'checked_in' where id = new.guest_id;
  return new;
end
$$;

create trigger a41_checkins_mark_guest after insert on public.a41_checkins
  for each row execute function a41_private.mark_guest_checked_in();

-- ---------------------------------------------------------------------------
-- Row level security and grants
-- ---------------------------------------------------------------------------

alter table public.a41_packages enable row level security;
alter table public.a41_organizations enable row level security;
alter table public.a41_memberships enable row level security;
alter table public.a41_events enable row level security;
alter table public.a41_guests enable row level security;
alter table public.a41_rsvps enable row level security;
alter table public.a41_checkins enable row level security;

revoke all on public.a41_packages, public.a41_organizations, public.a41_memberships, public.a41_events,
  public.a41_guests, public.a41_rsvps, public.a41_checkins from anon, authenticated;

-- packages: public catalog, read-only
grant select on public.a41_packages to anon, authenticated;
create policy packages_select on public.a41_packages for select to anon, authenticated using (true);

-- organizations: members read, owners rename; created_by is set by the database
grant select on public.a41_organizations to authenticated;
grant insert (name) on public.a41_organizations to authenticated;
grant update (name) on public.a41_organizations to authenticated;
create policy organizations_select on public.a41_organizations for select to authenticated
  using ((select a41_private.is_org_member(id)) or created_by = (select auth.uid()));
create policy organizations_insert on public.a41_organizations for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy organizations_update on public.a41_organizations for update to authenticated
  using ((select a41_private.is_org_owner(id)))
  with check ((select a41_private.is_org_owner(id)));

-- memberships: members see their team; changes go through the server
grant select on public.a41_memberships to authenticated;
create policy memberships_select on public.a41_memberships for select to authenticated
  using ((select a41_private.is_org_member(org_id)));

-- events: members read, owners manage everything except billing columns;
-- only Free events can be deleted (paid events are archived instead)
grant select on public.a41_events to authenticated;
grant insert (org_id, name, slug, type, timezone, starts_at, ends_at, venue_name, venue_address, theme)
  on public.a41_events to authenticated;
grant update (name, slug, timezone, starts_at, ends_at, venue_name, venue_address, theme, status)
  on public.a41_events to authenticated;
grant delete on public.a41_events to authenticated;
create policy events_select on public.a41_events for select to authenticated
  using ((select a41_private.is_org_member(org_id)));
create policy events_insert on public.a41_events for insert to authenticated
  with check ((select a41_private.is_org_owner(org_id)));
create policy events_update on public.a41_events for update to authenticated
  using ((select a41_private.is_org_owner(org_id)))
  with check ((select a41_private.is_org_owner(org_id)));
create policy events_delete on public.a41_events for delete to authenticated
  using ((select a41_private.is_org_owner(org_id)) and package = 'free');

-- guests: members read, owners manage the list; status is maintained by triggers
grant select on public.a41_guests to authenticated;
grant insert (event_id, name, email, phone, tags, table_no) on public.a41_guests to authenticated;
grant update (name, email, phone, tags, table_no) on public.a41_guests to authenticated;
grant delete on public.a41_guests to authenticated;
create policy guests_select on public.a41_guests for select to authenticated
  using ((select a41_private.is_event_member(event_id)));
create policy guests_insert on public.a41_guests for insert to authenticated
  with check ((select a41_private.is_event_owner(event_id)));
create policy guests_update on public.a41_guests for update to authenticated
  using ((select a41_private.is_event_owner(event_id)))
  with check ((select a41_private.is_event_owner(event_id)));
create policy guests_delete on public.a41_guests for delete to authenticated
  using ((select a41_private.is_event_owner(event_id)));

-- rsvps: members read; guests submit through the server
grant select on public.a41_rsvps to authenticated;
create policy rsvps_select on public.a41_rsvps for select to authenticated
  using ((select a41_private.is_event_member(event_id)));

-- checkins: owners and staff scan guests in; rows are never edited
grant select on public.a41_checkins to authenticated;
grant insert (guest_id, event_id) on public.a41_checkins to authenticated;
create policy checkins_select on public.a41_checkins for select to authenticated
  using ((select a41_private.is_event_member(event_id)));
create policy checkins_insert on public.a41_checkins for insert to authenticated
  with check (checked_in_by = (select auth.uid()) and (select a41_private.is_event_member(event_id)));

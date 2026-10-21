-- Photo wall: guests take a photo in the browser, it is uploaded straight to
-- Storage, appears on a big screen after moderation, and stays in a shared
-- album for 30 days.
--
-- Everything is prefixed a41_ because this database is shared with other apps.
-- Guests are not signed in. They act with the token of their invitation link
-- (a41_guests.token) through the public functions below, which check it with
-- a41_private.guest_by_token. Storage needs a second gate because the upload
-- itself goes from the phone to the bucket, not through our server:
--
--   1. a41_request_photo_upload checks token, consent, quota and that the photo
--      wall is on, and hands out a one-time path (a "ticket")
--   2. the phone uploads to exactly that path; the policy on storage.objects
--      lets anon insert only a path that has an open ticket
--   3. a41_commit_photo checks the object really is there, with the right size
--      and type, and turns the ticket into a photo row
--
-- Limits (spec): WebP or JPEG, at most 2 MB, at most 10 photos per guest,
-- kept 30 days. Guests must consent to photos of their face (UU PDP).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- One row per event, created with the event. The wall key is part of the link
-- that opens the big-screen wall, so it is unguessable and can be replaced.
create table public.a41_photo_settings (
  event_id uuid primary key references public.a41_events (id) on delete cascade,
  enabled boolean not null default false,
  -- auto: photos show right away, manual: photos wait for the host to approve
  moderation text not null default 'manual' check (moderation in ('auto', 'manual')),
  wall_key text not null default replace(gen_random_uuid()::text, '-', '') check (char_length(wall_key) >= 32),
  updated_at timestamptz not null default now()
);

create trigger a41_photo_settings_set_updated_at before update on public.a41_photo_settings
  for each row execute function a41_private.set_updated_at();

-- A guest agrees once that photos of them may be shown to the other guests.
create table public.a41_photo_consents (
  guest_id uuid primary key,
  event_id uuid not null,
  consented_at timestamptz not null default now(),
  foreign key (guest_id, event_id) references public.a41_guests (id, event_id) on delete cascade
);

create index a41_photo_consents_event_id_idx on public.a41_photo_consents (event_id);

-- One-time upload permissions. Nobody but the database reads this table: the
-- paths in it are what lets a phone write into the bucket.
create table public.a41_photo_tickets (
  path text primary key check (
    path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg)$'
  ),
  guest_id uuid not null,
  event_id uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '15 minutes',
  foreign key (guest_id, event_id) references public.a41_guests (id, event_id) on delete cascade
);

create index a41_photo_tickets_guest_id_idx on public.a41_photo_tickets (guest_id);
create index a41_photo_tickets_event_id_idx on public.a41_photo_tickets (event_id);

create table public.a41_photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  guest_id uuid not null,
  -- <event id>/<random uuid>.webp|jpg inside the a41_photos bucket; never contains the guest token
  storage_path text not null unique check (
    storage_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg)$'
    and starts_with(storage_path, event_id::text || '/')
  ),
  -- removed: the guest took it down; hidden everywhere, the file is deleted
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'removed')),
  bytes integer not null check (bytes between 1 and 2097152),
  content_type text not null check (content_type in ('image/webp', 'image/jpeg')),
  created_at timestamptz not null default now(),
  -- when it became visible: the wall shows the most recently approved photos
  approved_at timestamptz,
  expires_at timestamptz not null default now() + interval '30 days',
  foreign key (guest_id, event_id) references public.a41_guests (id, event_id) on delete cascade,
  check ((storage_path like '%.webp' and content_type = 'image/webp') or (storage_path like '%.jpg' and content_type = 'image/jpeg')),
  check ((status = 'approved') = (approved_at is not null))
);

create index a41_photos_guest_id_idx on public.a41_photos (guest_id);
create index a41_photos_event_status_idx on public.a41_photos (event_id, status, created_at desc);
-- the wall and the album read the newest approved photos of one event
create index a41_photos_visible_idx on public.a41_photos (event_id, approved_at desc, id desc) where status = 'approved';
create index a41_photos_expires_at_idx on public.a41_photos (expires_at);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Every event gets its photo settings, switched off.
create function a41_private.create_photo_settings() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.a41_photo_settings (event_id) values (new.id) on conflict do nothing;
  return new;
end
$$;

create trigger a41_events_create_photo_settings after insert on public.a41_events
  for each row execute function a41_private.create_photo_settings();

insert into public.a41_photo_settings (event_id)
select e.id from public.a41_events e
on conflict do nothing;

-- approved_at is when a photo last became visible. Owners can only change the
-- status, so the clock cannot be set by hand.
create function a41_private.stamp_photo_approval() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
    new.approved_at = clock_timestamp();
  elsif new.status <> 'approved' then
    new.approved_at = null;
  end if;
  return new;
end
$$;

create trigger a41_photos_stamp_approval before insert or update of status on public.a41_photos
  for each row execute function a41_private.stamp_photo_approval();

-- ---------------------------------------------------------------------------
-- Helpers (a41_private)
-- ---------------------------------------------------------------------------

-- Photos can be added until a while after the event, for the after-party and
-- the guests who post late; a leaked link cannot fill the bucket forever.
create function a41_private.photo_upload_deadline(p_event uuid) returns timestamptz
language sql stable security definer set search_path = ''
as $$
  select e.ends_at + interval '12 hours' from public.a41_events e where e.id = p_event
$$;

-- Storage policy helpers. They compare text on purpose: the policies run for
-- every object in every bucket of the shared project, and a cast of a foreign
-- object name to uuid would fail for somebody else's files.
create function a41_private.has_photo_ticket(p_name text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.a41_photo_tickets t where t.path = p_name and t.expires_at > now())
$$;

create function a41_private.is_removed_photo_object(p_name text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.a41_photos p where p.storage_path = p_name and p.status = 'removed')
$$;

-- Objects live in a folder named after their event; owners of that event manage them.
create function a41_private.owns_photo_object(p_name text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.a41_events e
    where e.id = (
      case when split_part(p_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then split_part(p_name, '/', 1)::uuid
      end
    )
    and a41_private.is_event_owner(e.id)
  )
$$;

revoke execute on function
  a41_private.create_photo_settings(),
  a41_private.stamp_photo_approval(),
  a41_private.photo_upload_deadline(uuid),
  a41_private.has_photo_ticket(text),
  a41_private.is_removed_photo_object(text),
  a41_private.owns_photo_object(text)
from public;

-- Storage evaluates its policies as the caller, and guests are anon. The schema
-- is not exposed through the Data API; only the functions granted below run.
grant usage on schema a41_private to anon;
grant execute on function
  a41_private.has_photo_ticket(text),
  a41_private.is_removed_photo_object(text),
  a41_private.owns_photo_object(text)
to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Public functions for guests (token gated, never reveal whether a token exists)
-- ---------------------------------------------------------------------------

-- What the camera page needs: the event, whether uploads are open, consent and quota.
create function public.a41_photo_overview(p_token text)
returns table (
  guest_name text,
  event_name text,
  event_slug text,
  theme jsonb,
  timezone text,
  starts_at timestamptz,
  ends_at timestamptz,
  photos_enabled boolean,
  uploads_open boolean,
  moderation text,
  consented_at timestamptz,
  photos_used integer,
  photo_quota integer
)
language sql stable security definer set search_path = ''
as $$
  select
    g.name,
    e.name,
    e.slug,
    e.theme,
    e.timezone,
    e.starts_at,
    e.ends_at,
    s.enabled,
    s.enabled and now() < a41_private.photo_upload_deadline(g.event_id),
    s.moderation,
    c.consented_at,
    (select count(*)::integer from public.a41_photos p where p.guest_id = g.id and p.status <> 'removed'),
    10
  from a41_private.guest_by_token(p_token) g
  join public.a41_events e on e.id = g.event_id
  join public.a41_photo_settings s on s.event_id = g.event_id
  left join public.a41_photo_consents c on c.guest_id = g.id
$$;

-- Step 1 of an upload. Records the guest's consent when p_consent is true.
create function public.a41_request_photo_upload(p_token text, p_format text default 'webp', p_consent boolean default false)
returns table (upload_path text, ticket_expires_at timestamptz, photos_left integer)
language plpgsql security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  g public.a41_guests;
  s public.a41_photo_settings;
  v_deadline timestamptz;
  v_used integer;
  v_open integer;
  v_path text;
  v_expires timestamptz;
begin
  select * into g from a41_private.guest_by_token(p_token);
  if not found then
    raise exception 'invitation_not_found' using errcode = 'P0002';
  end if;

  if p_format is null or p_format not in ('webp', 'jpg') then
    raise exception 'invalid_photo_format' using errcode = '22023';
  end if;

  select * into s from public.a41_photo_settings ps where ps.event_id = g.event_id;
  if not found or not s.enabled then
    raise exception 'photos_disabled' using errcode = 'check_violation';
  end if;

  v_deadline := a41_private.photo_upload_deadline(g.event_id);
  if now() >= v_deadline then
    raise exception 'photos_closed' using errcode = 'check_violation';
  end if;

  -- one request per guest at a time, so two phones cannot both take the last slot
  perform pg_advisory_xact_lock(hashtextextended('a41_photos:' || g.id::text, 0));

  if p_consent is true then
    insert into public.a41_photo_consents (guest_id, event_id) values (g.id, g.event_id)
    on conflict (guest_id) do nothing;
  end if;
  if not exists (select 1 from public.a41_photo_consents c where c.guest_id = g.id) then
    raise exception 'consent_required' using errcode = 'check_violation';
  end if;

  delete from public.a41_photo_tickets t where t.guest_id = g.id and t.expires_at <= now();

  select count(*) into v_used from public.a41_photos p where p.guest_id = g.id and p.status <> 'removed';
  select count(*) into v_open from public.a41_photo_tickets t where t.guest_id = g.id;
  if v_used + v_open >= 10 then
    raise exception 'photo_limit_reached' using errcode = 'check_violation';
  end if;

  v_path := g.event_id::text || '/' || gen_random_uuid()::text || '.' || p_format;
  insert into public.a41_photo_tickets (path, guest_id, event_id) values (v_path, g.id, g.event_id)
  returning expires_at into v_expires;

  return query select v_path, v_expires, 10 - v_used - v_open - 1;
end
$$;

-- Step 3 of an upload: the object is in the bucket, make it a photo. Calling it
-- again for the same path (a lost response) returns the photo it already made.
create function public.a41_commit_photo(p_token text, p_path text)
returns table (photo_id uuid, photo_status text, storage_path text, created_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  g public.a41_guests;
  s public.a41_photo_settings;
  v_photo public.a41_photos;
  v_meta jsonb;
  v_size integer;
  v_type text;
  v_expected text;
begin
  select * into g from a41_private.guest_by_token(p_token);
  if not found then
    raise exception 'invitation_not_found' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('a41_photos:' || g.id::text, 0));

  select * into v_photo from public.a41_photos p where p.storage_path = p_path and p.guest_id = g.id;
  if found then
    return query select v_photo.id, v_photo.status, v_photo.storage_path, v_photo.created_at;
    return;
  end if;

  if not exists (
    select 1 from public.a41_photo_tickets t
    where t.path = p_path and t.guest_id = g.id and t.expires_at > now()
  ) then
    raise exception 'upload_ticket_invalid' using errcode = 'check_violation';
  end if;

  select o.metadata into v_meta from storage.objects o where o.bucket_id = 'a41_photos' and o.name = p_path;
  if not found then
    raise exception 'upload_missing' using errcode = 'check_violation';
  end if;

  v_size := coalesce(v_meta ->> 'size', v_meta ->> 'contentLength')::integer;
  v_type := v_meta ->> 'mimetype';
  v_expected := case when p_path like '%.webp' then 'image/webp' else 'image/jpeg' end;
  if v_size is null or v_size < 1 or v_size > 2097152 then
    raise exception 'photo_too_large' using errcode = 'check_violation';
  end if;
  if v_type is distinct from v_expected then
    raise exception 'invalid_photo_type' using errcode = 'check_violation';
  end if;

  select * into s from public.a41_photo_settings ps where ps.event_id = g.event_id;
  if not found or not s.enabled then
    raise exception 'photos_disabled' using errcode = 'check_violation';
  end if;

  insert into public.a41_photos (event_id, guest_id, storage_path, status, bytes, content_type)
  values (
    g.event_id, g.id, p_path,
    case s.moderation when 'auto' then 'approved' else 'pending' end,
    v_size, v_expected
  )
  returning * into v_photo;

  delete from public.a41_photo_tickets t where t.path = p_path;

  return query select v_photo.id, v_photo.status, v_photo.storage_path, v_photo.created_at;
end
$$;

-- The guest's own photos, with their status, so they can follow what happens to them.
create function public.a41_my_photos(p_token text)
returns table (photo_id uuid, photo_status text, storage_path text, created_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.status, p.storage_path, p.created_at
  from a41_private.guest_by_token(p_token) g
  join public.a41_photos p on p.guest_id = g.id
  where p.status <> 'removed' and p.expires_at > now()
  order by p.created_at desc, p.id desc
$$;

-- Takes one of the guest's own photos down. Returns its storage path so the
-- caller can delete the file; null when there was nothing to remove.
create function public.a41_remove_my_photo(p_token text, p_photo_id uuid) returns text
language plpgsql security definer set search_path = ''
as $$
declare
  g public.a41_guests;
  v_path text;
begin
  select * into g from a41_private.guest_by_token(p_token);
  if not found then
    raise exception 'invitation_not_found' using errcode = 'P0002';
  end if;

  update public.a41_photos p set status = 'removed'
  where p.id = p_photo_id and p.guest_id = g.id and p.status <> 'removed'
  returning p.storage_path into v_path;

  return v_path;
end
$$;

-- The shared album: approved photos of the event, newest first, a page at a time.
-- Pass the last row's approved_at and photo_id to get the next page.
create function public.a41_album(
  p_token text,
  p_limit integer default 120,
  p_before timestamptz default null,
  p_before_id uuid default null
)
returns table (photo_id uuid, storage_path text, approved_at timestamptz, is_mine boolean)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.storage_path, p.approved_at, p.guest_id = g.id
  from a41_private.guest_by_token(p_token) g
  join public.a41_photo_settings s on s.event_id = g.event_id and s.enabled
  join public.a41_photos p on p.event_id = g.event_id
  where p.status = 'approved'
    and p.expires_at > now()
    and (p_before is null or (p.approved_at, p.id) < (p_before, coalesce(p_before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)))
  order by p.approved_at desc, p.id desc
  limit least(greatest(coalesce(p_limit, 120), 1), 200)
$$;

-- ---------------------------------------------------------------------------
-- The big-screen wall: opened with the event slug and the wall key, no sign-in
-- ---------------------------------------------------------------------------

-- Null for an unknown slug, a wrong key or an event that is not published.
create function public.a41_wall_feed(p_slug text, p_key text, p_limit integer default 48)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'event', jsonb_build_object('name', e.name, 'slug', e.slug, 'theme', e.theme, 'timezone', e.timezone),
    'enabled', s.enabled,
    'total', case when s.enabled then (
      select count(*) from public.a41_photos p
      where p.event_id = e.id and p.status = 'approved' and p.expires_at > now()
    ) else 0 end,
    'photos', case when s.enabled then (
      select coalesce(
        jsonb_agg(
          jsonb_build_object('id', x.id, 'storage_path', x.storage_path, 'approved_at', x.approved_at)
          order by x.approved_at desc, x.id desc
        ),
        '[]'::jsonb
      )
      from (
        select p.id, p.storage_path, p.approved_at
        from public.a41_photos p
        where p.event_id = e.id and p.status = 'approved' and p.expires_at > now()
        order by p.approved_at desc, p.id desc
        limit least(greatest(coalesce(p_limit, 48), 1), 200)
      ) x
    ) else '[]'::jsonb end
  )
  from public.a41_events e
  join public.a41_photo_settings s on s.event_id = e.id
  where e.slug = p_slug and e.status = 'published' and s.wall_key = p_key
$$;

-- ---------------------------------------------------------------------------
-- Functions for the host
-- ---------------------------------------------------------------------------

-- Replaces the wall key, so the old wall link stops working. Owners only.
create function public.a41_regenerate_wall_key(p_event_id uuid) returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_key text := replace(gen_random_uuid()::text, '-', '');
begin
  if not (select a41_private.is_event_owner(p_event_id)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.a41_photo_settings s set wall_key = v_key where s.event_id = p_event_id;
  return v_key;
end
$$;

-- Counts and storage for the dashboard. Security invoker: row level security
-- shows the team their own event and a stranger zeros.
create function public.a41_photo_stats(p_event_id uuid)
returns table (
  pending_count integer,
  approved_count integer,
  rejected_count integer,
  removed_count integer,
  stored_bytes bigint,
  consent_count integer
)
language sql stable security invoker set search_path = ''
as $$
  select
    (count(*) filter (where p.status = 'pending'))::integer,
    (count(*) filter (where p.status = 'approved'))::integer,
    (count(*) filter (where p.status = 'rejected'))::integer,
    (count(*) filter (where p.status = 'removed'))::integer,
    coalesce(sum(p.bytes) filter (where p.status <> 'removed'), 0)::bigint,
    (select count(*)::integer from public.a41_photo_consents c where c.event_id = p_event_id)
  from public.a41_photos p
  where p.event_id = p_event_id
$$;

-- For the retention job, which runs with the service role: the files to delete
-- from Storage. Expired photos, photos guests took down, and uploads that never
-- became a photo (older than a day, no photo row, no open ticket). Removing the
-- file and then the rows is the job's work, because only the Storage API removes bytes.
create function public.a41_expired_photo_paths()
returns table (storage_path text, reason text)
language sql stable security definer set search_path = ''
as $$
  select p.storage_path, case when p.status = 'removed' then 'removed' else 'expired' end
  from public.a41_photos p
  where p.status = 'removed' or p.expires_at <= now()
  union all
  select o.name, 'orphan'
  from storage.objects o
  where o.bucket_id = 'a41_photos'
    and o.created_at < now() - interval '1 day'
    and not exists (select 1 from public.a41_photos p where p.storage_path = o.name)
    and not exists (select 1 from public.a41_photo_tickets t where t.path = o.name and t.expires_at > now())
$$;

revoke execute on function
  public.a41_photo_overview(text),
  public.a41_request_photo_upload(text, text, boolean),
  public.a41_commit_photo(text, text),
  public.a41_my_photos(text),
  public.a41_remove_my_photo(text, uuid),
  public.a41_album(text, integer, timestamptz, uuid),
  public.a41_wall_feed(text, text, integer),
  public.a41_regenerate_wall_key(uuid),
  public.a41_photo_stats(uuid),
  public.a41_expired_photo_paths()
from public;

grant execute on function
  public.a41_photo_overview(text),
  public.a41_request_photo_upload(text, text, boolean),
  public.a41_commit_photo(text, text),
  public.a41_my_photos(text),
  public.a41_remove_my_photo(text, uuid),
  public.a41_album(text, integer, timestamptz, uuid),
  public.a41_wall_feed(text, text, integer)
to anon, authenticated;

revoke execute on function
  public.a41_regenerate_wall_key(uuid), public.a41_photo_stats(uuid), public.a41_expired_photo_paths()
from anon;
grant execute on function public.a41_regenerate_wall_key(uuid), public.a41_photo_stats(uuid) to authenticated;
revoke execute on function public.a41_expired_photo_paths() from authenticated;
grant execute on function public.a41_expired_photo_paths() to service_role;

-- ---------------------------------------------------------------------------
-- Row level security and grants
-- ---------------------------------------------------------------------------

alter table public.a41_photo_settings enable row level security;
alter table public.a41_photo_consents enable row level security;
alter table public.a41_photo_tickets enable row level security;
alter table public.a41_photos enable row level security;

revoke all on public.a41_photo_settings, public.a41_photo_consents, public.a41_photo_tickets, public.a41_photos
  from anon, authenticated;

-- settings: the team reads them, owners switch the wall on and pick the moderation;
-- the wall key only changes through a41_regenerate_wall_key
grant select on public.a41_photo_settings to authenticated;
grant update (enabled, moderation) on public.a41_photo_settings to authenticated;
create policy photo_settings_select on public.a41_photo_settings for select to authenticated
  using ((select a41_private.is_event_member(event_id)));
create policy photo_settings_update on public.a41_photo_settings for update to authenticated
  using ((select a41_private.is_event_owner(event_id)))
  with check ((select a41_private.is_event_owner(event_id)));

-- consents: proof for the team; written only by a41_request_photo_upload
grant select on public.a41_photo_consents to authenticated;
create policy photo_consents_select on public.a41_photo_consents for select to authenticated
  using ((select a41_private.is_event_member(event_id)));

-- tickets: no policy and no grant, only the functions above touch them

-- photos: the team reads, owners moderate and delete; rows are created only by
-- a41_commit_photo and a guest removes their own through a41_remove_my_photo
grant select on public.a41_photos to authenticated;
grant update (status) on public.a41_photos to authenticated;
grant delete on public.a41_photos to authenticated;
create policy photos_select on public.a41_photos for select to authenticated
  using ((select a41_private.is_event_member(event_id)));
create policy photos_update on public.a41_photos for update to authenticated
  using (status <> 'removed' and (select a41_private.is_event_owner(event_id)))
  with check (status in ('pending', 'approved', 'rejected') and (select a41_private.is_event_owner(event_id)));
create policy photos_delete on public.a41_photos for delete to authenticated
  using ((select a41_private.is_event_owner(event_id)));

-- ---------------------------------------------------------------------------
-- Storage: the bucket and who may write to it
-- ---------------------------------------------------------------------------

-- Public, so the wall and the album can show the files by URL. The paths are
-- random and only the guest who took a photo, the team and the wall (once it is
-- approved) ever learn them; there is no policy that lets anon list the bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('a41_photos', 'a41_photos', true, 2097152, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

-- Upload: only to a path with an open ticket. Nobody can overwrite (no update policy).
create policy a41_photos_upload_with_ticket on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'a41_photos' and (select a41_private.has_photo_ticket(name)));

-- Owners delete the files of their own event. Storage reads a row back to
-- delete it, so deleting needs the select policy too.
create policy a41_photos_owner_select on storage.objects for select to authenticated
  using (bucket_id = 'a41_photos' and (select a41_private.owns_photo_object(name)));
create policy a41_photos_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'a41_photos' and (select a41_private.owns_photo_object(name)));

-- A guest takes their own photo down (a41_remove_my_photo marks it removed first);
-- afterwards the file can be deleted by whoever holds its path, which is that guest.
create policy a41_photos_removed_select on storage.objects for select to anon, authenticated
  using (bucket_id = 'a41_photos' and (select a41_private.is_removed_photo_object(name)));
create policy a41_photos_removed_delete on storage.objects for delete to anon, authenticated
  using (bucket_id = 'a41_photos' and (select a41_private.is_removed_photo_object(name)));

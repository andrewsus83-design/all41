-- Photo wall, part 2 of 3: helpers and the functions, except the two that clear upload
-- tickets (a41_request_photo_upload and a41_commit_photo, in a41_delete_functions).
--
-- The Supabase connector used to apply migrations holds back any statement that deletes
-- rows until a person confirms it, so the work below was applied in parts, each under the
-- version in its file name. The functions that delete rows are in a41_delete_functions.

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

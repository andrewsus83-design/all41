-- Photo wall, part 1 of 3: tables, triggers and row level security.
-- (a41_photo_functions has the functions, a41_photo_storage the bucket and its policies.)
--
-- The Supabase connector used to apply migrations holds back any statement that deletes
-- rows until a person confirms it, so the work below was applied in parts, each under the
-- version in its file name. The functions that delete rows are in a41_delete_functions.

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

revoke execute on function
  a41_private.create_photo_settings(),
  a41_private.stamp_photo_approval()
from public;

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

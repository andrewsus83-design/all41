-- The four functions that delete rows: undo a check-in, request and commit a photo upload,
-- claim a hunt code.
--
-- Everything else of the check-in, photo wall and games work was applied through the Supabase
-- connector. The connector holds back any statement that deletes rows until a person confirms
-- it, and these functions contain such a statement, so this file is run by a person in the SQL
-- editor of the project.
--
--   a41_undo_check_in         owners take back a mistaken check-in
--   a41_request_photo_upload  a guest asks to upload a photo (clears their expired tickets)
--   a41_commit_photo          the upload is done, make it a photo (clears its ticket)
--   a41_hunt_claim            a guest redeems a hunt code (clears wrong tries older than an hour)
--
-- It creates the four functions and drops five empty scratch functions (zz_probe1 to 5)
-- left behind while finding that out. No existing row is touched.

-- Undo: an owner takes a check-in back (a mistaken scan). The guest returns to the
-- status they had before. False when that guest is not checked in.
create function public.a41_undo_check_in(p_event uuid, p_guest uuid) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_removed integer;
begin
  if not a41_private.is_event_owner(p_event) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  delete from public.a41_checkins where guest_id = p_guest and event_id = p_event;
  get diagnostics v_removed = row_count;
  return v_removed > 0;
end
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

-- Redeems a mission code. A few wrong tries per minute per guest, then the
-- guest has to wait, even for the right code, so a code cannot be guessed.
create function public.a41_hunt_claim(p_token text, p_code text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  max_wrong constant integer := 5;
  g public.a41_guests;
  m public.a41_hunt_missions;
  normalized text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  now_ts timestamptz := clock_timestamp();
  wrong integer;
  oldest timestamptz;
  stored integer;
  total integer;
begin
  select * into g from a41_private.guest_by_token(p_token);
  if not found then
    return null;
  end if;

  -- one guest's tries are handled one at a time, so a burst cannot beat the limit
  perform pg_advisory_xact_lock(hashtextextended(g.id::text, 41));

  delete from public.a41_hunt_attempts where guest_id = g.id and attempted_at < now_ts - interval '1 hour';
  select count(*) into wrong from public.a41_hunt_attempts
  where guest_id = g.id and attempted_at > now_ts - interval '1 minute';
  if wrong >= max_wrong then
    select a.attempted_at into oldest from public.a41_hunt_attempts a
    where a.guest_id = g.id and a.attempted_at > now_ts - interval '1 minute'
    order by a.attempted_at desc offset max_wrong - 1 limit 1;
    return jsonb_build_object(
      'status', 'rate_limited',
      'retryAfter', greatest(1, ceil(extract(epoch from (oldest + interval '1 minute' - now_ts)))::integer)
    );
  end if;

  select * into m from public.a41_hunt_missions mm
  where mm.event_id = g.event_id and mm.code = normalized and mm.active;
  if not found then
    insert into public.a41_hunt_attempts (guest_id) values (g.id);
    return jsonb_build_object('status', 'wrong_code', 'triesLeft', max_wrong - wrong - 1);
  end if;

  insert into public.a41_hunt_claims (mission_id, guest_id, event_id, points)
  values (m.id, g.id, g.event_id, m.points)
  on conflict do nothing;
  get diagnostics stored = row_count;

  select coalesce(sum(c.points), 0) into total from public.a41_hunt_claims c where c.guest_id = g.id;
  return jsonb_build_object(
    'status', case when stored = 1 then 'claimed' else 'already_claimed' end,
    'mission', m.title,
    'points', case when stored = 1 then m.points else 0 end,
    'total', total
  );
end
$$;

revoke execute on function public.a41_undo_check_in(uuid, uuid) from public, anon;
grant execute on function public.a41_undo_check_in(uuid, uuid) to authenticated;

revoke execute on function
  public.a41_request_photo_upload(text, text, boolean),
  public.a41_commit_photo(text, text),
  public.a41_hunt_claim(text, text)
from public;
grant execute on function
  public.a41_request_photo_upload(text, text, boolean),
  public.a41_commit_photo(text, text),
  public.a41_hunt_claim(text, text)
to anon, authenticated;

-- Scratch functions created while finding out why the connector timed out. They do nothing.
drop function if exists
  a41_private.zz_probe1(), a41_private.zz_probe2(), a41_private.zz_probe3(),
  a41_private.zz_probe4(), a41_private.zz_probe5();

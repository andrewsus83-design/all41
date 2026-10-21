-- Check-in, part 2 of 4: the functions the door uses, except undo (a41_delete_functions).
--
-- The Supabase connector used to apply migrations holds back any statement that deletes
-- rows until a person confirms it, so the work below was applied in parts, each under the
-- version in its file name. The functions that delete rows are in a41_delete_functions.

-- ---------------------------------------------------------------------------
-- Check-in: functions (signed-in members only, they run with the caller's rights
-- so row level security still decides what the caller may read and write)
-- ---------------------------------------------------------------------------

-- The card the door shows for one guest.
create function a41_private.checkin_card(p_event uuid, p_guest uuid, p_outcome text, p_checked_in_at timestamptz)
returns jsonb
language sql stable security invoker set search_path = ''
as $$
  select jsonb_build_object(
    'outcome', p_outcome,
    'checked_in_at', p_checked_in_at,
    'guest', jsonb_build_object(
      'id', g.id,
      'name', g.name,
      'table_no', g.table_no,
      'tags', g.tags,
      'party_size', r.party_size,
      'response', r.response
    )
  )
  from public.a41_guests g
  left join public.a41_rsvps r on r.guest_id = g.id
  where g.id = p_guest and g.event_id = p_event
$$;

-- Checks a guest in. The first check-in wins: a second one changes nothing and
-- reports when the first happened.
create function a41_private.check_in(p_event uuid, p_guest uuid) returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  v_at timestamptz;
  v_first boolean;
begin
  if not exists (select 1 from public.a41_guests g where g.id = p_guest and g.event_id = p_event) then
    return jsonb_build_object('outcome', 'unknown');
  end if;

  insert into public.a41_checkins (guest_id, event_id) values (p_guest, p_event)
  on conflict (guest_id) do nothing
  returning checked_in_at into v_at;
  v_first := found;

  if not v_first then
    select c.checked_in_at into v_at from public.a41_checkins c where c.guest_id = p_guest;
  end if;

  return a41_private.checkin_card(p_event, p_guest, case when v_first then 'checked_in' else 'already_checked_in' end, v_at);
end
$$;

-- Scan: resolves the pass (the token from the QR) among the guests the caller can
-- see. A pass from another of the caller's events is reported as such; a pass
-- the caller cannot see, or that does not exist, is simply unknown.
create function public.a41_check_in_by_token(p_event uuid, p_token text) returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  v_guest public.a41_guests;
begin
  if not a41_private.is_event_member(p_event) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_token is null or char_length(p_token) not between 8 and 200 then
    return jsonb_build_object('outcome', 'unknown');
  end if;

  select * into v_guest from public.a41_guests g where g.token = p_token;
  if not found then
    return jsonb_build_object('outcome', 'unknown');
  end if;

  if v_guest.event_id <> p_event then
    return jsonb_build_object(
      'outcome', 'other_event',
      'event_name', (select e.name from public.a41_events e where e.id = v_guest.event_id)
    );
  end if;

  return a41_private.check_in(p_event, v_guest.id);
end
$$;

-- Manual fallback: the guest was picked from a search.
create function public.a41_check_in_guest(p_event uuid, p_guest uuid) returns jsonb
language plpgsql security invoker set search_path = ''
as $$
begin
  if not a41_private.is_event_member(p_event) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return a41_private.check_in(p_event, p_guest);
end
$$;

-- Walk-in: an owner adds a guest at the door and checks them in, in one
-- transaction, so a full guest list leaves nothing half done. The guest list
-- rules (capacity, one email or phone per guest) apply as for any other guest.
create function public.a41_add_walk_in(
  p_event uuid,
  p_name text,
  p_phone text default null,
  p_email text default null,
  p_table_no text default null
) returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  v_guest uuid;
begin
  if not a41_private.is_event_owner(p_event) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  insert into public.a41_guests (event_id, name, phone, email, table_no, tags)
  values (
    p_event,
    btrim(p_name),
    nullif(btrim(p_phone), ''),
    nullif(lower(btrim(p_email)), ''),
    nullif(btrim(p_table_no), ''),
    array['walk-in']
  )
  returning id into v_guest;

  return a41_private.check_in(p_event, v_guest);
end
$$;

-- The live numbers and the latest check-ins, for the door screen and its polling.
create function public.a41_checkin_stats(p_event uuid, p_recent integer default 8) returns jsonb
language plpgsql stable security invoker set search_path = ''
as $$
begin
  if not a41_private.is_event_member(p_event) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'total_guests', (select count(*) from public.a41_guests g where g.event_id = p_event),
    'checked_in', (select count(*) from public.a41_checkins c where c.event_id = p_event),
    'attending', (select count(*) from public.a41_rsvps r where r.event_id = p_event and r.response = 'attending'),
    'attending_checked_in', (
      select count(*) from public.a41_rsvps r
      join public.a41_checkins c on c.guest_id = r.guest_id
      where r.event_id = p_event and r.response = 'attending'
    ),
    'recent', coalesce((
      select jsonb_agg(
        jsonb_build_object('guest_id', t.guest_id, 'name', t.name, 'table_no', t.table_no, 'checked_in_at', t.checked_in_at)
        order by t.checked_in_at desc, t.name
      )
      from (
        select c.guest_id, g.name, g.table_no, c.checked_in_at
        from public.a41_checkins c
        join public.a41_guests g on g.id = c.guest_id
        where c.event_id = p_event
        order by c.checked_in_at desc, g.name
        limit greatest(1, least(coalesce(p_recent, 8), 50))
      ) t
    ), '[]'::jsonb)
  );
end
$$;

-- Search for the manual fallback: every word of the query must appear in the
-- name, or the whole query in the email, or its digits in the phone number
-- (0812... finds +62812...). At most 20 guests, names that start with the query first.
create function public.a41_search_checkin_guests(p_event uuid, p_query text) returns jsonb
language plpgsql stable security invoker set search_path = ''
as $$
declare
  v_query text := lower(btrim(coalesce(p_query, '')));
  v_words text[] := array(select w from unnest(string_to_array(lower(btrim(coalesce(p_query, ''))), ' ')) w where w <> '');
  v_digits text := ltrim(regexp_replace(coalesce(p_query, ''), '\D', '', 'g'), '0');
begin
  if not a41_private.is_event_member(p_event) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if char_length(v_query) < 2 or char_length(v_query) > 100 then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'table_no', t.table_no,
        'tags', t.tags,
        'email', t.email,
        'phone', t.phone,
        'checked_in_at', t.checked_in_at,
        'party_size', t.party_size,
        'response', t.response
      )
      order by t.rank, t.name, t.id
    )
    from (
      select
        g.id, g.name, g.table_no, g.tags, g.email, g.phone, c.checked_in_at, r.party_size, r.response,
        case when strpos(lower(g.name), v_query) = 1 then 0 else 1 end as rank
      from public.a41_guests g
      left join public.a41_checkins c on c.guest_id = g.id
      left join public.a41_rsvps r on r.guest_id = g.id
      where g.event_id = p_event
        and (
          not exists (select 1 from unnest(v_words) w where strpos(lower(g.name), w) = 0)
          or strpos(lower(coalesce(g.email, '')), v_query) > 0
          or (char_length(v_digits) >= 3 and strpos(regexp_replace(coalesce(g.phone, ''), '\D', '', 'g'), v_digits) > 0)
        )
      order by case when strpos(lower(g.name), v_query) = 1 then 0 else 1 end, g.name, g.id
      limit 20
    ) t
  ), '[]'::jsonb);
end
$$;

-- ---------------------------------------------------------------------------
-- Who may call what. New functions in public are executable by anon on Supabase
-- by default, so anon is revoked by name; only signed-in members get through
-- (each function checks membership again).
-- ---------------------------------------------------------------------------

revoke execute on function
  a41_private.checkin_card(uuid, uuid, text, timestamptz),
  a41_private.check_in(uuid, uuid)
from public;

grant execute on function
  a41_private.checkin_card(uuid, uuid, text, timestamptz),
  a41_private.check_in(uuid, uuid)
to authenticated;

revoke execute on function
  public.a41_check_in_by_token(uuid, text),
  public.a41_check_in_guest(uuid, uuid),
  public.a41_add_walk_in(uuid, text, text, text, text),
  public.a41_checkin_stats(uuid, integer),
  public.a41_search_checkin_guests(uuid, text)
from public, anon;

grant execute on function
  public.a41_check_in_by_token(uuid, text),
  public.a41_check_in_guest(uuid, uuid),
  public.a41_add_walk_in(uuid, text, text, text, text),
  public.a41_checkin_stats(uuid, integer),
  public.a41_search_checkin_guests(uuid, text)
to authenticated;

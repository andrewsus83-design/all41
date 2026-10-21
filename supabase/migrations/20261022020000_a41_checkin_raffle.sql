-- Check-in and raffle (door prize).
--
-- Check-in: owners and staff scan guests in. a41_checkins and its insert policy
-- already exist; this adds what the door needs on top of them: a way to undo a
-- check-in (owners only), functions that resolve a pass as the signed-in member
-- in one round trip, a live count, and a search for the manual fallback.
--
-- Raffle: owners define prizes, owners and staff draw winners. The winner is
-- chosen in the database, at random, only among guests who have checked in and
-- have not been drawn before, one draw at a time per event. a41_raffle_draws is
-- the audit log: nobody can write to it except the two functions below.
--
-- Everything is prefixed a41_ and nothing unprefixed is touched.

-- ---------------------------------------------------------------------------
-- Check-in: undo
-- ---------------------------------------------------------------------------

-- The status the guest had before the check-in, so an undo can put it back.
alter table public.a41_checkins
  add column previous_status text check (previous_status in ('invited', 'sent', 'opened', 'rsvp'));

create index a41_checkins_event_time_idx on public.a41_checkins (event_id, checked_in_at desc);

create function a41_private.remember_guest_status() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  select nullif(g.status, 'checked_in') into new.previous_status
  from public.a41_guests g where g.id = new.guest_id;
  return new;
end
$$;

create trigger a41_checkins_remember_status before insert on public.a41_checkins
  for each row execute function a41_private.remember_guest_status();

-- A guest whose check-in is undone goes back to what they were: responded when
-- an RSVP exists (it may have been given after the check-in), else the old status.
create function a41_private.restore_guest_status() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.a41_guests g
  set status = case
    when exists (select 1 from public.a41_rsvps r where r.guest_id = g.id) then 'rsvp'
    else coalesce(old.previous_status, 'invited')
  end
  where g.id = old.guest_id and g.status = 'checked_in';
  return old;
end
$$;

create trigger a41_checkins_restore_guest after delete on public.a41_checkins
  for each row execute function a41_private.restore_guest_status();

-- A check-in is a record: nobody can edit or delete it straight from the table.
-- Owners take one back through a41_undo_check_in below; staff cannot.

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
-- Raffle: tables
-- ---------------------------------------------------------------------------

create table public.a41_raffle_prizes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.a41_events (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  -- how many winners this prize has (a voucher can go to ten people)
  quantity integer not null default 1 check (quantity between 1 and 500),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (id, event_id)
);

create index a41_raffle_prizes_event_idx on public.a41_raffle_prizes (event_id, sort_order, created_at);

-- The audit log of the raffle. One row per draw: who drew whom for which prize,
-- when, and whether the winner took it (won) or was not there (forfeited). The
-- name and table are copied so the log reads the same after a guest is removed.
create table public.a41_raffle_draws (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.a41_events (id) on delete cascade,
  -- no cascade: a prize that has been drawn cannot be deleted
  prize_id uuid not null,
  guest_id uuid references public.a41_guests (id) on delete set null,
  guest_name text not null,
  guest_table_no text,
  status text not null default 'won' check (status in ('won', 'forfeited')),
  drawn_at timestamptz not null default now(),
  drawn_by uuid references auth.users (id) on delete set null,
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null,
  foreign key (prize_id, event_id) references public.a41_raffle_prizes (id, event_id),
  check ((status = 'forfeited') = (resolved_at is not null))
);

-- A guest is drawn at most once per event, whether they took the prize or not.
create unique index a41_raffle_draws_event_guest_key on public.a41_raffle_draws (event_id, guest_id)
  where guest_id is not null;
create index a41_raffle_draws_prize_idx on public.a41_raffle_draws (prize_id, event_id);
create index a41_raffle_draws_event_time_idx on public.a41_raffle_draws (event_id, drawn_at desc);

create function a41_private.guard_raffle_prize() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if (select count(*) from public.a41_raffle_prizes p where p.event_id = new.event_id) >= 100 then
      raise exception 'raffle_prize_limit'
        using errcode = 'check_violation', detail = 'An event can have up to 100 prizes.';
    end if;
  elsif new.quantity < (
    select count(*) from public.a41_raffle_draws d where d.prize_id = new.id and d.status = 'won'
  ) then
    raise exception 'prize_quantity_below_awarded'
      using errcode = 'check_violation', detail = 'A prize cannot have fewer winners than it has already given out.';
  end if;
  return new;
end
$$;

create trigger a41_raffle_prizes_guard before insert or update of quantity on public.a41_raffle_prizes
  for each row execute function a41_private.guard_raffle_prize();

-- ---------------------------------------------------------------------------
-- Raffle: row level security and grants
-- ---------------------------------------------------------------------------

alter table public.a41_raffle_prizes enable row level security;
alter table public.a41_raffle_draws enable row level security;

revoke all on public.a41_raffle_prizes, public.a41_raffle_draws from anon, authenticated;

-- prizes: members read, owners manage
grant select on public.a41_raffle_prizes to authenticated;
grant insert (event_id, name, quantity, sort_order) on public.a41_raffle_prizes to authenticated;
grant update (name, quantity, sort_order) on public.a41_raffle_prizes to authenticated;
grant delete on public.a41_raffle_prizes to authenticated;
create policy raffle_prizes_select on public.a41_raffle_prizes for select to authenticated
  using ((select a41_private.is_event_member(event_id)));
create policy raffle_prizes_insert on public.a41_raffle_prizes for insert to authenticated
  with check ((select a41_private.is_event_owner(event_id)));
create policy raffle_prizes_update on public.a41_raffle_prizes for update to authenticated
  using ((select a41_private.is_event_owner(event_id)))
  with check ((select a41_private.is_event_owner(event_id)));
create policy raffle_prizes_delete on public.a41_raffle_prizes for delete to authenticated
  using ((select a41_private.is_event_owner(event_id)));

-- draws: members read. Nobody writes except the two functions below, which run
-- with the table owner's rights. The service role cannot write either, so the
-- log cannot be changed by a server that holds its key.
grant select on public.a41_raffle_draws to authenticated;
create policy raffle_draws_select on public.a41_raffle_draws for select to authenticated
  using ((select a41_private.is_event_member(event_id)));
revoke insert, update, delete, truncate on public.a41_raffle_draws from service_role;

-- ---------------------------------------------------------------------------
-- Raffle: functions
-- ---------------------------------------------------------------------------

-- Serializes the raffle of one event: two staff devices cannot draw at once.
create function a41_private.lock_raffle(p_event uuid) returns void
language sql security definer set search_path = ''
as $$
  select pg_advisory_xact_lock(hashtextextended('a41_raffle:' || p_event::text, 0))
$$;

-- Guests who may still win: checked in, never drawn before.
create function a41_private.raffle_pool(p_event uuid) returns setof public.a41_guests
language sql stable security definer set search_path = ''
as $$
  select g.*
  from public.a41_guests g
  join public.a41_checkins c on c.guest_id = g.id
  where g.event_id = p_event
    and not exists (select 1 from public.a41_raffle_draws d where d.guest_id = g.id)
$$;

-- One uniformly random guest from the pool. random() is the only source of
-- chance: nothing here looks at names, tables, tags or check-in order.
create function a41_private.pick_raffle_guest(p_event uuid) returns uuid
language sql volatile security definer set search_path = ''
as $$
  select p.id from a41_private.raffle_pool(p_event) p order by random() limit 1
$$;

-- A prize as the pages show it: how many winners it has given out so far.
create function a41_private.raffle_prize_json(p_prize uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'quantity', p.quantity,
    'awarded', (select count(*) from public.a41_raffle_draws d where d.prize_id = p.id and d.status = 'won')
  )
  from public.a41_raffle_prizes p where p.id = p_prize
$$;

-- Draws the next winner of a prize. Members only (owners and staff).
-- Returns the draw, the winner, the prize with its count, how many guests are
-- still in the pool, and up to 40 other names for the on-screen animation.
create function public.a41_draw_raffle_winner(p_prize uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_event uuid;
  v_prize public.a41_raffle_prizes;
  v_guest uuid;
  v_name text;
  v_table text;
  v_tags text[];
  v_draw public.a41_raffle_draws;
begin
  select p.event_id into v_event from public.a41_raffle_prizes p where p.id = p_prize;
  -- a prize of someone else's event is reported like one that does not exist
  if v_event is null or not a41_private.is_event_member(v_event) then
    raise exception 'prize_not_found';
  end if;

  perform a41_private.lock_raffle(v_event);

  select * into v_prize from public.a41_raffle_prizes p where p.id = p_prize;
  if not found then
    raise exception 'prize_not_found';
  end if;

  if (select count(*) from public.a41_raffle_draws d where d.prize_id = p_prize and d.status = 'won') >= v_prize.quantity then
    raise exception 'prize_fully_awarded';
  end if;

  v_guest := a41_private.pick_raffle_guest(v_event);
  if v_guest is null then
    raise exception 'no_eligible_guests';
  end if;

  select g.name, g.table_no, g.tags into v_name, v_table, v_tags from public.a41_guests g where g.id = v_guest;

  insert into public.a41_raffle_draws (event_id, prize_id, guest_id, guest_name, guest_table_no, drawn_by)
  values (v_event, p_prize, v_guest, v_name, v_table, auth.uid())
  returning * into v_draw;

  return jsonb_build_object(
    'draw', jsonb_build_object('id', v_draw.id, 'status', v_draw.status, 'drawn_at', v_draw.drawn_at),
    'guest', jsonb_build_object('name', v_name, 'table_no', v_table, 'tags', to_jsonb(v_tags)),
    'prize', a41_private.raffle_prize_json(p_prize),
    'remaining', (select count(*) from a41_private.raffle_pool(v_event)),
    'decoys', coalesce((
      select jsonb_agg(t.name)
      from (
        select p.name from a41_private.raffle_pool(v_event) p order by random() limit 40
      ) t
    ), '[]'::jsonb)
  );
end
$$;

-- The winner is not here: marks the draw forfeited so the prize can be drawn
-- again. The guest is not drawn again either. Only an open draw can be forfeited,
-- so a second tap or a second device gets an error and not a second redraw.
create function public.a41_forfeit_raffle_draw(p_draw uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_event uuid;
  v_draw public.a41_raffle_draws;
begin
  select d.event_id into v_event from public.a41_raffle_draws d where d.id = p_draw;
  if v_event is null or not a41_private.is_event_member(v_event) then
    raise exception 'draw_not_found';
  end if;

  perform a41_private.lock_raffle(v_event);

  select * into v_draw from public.a41_raffle_draws d where d.id = p_draw;
  if v_draw.status <> 'won' then
    raise exception 'draw_not_open';
  end if;

  update public.a41_raffle_draws
  set status = 'forfeited', resolved_at = now(), resolved_by = auth.uid()
  where id = p_draw;

  return jsonb_build_object(
    'draw_id', p_draw,
    'prize', a41_private.raffle_prize_json(v_draw.prize_id),
    'remaining', (select count(*) from a41_private.raffle_pool(v_event))
  );
end
$$;

-- Prizes with their counts and the size of the pool, for the raffle pages.
create function public.a41_raffle_summary(p_event uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not a41_private.is_event_member(p_event) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'checked_in', (select count(*) from public.a41_checkins c where c.event_id = p_event),
    'remaining', (select count(*) from a41_private.raffle_pool(p_event)),
    'prizes', coalesce((
      select jsonb_agg(a41_private.raffle_prize_json(p.id) || jsonb_build_object('sort_order', p.sort_order)
        order by p.sort_order, p.created_at, p.id)
      from public.a41_raffle_prizes p where p.event_id = p_event
    ), '[]'::jsonb)
  );
end
$$;

-- The audit log, newest first, with who drew and the prize name.
create function public.a41_raffle_log(p_event uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not a41_private.is_event_member(p_event) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', d.id,
        'status', d.status,
        'prize_id', d.prize_id,
        'prize_name', p.name,
        'guest_name', d.guest_name,
        'guest_table_no', d.guest_table_no,
        'drawn_at', d.drawn_at,
        'drawn_by_email', (select u.email from auth.users u where u.id = d.drawn_by),
        'resolved_at', d.resolved_at,
        'resolved_by_email', (select u.email from auth.users u where u.id = d.resolved_by)
      )
      order by d.drawn_at desc, d.id
    )
    from public.a41_raffle_draws d
    join public.a41_raffle_prizes p on p.id = d.prize_id
    where d.event_id = p_event
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
  a41_private.check_in(uuid, uuid),
  a41_private.lock_raffle(uuid),
  a41_private.raffle_pool(uuid),
  a41_private.pick_raffle_guest(uuid),
  a41_private.raffle_prize_json(uuid)
from public;

-- the functions that call these run with the caller's rights (check-in) or the
-- owner's (raffle), so only the check-in helpers need a grant
grant execute on function
  a41_private.checkin_card(uuid, uuid, text, timestamptz),
  a41_private.check_in(uuid, uuid)
to authenticated;

revoke execute on function
  public.a41_check_in_by_token(uuid, text),
  public.a41_check_in_guest(uuid, uuid),
  public.a41_undo_check_in(uuid, uuid),
  public.a41_add_walk_in(uuid, text, text, text, text),
  public.a41_checkin_stats(uuid, integer),
  public.a41_search_checkin_guests(uuid, text),
  public.a41_draw_raffle_winner(uuid),
  public.a41_forfeit_raffle_draw(uuid),
  public.a41_raffle_summary(uuid),
  public.a41_raffle_log(uuid)
from public, anon;

grant execute on function
  public.a41_check_in_by_token(uuid, text),
  public.a41_check_in_guest(uuid, uuid),
  public.a41_undo_check_in(uuid, uuid),
  public.a41_add_walk_in(uuid, text, text, text, text),
  public.a41_checkin_stats(uuid, integer),
  public.a41_search_checkin_guests(uuid, text),
  public.a41_draw_raffle_winner(uuid),
  public.a41_forfeit_raffle_draw(uuid),
  public.a41_raffle_summary(uuid),
  public.a41_raffle_log(uuid)
to authenticated;

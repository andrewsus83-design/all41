-- Raffle, part 4 of 4: drawing winners, the log and the summary.
--
-- The Supabase connector used to apply migrations holds back any statement that deletes
-- rows until a person confirms it, so the work below was applied in parts, each under the
-- version in its file name. The functions that delete rows are in a41_delete_functions.

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
-- Who may call what (see a41_checkin_functions)
-- ---------------------------------------------------------------------------

revoke execute on function
  a41_private.lock_raffle(uuid),
  a41_private.raffle_pool(uuid),
  a41_private.pick_raffle_guest(uuid),
  a41_private.raffle_prize_json(uuid)
from public;

revoke execute on function
  public.a41_draw_raffle_winner(uuid),
  public.a41_forfeit_raffle_draw(uuid),
  public.a41_raffle_summary(uuid),
  public.a41_raffle_log(uuid)
from public, anon;

grant execute on function
  public.a41_draw_raffle_winner(uuid),
  public.a41_forfeit_raffle_draw(uuid),
  public.a41_raffle_summary(uuid),
  public.a41_raffle_log(uuid)
to authenticated;

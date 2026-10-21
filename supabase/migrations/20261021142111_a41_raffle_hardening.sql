-- Raffle hardening: a draw locks its prize.
--
-- Found in review. a41_draw_raffle_winner read the prize without a lock, so an owner
-- lowering its quantity in the same instant as a draw could leave a prize with more
-- winners than its quantity. The prize row is now locked while the count is checked.
-- Only this one function changes; its grants stay as they are.

-- Draws the next winner of a prize. Members only (owners and staff).
-- Returns the draw, the winner, the prize with its count, how many guests are
-- still in the pool, and up to 40 other names for the on-screen animation.
create or replace function public.a41_draw_raffle_winner(p_prize uuid) returns jsonb
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

  -- Lock the prize while its count is checked, so an owner who lowers the quantity
  -- at the same moment waits for the draw (and is then refused if it would go below
  -- the winners), or the draw waits and sees the new quantity.
  select * into v_prize from public.a41_raffle_prizes p where p.id = p_prize for no key update;
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

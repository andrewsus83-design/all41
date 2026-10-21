-- Check-in, part 1 of 4: undo support. (See a41_checkin_functions, a41_raffle_tables
-- and a41_raffle_functions for the rest, and a41_delete_functions for the undo itself.)
--
-- The Supabase connector used to apply migrations holds back any statement that deletes
-- rows until a person confirms it, so the work below was applied in parts, each under the
-- version in its file name. The functions that delete rows are in a41_delete_functions.

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

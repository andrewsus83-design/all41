-- Guests are not signed in. They act through the unguessable token in their
-- invitation link (a41_guests.token), and only while the event is published.
-- Public functions (a41_* in schema public, callable by anon) resolve the token
-- with this helper, so every guest-facing feature checks the same two things.

create function a41_private.guest_by_token(p_token text) returns setof public.a41_guests
language sql stable security definer set search_path = ''
as $$
  select g.*
  from public.a41_guests g
  join public.a41_events e on e.id = g.event_id
  where g.token = p_token and e.status = 'published'
$$;

revoke execute on function a41_private.guest_by_token(text) from public;

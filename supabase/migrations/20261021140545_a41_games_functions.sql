-- Games, part 2 of 2: the building blocks, the host and guest functions, except
-- a41_hunt_claim, which clears old wrong tries (a41_delete_functions).
--
-- The Supabase connector used to apply migrations holds back any statement that deletes
-- rows until a person confirms it, so the work below was applied in parts, each under the
-- version in its file name. The functions that delete rows are in a41_delete_functions.

-- ---------------------------------------------------------------------------
-- Private building blocks
-- ---------------------------------------------------------------------------

create function a41_private.game_key(p_event uuid) returns text
language plpgsql security definer set search_path = ''
as $$
declare
  key text;
begin
  insert into public.a41_game_keys (event_id) values (p_event) on conflict do nothing;
  select k.play_key into key from public.a41_game_keys k where k.event_id = p_event;
  return key;
end
$$;

-- The shared state of the quiz of one event: everything a phone or the big
-- screen may know. The correct answer and the answer counts appear only once a
-- question is revealed, and a standing only counts revealed questions.
create function a41_private.quiz_state(p_event uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  s public.a41_quiz_sessions;
  q public.a41_quiz_questions;
  quiz_title text;
  player_count integer;
  answered_count integer;
  question jsonb;
  reveal jsonb;
  board jsonb;
begin
  select * into s from public.a41_quiz_sessions where event_id = p_event order by created_at desc limit 1;
  if not found then
    return jsonb_build_object('session', null);
  end if;

  select title into quiz_title from public.a41_quizzes where id = s.quiz_id;
  select count(*) into player_count from public.a41_quiz_players where session_id = s.id;

  if s.phase in ('question', 'reveal') then
    select * into q from public.a41_quiz_questions where quiz_id = s.quiz_id and position = s.current_position;
    question := jsonb_build_object(
      'prompt', q.prompt,
      'options', to_jsonb(q.options),
      'timeLimit', q.time_limit_seconds,
      'basePoints', q.base_points,
      'openedAt', (extract(epoch from s.question_opened_at) * 1000)::bigint,
      'closesAt', (extract(epoch from s.question_closes_at) * 1000)::bigint
    );
    select count(*) into answered_count from public.a41_quiz_answers where session_id = s.id and question_id = q.id;
  end if;

  if s.phase = 'reveal' then
    reveal := jsonb_build_object(
      'correctIndex', q.correct_index,
      'counts', (
        select jsonb_agg(coalesce(c.n, 0) order by i.i)
        from generate_series(0, cardinality(q.options) - 1) as i (i)
        left join (
          select a.choice, count(*) as n from public.a41_quiz_answers a
          where a.session_id = s.id and a.question_id = q.id group by a.choice
        ) c on c.choice = i.i
      )
    );
  end if;

  if s.phase in ('reveal', 'finished') then
    select coalesce(jsonb_agg(
      jsonb_build_object('id', r.id, 'rank', r.rank, 'name', r.name, 'score', r.score, 'correct', r.correct_count)
      order by r.ord
    ), '[]'::jsonb) into board
    from (
      select
        a41_private.standing_id(p.guest_id) as id,
        a41_private.display_name(g.name) as name,
        p.score,
        p.correct_count,
        rank() over (order by p.score desc) as rank,
        row_number() over (order by p.score desc, p.total_time_ms, g.name, p.guest_id) as ord
      from public.a41_quiz_players p
      join public.a41_guests g on g.id = p.guest_id
      where p.session_id = s.id
      order by ord
      limit 10
    ) r;
  end if;

  return jsonb_build_object('session', jsonb_build_object(
    'id', s.id,
    'rev', s.rev,
    'phase', s.phase,
    'quizTitle', quiz_title,
    'questionCount', s.question_count,
    'position', s.current_position,
    'players', player_count,
    'answered', answered_count,
    'question', question,
    'reveal', reveal,
    'leaderboard', board
  ));
end
$$;

-- What one guest knows about their own game: whether they joined, what they
-- answered, their score and rank. A result shows up only after the reveal.
create function a41_private.quiz_me(p_guest public.a41_guests) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  s public.a41_quiz_sessions;
  player public.a41_quiz_players;
  answer public.a41_quiz_answers;
  player_count integer;
  my_rank integer;
  mine jsonb;
begin
  select * into s from public.a41_quiz_sessions where event_id = p_guest.event_id order by created_at desc limit 1;
  if not found then
    return jsonb_build_object('id', a41_private.standing_id(p_guest.id), 'name', a41_private.display_name(p_guest.name), 'session', null);
  end if;

  select * into player from public.a41_quiz_players where session_id = s.id and guest_id = p_guest.id;
  select count(*) into player_count from public.a41_quiz_players where session_id = s.id;

  if player.guest_id is not null then
    select count(*) + 1 into my_rank from public.a41_quiz_players where session_id = s.id and score > player.score;
  end if;

  if s.phase in ('question', 'reveal') then
    select a.* into answer
    from public.a41_quiz_answers a
    join public.a41_quiz_questions q on q.id = a.question_id
    where a.session_id = s.id and a.guest_id = p_guest.id and q.quiz_id = s.quiz_id and q.position = s.current_position;
    if answer.guest_id is not null then
      mine := jsonb_build_object('position', s.current_position, 'choice', answer.choice);
      if s.phase = 'reveal' then
        mine := mine || jsonb_build_object('correct', answer.is_correct, 'points', answer.points, 'elapsedMs', answer.elapsed_ms);
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'id', a41_private.standing_id(p_guest.id),
    'name', a41_private.display_name(p_guest.name),
    'session', jsonb_build_object('id', s.id, 'rev', s.rev, 'phase', s.phase, 'position', s.current_position),
    'joined', player.guest_id is not null,
    'score', coalesce(player.score, 0),
    'correct', coalesce(player.correct_count, 0),
    'rank', my_rank,
    'players', player_count,
    'answer', mine
  );
end
$$;

-- The hunt standing of an event: points per guest, ties share a rank, and the
-- guest who got there first is listed first.
create function a41_private.hunt_leaderboard(p_event uuid, p_limit integer, p_full_names boolean default false)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object('id', r.id, 'rank', r.rank, 'name', r.name, 'score', r.score, 'missions', r.missions)
    order by r.ord
  ), '[]'::jsonb)
  from (
    select
      a41_private.standing_id(t.guest_id) as id,
      case when p_full_names then g.name else a41_private.display_name(g.name) end as name,
      t.score,
      t.missions,
      rank() over (order by t.score desc) as rank,
      row_number() over (order by t.score desc, t.last_claim, g.name, t.guest_id) as ord
    from (
      select c.guest_id, sum(c.points)::integer as score, count(*)::integer as missions, max(c.claimed_at) as last_claim
      from public.a41_hunt_claims c
      where c.event_id = p_event
      group by c.guest_id
    ) t
    join public.a41_guests g on g.id = t.guest_id
    order by ord
    limit p_limit
  ) r
$$;

revoke execute on function
  a41_private.game_key(uuid),
  a41_private.quiz_state(uuid),
  a41_private.quiz_me(public.a41_guests),
  a41_private.hunt_leaderboard(uuid, integer, boolean),
  a41_private.quiz_points(integer, integer, integer),
  a41_private.display_name(text),
  a41_private.standing_id(uuid)
from public;

-- ---------------------------------------------------------------------------
-- Host functions (signed in; owners and staff)
-- ---------------------------------------------------------------------------

-- The play key of an event, for the join link and the big screen.
create function public.a41_game_key(p_event uuid) returns text
language plpgsql security definer set search_path = ''
as $$
begin
  if not a41_private.is_event_member(p_event) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return a41_private.game_key(p_event);
end
$$;

-- The same state the phones get, read straight from the database for the host
-- screen, which works on events that are not published yet.
create function public.a41_quiz_host_state(p_event uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  if not a41_private.is_event_member(p_event) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return a41_private.quiz_state(p_event);
end
$$;

-- The hunt as the team sees it: every mission with its code and how many guests
-- found it, and the leaderboard with full names.
create function public.a41_hunt_host_board(p_event uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  if not a41_private.is_event_member(p_event) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'missions', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id', m.id, 'title', m.title, 'hint', m.hint, 'points', m.points, 'code', m.code,
          'active', m.active, 'found', (select count(*) from public.a41_hunt_claims c where c.mission_id = m.id)
        ) order by m.position, m.created_at
      ), '[]'::jsonb)
      from public.a41_hunt_missions m where m.event_id = p_event
    ),
    'players', (select count(distinct c.guest_id) from public.a41_hunt_claims c where c.event_id = p_event),
    'leaderboard', a41_private.hunt_leaderboard(p_event, 20, true)
  );
end
$$;

-- Opens the lobby of a live session for a quiz.
create function public.a41_quiz_open_lobby(p_quiz uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  quiz public.a41_quizzes;
  questions integer;
begin
  select * into quiz from public.a41_quizzes where id = p_quiz;
  if not found or not a41_private.is_event_member(quiz.event_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select count(*) into questions from public.a41_quiz_questions where quiz_id = quiz.id;
  if questions = 0 then
    raise exception 'quiz_has_no_questions' using errcode = 'check_violation', detail = 'Add at least one question first.';
  end if;

  begin
    insert into public.a41_quiz_sessions (event_id, quiz_id, question_count) values (quiz.event_id, quiz.id, questions);
  exception when unique_violation then
    raise exception 'session_already_live' using errcode = 'check_violation', detail = 'This event already has a live quiz.';
  end;

  return a41_private.quiz_state(quiz.event_id);
end
$$;

-- The host's controls. One function, so every move goes through the same rules:
--   start   lobby    -> question 1
--   reveal  question -> reveal      (scores the question; repeating it is harmless)
--   next    reveal   -> next question, or finished after the last
--   end     any live phase -> finished
-- p_position is the question the host's screen shows. A request that arrives
-- late (an auto-reveal after the host already moved on) is refused as stale
-- instead of acting on the wrong question.
create function public.a41_quiz_control(p_session uuid, p_action text, p_position integer default null)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  s public.a41_quiz_sessions;
  q public.a41_quiz_questions;
  t timestamptz := clock_timestamp();
  target integer;
begin
  select * into s from public.a41_quiz_sessions where id = p_session for update;
  if not found or not a41_private.is_event_member(s.event_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_action = 'start' then
    if s.phase <> 'lobby' then
      raise exception 'invalid_transition' using errcode = 'check_violation', detail = 'The quiz has already started.';
    end if;
    target := 1;

  elsif p_action = 'reveal' then
    if p_position is not null and p_position is distinct from s.current_position then
      raise exception 'stale_question' using errcode = 'check_violation', detail = 'The quiz has moved on.';
    end if;
    if s.phase = 'reveal' then
      return a41_private.quiz_state(s.event_id);
    end if;
    if s.phase <> 'question' then
      raise exception 'invalid_transition' using errcode = 'check_violation', detail = 'There is no open question to reveal.';
    end if;

    select * into q from public.a41_quiz_questions where quiz_id = s.quiz_id and position = s.current_position;
    update public.a41_quiz_players p
    set score = p.score + a.points,
        correct_count = p.correct_count + (case when a.is_correct then 1 else 0 end),
        total_time_ms = p.total_time_ms + (case when a.is_correct then a.elapsed_ms else 0 end)
    from public.a41_quiz_answers a
    where p.session_id = s.id and a.session_id = s.id and a.question_id = q.id and a.guest_id = p.guest_id;
    update public.a41_quiz_sessions set phase = 'reveal', rev = rev + 1 where id = s.id;
    return a41_private.quiz_state(s.event_id);

  elsif p_action = 'next' then
    if p_position is not null and p_position is distinct from s.current_position then
      raise exception 'stale_question' using errcode = 'check_violation', detail = 'The quiz has moved on.';
    end if;
    if s.phase <> 'reveal' then
      raise exception 'invalid_transition' using errcode = 'check_violation', detail = 'Reveal the answer before moving on.';
    end if;
    if s.current_position >= s.question_count then
      update public.a41_quiz_sessions set phase = 'finished', finished_at = t, rev = rev + 1 where id = s.id;
      return a41_private.quiz_state(s.event_id);
    end if;
    target := s.current_position + 1;

  elsif p_action = 'end' then
    if s.phase = 'finished' then
      return a41_private.quiz_state(s.event_id);
    end if;
    update public.a41_quiz_sessions set phase = 'finished', finished_at = t, rev = rev + 1 where id = s.id;
    return a41_private.quiz_state(s.event_id);

  else
    raise exception 'invalid_transition' using errcode = 'check_violation', detail = 'Unknown action.';
  end if;

  -- start and next both open question number `target`
  select * into q from public.a41_quiz_questions where quiz_id = s.quiz_id and position = target;
  if not found then
    -- a question was removed behind our back; do not leave the session stuck
    raise exception 'invalid_transition' using errcode = 'check_violation', detail = 'That question no longer exists.';
  end if;
  update public.a41_quiz_sessions
  set phase = 'question',
      current_position = target,
      question_opened_at = t,
      question_closes_at = t + make_interval(secs => q.time_limit_seconds),
      rev = rev + 1
  where id = s.id;
  return a41_private.quiz_state(s.event_id);
end
$$;

-- Swaps a question with its neighbour (direction -1 up, +1 down). Runs as the
-- caller, so row level security decides who may reorder.
create function public.a41_quiz_move_question(p_question uuid, p_direction integer) returns void
language plpgsql set search_path = ''
as $$
declare
  q public.a41_quiz_questions;
  neighbour public.a41_quiz_questions;
  changed integer;
begin
  if p_direction not in (-1, 1) then
    raise exception 'invalid_direction' using errcode = 'check_violation';
  end if;
  select * into q from public.a41_quiz_questions where id = p_question;
  if not found then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into neighbour from public.a41_quiz_questions
  where quiz_id = q.quiz_id and position = q.position + p_direction;
  if not found then
    return;
  end if;

  update public.a41_quiz_questions
  set position = case id when q.id then neighbour.position else q.position end
  where id in (q.id, neighbour.id);
  get diagnostics changed = row_count;
  if changed <> 2 then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Guest functions (anon; the invitation token or the play key is the key)
-- ---------------------------------------------------------------------------

-- Who is this guest and which game address do they use. Null for an unknown
-- token and for a token of an event that is not published, the same answer.
create function public.a41_game_guest(p_token text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  g public.a41_guests;
  e public.a41_events;
begin
  select * into g from a41_private.guest_by_token(p_token);
  if not found then
    return null;
  end if;
  select * into e from public.a41_events where id = g.event_id;
  return jsonb_build_object(
    'name', g.name,
    'tableNo', g.table_no,
    'eventName', e.name,
    'eventSlug', e.slug,
    'theme', e.theme,
    'playKey', a41_private.game_key(g.event_id)
  );
end
$$;

-- The shared state of an event's quiz, by play key. Contains nothing a guest
-- could use to cheat: no correct option before the reveal, no answer data.
create function public.a41_quiz_public_state(p_key text) returns jsonb
language sql security definer set search_path = ''
as $$
  select a41_private.quiz_state(k.event_id)
  from public.a41_game_keys k
  join public.a41_events e on e.id = k.event_id
  where k.play_key = p_key and e.status = 'published'
$$;

create function public.a41_quiz_me(p_token text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  g public.a41_guests;
begin
  select * into g from a41_private.guest_by_token(p_token);
  if not found then
    return null;
  end if;
  return a41_private.quiz_me(g);
end
$$;

-- Joins the live session of the guest's event (a no-op when there is none, or
-- when the guest already joined), then answers like a41_quiz_me.
create function public.a41_quiz_join(p_token text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  g public.a41_guests;
  s public.a41_quiz_sessions;
begin
  select * into g from a41_private.guest_by_token(p_token);
  if not found then
    return null;
  end if;
  select * into s from public.a41_quiz_sessions where event_id = g.event_id and phase <> 'finished';
  if found then
    insert into public.a41_quiz_players (session_id, guest_id, event_id) values (s.id, g.id, g.event_id)
    on conflict do nothing;
  end if;
  return a41_private.quiz_me(g);
end
$$;

-- A guest's answer to the open question. The database decides, from its own
-- clock, whether it is in time and how many points it earns. The reply never
-- says whether the answer was right; that comes with the reveal.
create function public.a41_quiz_answer(p_token text, p_position integer, p_choice integer) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  g public.a41_guests;
  s public.a41_quiz_sessions;
  q public.a41_quiz_questions;
  t timestamptz := clock_timestamp();
  elapsed integer;
  right_answer boolean;
  earned integer;
  stored integer;
  earlier smallint;
begin
  select * into g from a41_private.guest_by_token(p_token);
  if not found then
    return null;
  end if;

  -- A share lock on the session: the host's reveal waits for answers already in
  -- flight, so no answer can slip in after the question was scored.
  select * into s from public.a41_quiz_sessions where event_id = g.event_id and phase <> 'finished' for share;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_session');
  end if;
  if s.phase <> 'question' or s.current_position is distinct from p_position then
    return jsonb_build_object('ok', false, 'reason', 'closed');
  end if;
  if t >= s.question_closes_at then
    return jsonb_build_object('ok', false, 'reason', 'late');
  end if;

  select * into q from public.a41_quiz_questions where quiz_id = s.quiz_id and position = s.current_position;
  if p_choice is null or p_choice < 0 or p_choice >= cardinality(q.options) then
    return jsonb_build_object('ok', false, 'reason', 'invalid_choice');
  end if;

  elapsed := greatest(0, round(extract(epoch from (t - s.question_opened_at)) * 1000))::integer;
  right_answer := p_choice = q.correct_index;
  earned := case when right_answer then a41_private.quiz_points(q.base_points, elapsed, q.time_limit_seconds) else 0 end;

  insert into public.a41_quiz_players (session_id, guest_id, event_id) values (s.id, g.id, g.event_id)
  on conflict do nothing;
  insert into public.a41_quiz_answers (session_id, question_id, guest_id, event_id, choice, answered_at, elapsed_ms, is_correct, points)
  values (s.id, q.id, g.id, g.event_id, p_choice, t, elapsed, right_answer, earned)
  on conflict do nothing;
  get diagnostics stored = row_count;

  if stored = 0 then
    select a.choice into earlier from public.a41_quiz_answers a
    where a.session_id = s.id and a.question_id = q.id and a.guest_id = g.id;
    return jsonb_build_object('ok', false, 'reason', 'already_answered', 'choice', earlier);
  end if;
  return jsonb_build_object('ok', true, 'choice', p_choice);
end
$$;

-- The hunt as one guest sees it: active missions without their codes, which
-- are done, their own total and rank, and the top of the leaderboard.
create function public.a41_hunt_board(p_token text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  g public.a41_guests;
  total integer;
  claimed integer;
  better integer;
begin
  select * into g from a41_private.guest_by_token(p_token);
  if not found then
    return null;
  end if;

  select coalesce(sum(c.points), 0), count(*) into total, claimed from public.a41_hunt_claims c where c.guest_id = g.id;
  select count(*) into better from (
    select c.guest_id from public.a41_hunt_claims c where c.event_id = g.event_id
    group by c.guest_id having sum(c.points) > total
  ) b;

  return jsonb_build_object(
    'id', a41_private.standing_id(g.id),
    'name', a41_private.display_name(g.name),
    'total', total,
    'claimed', claimed,
    'rank', case when claimed > 0 then better + 1 else null end,
    'missions', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id', m.id, 'title', m.title, 'hint', m.hint, 'points', m.points,
          'done', c.guest_id is not null
        ) order by m.position, m.created_at
      ), '[]'::jsonb)
      from public.a41_hunt_missions m
      left join public.a41_hunt_claims c on c.mission_id = m.id and c.guest_id = g.id
      where m.event_id = g.event_id and m.active
    ),
    'leaderboard', a41_private.hunt_leaderboard(g.event_id, 10)
  );
end
$$;

-- The hunt leaderboard by play key, shared by every phone and cached by the app.
create function public.a41_hunt_public_leaderboard(p_key text) returns jsonb
language sql security definer set search_path = ''
as $$
  select jsonb_build_object(
    'missions', (select count(*) from public.a41_hunt_missions m where m.event_id = k.event_id and m.active),
    'leaderboard', a41_private.hunt_leaderboard(k.event_id, 10)
  )
  from public.a41_game_keys k
  join public.a41_events e on e.id = k.event_id
  where k.play_key = p_key and e.status = 'published'
$$;

-- ---------------------------------------------------------------------------
-- Who may call what
-- ---------------------------------------------------------------------------
-- Supabase grants every new function in public to anon and authenticated, so
-- the host functions take anon's access away explicitly.

revoke execute on function
  public.a41_game_key(uuid),
  public.a41_quiz_host_state(uuid),
  public.a41_hunt_host_board(uuid),
  public.a41_quiz_open_lobby(uuid),
  public.a41_quiz_control(uuid, text, integer),
  public.a41_quiz_move_question(uuid, integer)
from public, anon;

grant execute on function
  public.a41_game_key(uuid),
  public.a41_quiz_host_state(uuid),
  public.a41_hunt_host_board(uuid),
  public.a41_quiz_open_lobby(uuid),
  public.a41_quiz_control(uuid, text, integer),
  public.a41_quiz_move_question(uuid, integer)
to authenticated;

revoke execute on function
  public.a41_game_guest(text),
  public.a41_quiz_public_state(text),
  public.a41_quiz_me(text),
  public.a41_quiz_join(text),
  public.a41_quiz_answer(text, integer, integer),
  public.a41_hunt_board(text),
  public.a41_hunt_public_leaderboard(text)
from public;

grant execute on function
  public.a41_game_guest(text),
  public.a41_quiz_public_state(text),
  public.a41_quiz_me(text),
  public.a41_quiz_join(text),
  public.a41_quiz_answer(text, integer, integer),
  public.a41_hunt_board(text),
  public.a41_hunt_public_leaderboard(text)
to anon, authenticated;

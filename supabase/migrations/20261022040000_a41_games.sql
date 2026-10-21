-- Games: a live quiz (host screen plus phones) and a QR scavenger hunt.
--
-- Guests are not signed in. They act through the token of their invitation link
-- (a41_guests.token), exactly like the other guest features: every public
-- function below resolves it with a41_private.guest_by_token, so only guests of
-- a published event get an answer, and an unknown token looks like a draft one
-- (null). The host (owner or staff) acts through ordinary signed-in calls.
--
-- Nothing here is readable or writable by anon on the tables. Guests go
-- through functions; members read through row level security; the live quiz
-- only changes through a41_quiz_open_lobby and a41_quiz_control.
--
-- Scale: a quiz can have 500 phones. Phones read the event-level state of the
-- quiz (phase, question, timings, never an answer) through one function keyed
-- by the event's play key, which the app caches for a second; only their own
-- writes and own results reach the database one by one.

-- ---------------------------------------------------------------------------
-- Play key: the unguessable address of an event's game state
-- ---------------------------------------------------------------------------
-- The event page is public, so its slug cannot protect the questions of a live
-- quiz. Guests get the play key from a token-gated call; the host reads it as a
-- member. It is created the first time somebody asks.

create table public.a41_game_keys (
  event_id uuid primary key references public.a41_events (id) on delete cascade,
  play_key text not null unique default replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Quiz: questions
-- ---------------------------------------------------------------------------

create table public.a41_quizzes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.a41_events (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, event_id)
);

create index a41_quizzes_event_id_idx on public.a41_quizzes (event_id);

create table public.a41_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null,
  -- set from the quiz by a trigger, so a client never names it
  event_id uuid not null,
  position integer not null check (position between 1 and 100),
  prompt text not null check (char_length(prompt) between 1 and 300),
  -- 2 to 4 answers; correct_index is the one right one (0-based)
  options text[] not null check (array_ndims(options) = 1 and cardinality(options) between 2 and 4),
  correct_index smallint not null,
  time_limit_seconds smallint not null default 20 check (time_limit_seconds between 10 and 60),
  base_points integer not null default 1000 check (base_points between 100 and 10000),
  created_at timestamptz not null default now(),
  foreign key (quiz_id, event_id) references public.a41_quizzes (id, event_id) on delete cascade,
  -- deferred so that two questions can swap places inside one statement
  constraint a41_quiz_questions_position_key unique (quiz_id, position) deferrable initially deferred,
  check (correct_index >= 0 and correct_index < cardinality(options)),
  unique (id, quiz_id)
);

-- ---------------------------------------------------------------------------
-- Quiz: live sessions
-- ---------------------------------------------------------------------------
-- lobby -> question -> reveal -> question -> ... -> reveal -> finished
-- 'end' jumps to finished from anywhere. The server clock decides when a
-- question opened (question_opened_at) and closes (question_closes_at).

create table public.a41_quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  quiz_id uuid not null,
  phase text not null default 'lobby' check (phase in ('lobby', 'question', 'reveal', 'finished')),
  -- the number of questions when the session opened; a played quiz is frozen
  question_count integer not null check (question_count > 0),
  -- 1-based position of the current question, null in the lobby
  current_position integer,
  question_opened_at timestamptz,
  question_closes_at timestamptz,
  -- counts every change, so clients can ignore an older copy of the state
  rev integer not null default 1,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  foreign key (quiz_id, event_id) references public.a41_quizzes (id, event_id) on delete cascade,
  unique (id, event_id),
  check (
    (phase = 'lobby' and current_position is null and question_opened_at is null and question_closes_at is null)
    or (
      phase in ('question', 'reveal')
      and current_position between 1 and question_count
      and question_opened_at is not null
      and question_closes_at > question_opened_at
    )
    or (phase = 'finished' and finished_at is not null)
  )
);

-- one live (not finished) session per event
create unique index a41_quiz_sessions_live_key on public.a41_quiz_sessions (event_id) where phase <> 'finished';
create index a41_quiz_sessions_event_idx on public.a41_quiz_sessions (event_id, created_at desc);
create index a41_quiz_sessions_quiz_id_idx on public.a41_quiz_sessions (quiz_id);

-- Who joined a session, with their score. The score only moves when a question
-- is revealed, so a standing never gives away an answer that is still open.
create table public.a41_quiz_players (
  session_id uuid not null,
  guest_id uuid not null,
  event_id uuid not null,
  score integer not null default 0 check (score >= 0),
  correct_count smallint not null default 0 check (correct_count >= 0),
  -- time taken by the correct answers, the tie-break within equal scores
  total_time_ms bigint not null default 0 check (total_time_ms >= 0),
  joined_at timestamptz not null default now(),
  primary key (session_id, guest_id),
  foreign key (session_id, event_id) references public.a41_quiz_sessions (id, event_id) on delete cascade,
  foreign key (guest_id, event_id) references public.a41_guests (id, event_id) on delete cascade
);

create index a41_quiz_players_standing_idx on public.a41_quiz_players (session_id, score desc, total_time_ms);
create index a41_quiz_players_guest_idx on public.a41_quiz_players (guest_id);

-- One answer per guest per question. Correctness and points are decided by the
-- database at the moment the answer arrives, from the server clock.
create table public.a41_quiz_answers (
  session_id uuid not null,
  question_id uuid not null references public.a41_quiz_questions (id) on delete cascade,
  guest_id uuid not null,
  event_id uuid not null,
  choice smallint not null check (choice between 0 and 3),
  answered_at timestamptz not null,
  elapsed_ms integer not null check (elapsed_ms >= 0),
  is_correct boolean not null,
  points integer not null check (points >= 0),
  primary key (session_id, question_id, guest_id),
  foreign key (session_id, event_id) references public.a41_quiz_sessions (id, event_id) on delete cascade,
  foreign key (guest_id, event_id) references public.a41_guests (id, event_id) on delete cascade
);

create index a41_quiz_answers_guest_idx on public.a41_quiz_answers (guest_id);

-- ---------------------------------------------------------------------------
-- Scavenger hunt
-- ---------------------------------------------------------------------------

create table public.a41_hunt_missions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.a41_events (id) on delete cascade,
  position integer not null check (position between 1 and 100),
  title text not null check (char_length(title) between 1 and 80),
  hint text check (char_length(hint) <= 200),
  points integer not null default 100 check (points between 1 and 1000),
  -- the secret on the printed QR; the guest never reads it from the database
  code text not null default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
    check (code ~ '^[A-Z0-9]{6,24}$'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, event_id),
  constraint a41_hunt_missions_event_code_key unique (event_id, code)
);

create index a41_hunt_missions_event_idx on public.a41_hunt_missions (event_id, position);

create table public.a41_hunt_claims (
  mission_id uuid not null,
  guest_id uuid not null,
  event_id uuid not null,
  -- the mission's points when it was claimed, so editing a mission later changes nothing
  points integer not null check (points > 0),
  claimed_at timestamptz not null default now(),
  primary key (mission_id, guest_id),
  foreign key (mission_id, event_id) references public.a41_hunt_missions (id, event_id) on delete cascade,
  foreign key (guest_id, event_id) references public.a41_guests (id, event_id) on delete cascade
);

create index a41_hunt_claims_standing_idx on public.a41_hunt_claims (event_id, guest_id);

-- Wrong codes, to rate-limit guessing. Right codes are not recorded here.
create table public.a41_hunt_attempts (
  id bigint generated always as identity primary key,
  guest_id uuid not null references public.a41_guests (id) on delete cascade,
  attempted_at timestamptz not null default clock_timestamp()
);

create index a41_hunt_attempts_guest_idx on public.a41_hunt_attempts (guest_id, attempted_at desc);

-- ---------------------------------------------------------------------------
-- Pure helpers
-- ---------------------------------------------------------------------------

-- Points for a correct answer: the full base for an instant answer, falling in
-- a straight line to half the base at the deadline. Whole numbers only, so the
-- app can compute the very same value (src/lib/games/scoring.ts, with a test).
create function a41_private.quiz_points(p_base integer, p_elapsed_ms integer, p_limit_seconds integer)
returns integer
language sql immutable set search_path = ''
as $$
  select (
    (p_base::bigint * (2 * l.ms - least(greatest(p_elapsed_ms, 0), l.ms)) + l.ms) / (2 * l.ms)
  )::integer
  from (select p_limit_seconds::bigint * 1000 as ms) l
$$;

-- "Dewi Lestari" -> "Dewi L.": what the big screen and the leaderboards show.
create function a41_private.display_name(p_name text) returns text
language sql immutable set search_path = ''
as $$
  select case
    when cardinality(parts) > 1 then parts[1] || ' ' || upper(left(parts[cardinality(parts)], 1)) || '.'
    else parts[1]
  end
  from (select regexp_split_to_array(btrim(p_name), '\s+') as parts) s
$$;

-- A short stable id for marking "you" on a leaderboard that every phone shares.
create function a41_private.standing_id(p_guest uuid) returns text
language sql immutable set search_path = ''
as $$ select left(md5(p_guest::text), 8) $$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create trigger a41_quizzes_set_updated_at before update on public.a41_quizzes
  for each row execute function a41_private.set_updated_at();

create function a41_private.guard_quiz() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.title = btrim(new.title);
  if tg_op = 'INSERT' and (select count(*) from public.a41_quizzes where event_id = new.event_id) >= 10 then
    raise exception 'quiz_limit' using errcode = 'check_violation', detail = 'An event can have up to 10 quizzes.';
  end if;
  return new;
end
$$;

create trigger a41_quizzes_guard before insert or update on public.a41_quizzes
  for each row execute function a41_private.guard_quiz();

-- Questions: the event comes from the quiz, the position defaults to the end,
-- the texts are trimmed, and a quiz that has been played is frozen, because
-- editing a question would change what its stored results mean. (Clear the
-- results, or copy the quiz, to change it.)
create function a41_private.guard_quiz_question() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  cleaned text[];
begin
  -- deleting the whole quiz (or its event) takes its questions along
  if tg_op = 'DELETE' and not exists (select 1 from public.a41_quizzes z where z.id = old.quiz_id) then
    return old;
  end if;

  if exists (
    select 1 from public.a41_quiz_sessions s
    where s.quiz_id = case when tg_op = 'DELETE' then old.quiz_id else new.quiz_id end
  ) then
    raise exception 'quiz_in_use' using errcode = 'check_violation', detail = 'A quiz that has been played cannot be changed.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  if tg_op = 'INSERT' then
    select q.event_id into new.event_id from public.a41_quizzes q where q.id = new.quiz_id;
    if (select count(*) from public.a41_quiz_questions where quiz_id = new.quiz_id) >= 50 then
      raise exception 'quiz_too_long' using errcode = 'check_violation', detail = 'A quiz can have up to 50 questions.';
    end if;
    if new.position is null then
      select coalesce(max(q.position), 0) + 1 into new.position from public.a41_quiz_questions q where q.quiz_id = new.quiz_id;
    end if;
  end if;

  new.prompt = btrim(new.prompt);
  select array_agg(btrim(o) order by ord) into cleaned from unnest(new.options) with ordinality as t (o, ord);
  if exists (select 1 from unnest(cleaned) o where o is null or char_length(o) not between 1 and 120) then
    raise exception 'invalid_options' using errcode = 'check_violation', detail = 'Every answer needs 1 to 120 characters.';
  end if;
  new.options = cleaned;
  return new;
end
$$;

create trigger a41_quiz_questions_guard before insert or update or delete on public.a41_quiz_questions
  for each row execute function a41_private.guard_quiz_question();

-- Missions: codes are upper-case letters and digits only, however they were typed.
create function a41_private.guard_hunt_mission() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.title = btrim(new.title);
  new.hint = nullif(btrim(new.hint), '');
  new.code = upper(regexp_replace(new.code, '[^A-Za-z0-9]', '', 'g'));
  if tg_op = 'INSERT' then
    if (select count(*) from public.a41_hunt_missions where event_id = new.event_id) >= 50 then
      raise exception 'mission_limit' using errcode = 'check_violation', detail = 'A hunt can have up to 50 missions.';
    end if;
    if new.position is null then
      select coalesce(max(m.position), 0) + 1 into new.position from public.a41_hunt_missions m where m.event_id = new.event_id;
    end if;
  end if;
  return new;
end
$$;

create trigger a41_hunt_missions_guard before insert or update on public.a41_hunt_missions
  for each row execute function a41_private.guard_hunt_mission();

-- ---------------------------------------------------------------------------
-- Row level security and grants
-- ---------------------------------------------------------------------------

alter table public.a41_game_keys enable row level security;
alter table public.a41_quizzes enable row level security;
alter table public.a41_quiz_questions enable row level security;
alter table public.a41_quiz_sessions enable row level security;
alter table public.a41_quiz_players enable row level security;
alter table public.a41_quiz_answers enable row level security;
alter table public.a41_hunt_missions enable row level security;
alter table public.a41_hunt_claims enable row level security;
alter table public.a41_hunt_attempts enable row level security;

revoke all on
  public.a41_game_keys, public.a41_quizzes, public.a41_quiz_questions, public.a41_quiz_sessions,
  public.a41_quiz_players, public.a41_quiz_answers, public.a41_hunt_missions, public.a41_hunt_claims,
  public.a41_hunt_attempts
from anon, authenticated;

-- game keys: the team reads them; the key is created by a41_game_key()
grant select on public.a41_game_keys to authenticated;
create policy game_keys_select on public.a41_game_keys for select to authenticated
  using ((select a41_private.is_event_member(event_id)));

-- quizzes and questions: the team reads, owners write
grant select on public.a41_quizzes to authenticated;
grant insert (event_id, title) on public.a41_quizzes to authenticated;
grant update (title) on public.a41_quizzes to authenticated;
grant delete on public.a41_quizzes to authenticated;
create policy quizzes_select on public.a41_quizzes for select to authenticated
  using ((select a41_private.is_event_member(event_id)));
create policy quizzes_insert on public.a41_quizzes for insert to authenticated
  with check ((select a41_private.is_event_owner(event_id)));
create policy quizzes_update on public.a41_quizzes for update to authenticated
  using ((select a41_private.is_event_owner(event_id)))
  with check ((select a41_private.is_event_owner(event_id)));
create policy quizzes_delete on public.a41_quizzes for delete to authenticated
  using ((select a41_private.is_event_owner(event_id)));

grant select on public.a41_quiz_questions to authenticated;
grant insert (quiz_id, position, prompt, options, correct_index, time_limit_seconds, base_points)
  on public.a41_quiz_questions to authenticated;
grant update (position, prompt, options, correct_index, time_limit_seconds, base_points)
  on public.a41_quiz_questions to authenticated;
grant delete on public.a41_quiz_questions to authenticated;
create policy quiz_questions_select on public.a41_quiz_questions for select to authenticated
  using ((select a41_private.is_event_member(event_id)));
create policy quiz_questions_insert on public.a41_quiz_questions for insert to authenticated
  with check ((select a41_private.is_event_owner(event_id)));
create policy quiz_questions_update on public.a41_quiz_questions for update to authenticated
  using ((select a41_private.is_event_owner(event_id)))
  with check ((select a41_private.is_event_owner(event_id)));
create policy quiz_questions_delete on public.a41_quiz_questions for delete to authenticated
  using ((select a41_private.is_event_owner(event_id)));

-- sessions: the team reads; the state only changes through the host functions.
-- Owners can delete a session, which clears its results (rehearsals).
grant select, delete on public.a41_quiz_sessions to authenticated;
create policy quiz_sessions_select on public.a41_quiz_sessions for select to authenticated
  using ((select a41_private.is_event_member(event_id)));
create policy quiz_sessions_delete on public.a41_quiz_sessions for delete to authenticated
  using ((select a41_private.is_event_owner(event_id)));

-- players and answers: the team reads; nobody writes directly
grant select on public.a41_quiz_players, public.a41_quiz_answers to authenticated;
create policy quiz_players_select on public.a41_quiz_players for select to authenticated
  using ((select a41_private.is_event_member(event_id)));
create policy quiz_answers_select on public.a41_quiz_answers for select to authenticated
  using ((select a41_private.is_event_member(event_id)));

-- hunt: the team reads missions (the print sheet needs the codes), owners write
grant select on public.a41_hunt_missions to authenticated;
grant insert (event_id, position, title, hint, points, code, active) on public.a41_hunt_missions to authenticated;
grant update (position, title, hint, points, code, active) on public.a41_hunt_missions to authenticated;
grant delete on public.a41_hunt_missions to authenticated;
create policy hunt_missions_select on public.a41_hunt_missions for select to authenticated
  using ((select a41_private.is_event_member(event_id)));
create policy hunt_missions_insert on public.a41_hunt_missions for insert to authenticated
  with check ((select a41_private.is_event_owner(event_id)));
create policy hunt_missions_update on public.a41_hunt_missions for update to authenticated
  using ((select a41_private.is_event_owner(event_id)))
  with check ((select a41_private.is_event_owner(event_id)));
create policy hunt_missions_delete on public.a41_hunt_missions for delete to authenticated
  using ((select a41_private.is_event_owner(event_id)));

-- claims: the team reads; owners can delete them to reset the scores
grant select, delete on public.a41_hunt_claims to authenticated;
create policy hunt_claims_select on public.a41_hunt_claims for select to authenticated
  using ((select a41_private.is_event_member(event_id)));
create policy hunt_claims_delete on public.a41_hunt_claims for delete to authenticated
  using ((select a41_private.is_event_owner(event_id)));

-- attempts: no policy and no grant, only the functions below touch them

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
create function a41_private.hunt_leaderboard(p_event uuid, p_limit integer) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object('id', r.id, 'rank', r.rank, 'name', r.name, 'score', r.score, 'missions', r.missions)
    order by r.ord
  ), '[]'::jsonb)
  from (
    select
      a41_private.standing_id(t.guest_id) as id,
      a41_private.display_name(g.name) as name,
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
  a41_private.hunt_leaderboard(uuid, integer),
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
  public.a41_quiz_open_lobby(uuid),
  public.a41_quiz_control(uuid, text, integer),
  public.a41_quiz_move_question(uuid, integer)
from public, anon;

grant execute on function
  public.a41_game_key(uuid),
  public.a41_quiz_host_state(uuid),
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
  public.a41_hunt_claim(text, text),
  public.a41_hunt_public_leaderboard(text)
from public;

grant execute on function
  public.a41_game_guest(text),
  public.a41_quiz_public_state(text),
  public.a41_quiz_me(text),
  public.a41_quiz_join(text),
  public.a41_quiz_answer(text, integer, integer),
  public.a41_hunt_board(text),
  public.a41_hunt_claim(text, text),
  public.a41_hunt_public_leaderboard(text)
to anon, authenticated;

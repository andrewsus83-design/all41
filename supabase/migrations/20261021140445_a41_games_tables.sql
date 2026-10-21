-- Games, part 1 of 2: tables, triggers and row level security.
-- (a41_games_functions has the functions; a41_hunt_claim is in a41_delete_functions.)
--
-- The Supabase connector used to apply migrations holds back any statement that deletes
-- rows until a person confirms it, so the work below was applied in parts, each under the
-- version in its file name. The functions that delete rows are in a41_delete_functions.

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

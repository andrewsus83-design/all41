import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { classifyGameError, type GameFailure } from '@/lib/games/errors';
import { quizPoints } from '@/lib/games/scoring';
import { asAnon, asService, asUser, createDb } from './harness';

let db: PGlite;

beforeAll(async () => {
  db = await createDb();
});

// ---------------------------------------------------------------- fixtures

async function newUser(): Promise<string> {
  const id = randomUUID();
  await db.query('insert into auth.users (id, email) values ($1, $2)', [id, `${id}@example.test`]);
  return id;
}

interface Guest {
  id: string;
  token: string;
  name: string;
}

interface World {
  owner: string;
  staff: string;
  stranger: string;
  orgId: string;
  eventId: string;
  guests: Guest[];
}

/** An organization with an owner and a staff member, a published Pro event and some guests. */
async function world({ guests = 3, status = 'published' }: { guests?: number; status?: string } = {}): Promise<World> {
  const [owner, staff, stranger] = [await newUser(), await newUser(), await newUser()];
  const orgId = await asUser(db, owner, async () => {
    const { rows } = await db.query<{ id: string }>(`insert into a41_organizations (name) values ('Acme') returning id`);
    return rows[0].id;
  });
  await db.query(`insert into a41_memberships (org_id, user_id, role) values ($1, $2, 'staff')`, [orgId, staff]);
  const eventId = await asUser(db, owner, async () => {
    const { rows } = await db.query<{ id: string }>(
      `insert into a41_events (org_id, name, slug, type, starts_at, ends_at)
       values ($1, 'Annual Gala', $2, 'corporate', now() + interval '30 days', now() + interval '31 days') returning id`,
      [orgId, `evt-${randomUUID().slice(0, 8)}`],
    );
    return rows[0].id;
  });
  await asService(db, () => db.query(`update a41_events set package = 'pro' where id = $1`, [eventId]));
  const names = ['Dewi Lestari', 'Budi Santoso', 'Rina', 'Agus Wijaya Kusuma', 'Sari Putri', 'Eko Prasetyo'];
  await asUser(db, owner, () =>
    db.query(
      `insert into a41_guests (event_id, name)
       select $1, case when g <= ${names.length} then (array[${names.map((n) => `'${n}'`).join(',')}])[g] else 'Guest ' || g end
       from generate_series(1, $2::int) g`,
      [eventId, guests],
    ),
  );
  await asService(db, () => db.query(`update a41_events set status = $2 where id = $1`, [eventId, status]));
  const { rows } = await db.query<Guest>('select id, token, name from a41_guests where event_id = $1', [eventId]);
  // the order of the names above, then Guest 7, Guest 8, ...
  const place = (guest: Guest) => (names.includes(guest.name) ? names.indexOf(guest.name) : Number(guest.name.replace('Guest ', '')) + 100);
  return { owner, staff, stranger, orgId, eventId, guests: rows.sort((a, b) => place(a) - place(b)) };
}

interface Question {
  prompt?: string;
  options?: string[];
  correct?: number;
  seconds?: number;
  base?: number;
}

async function addQuiz(w: World, questions: Question[] = [{}, {}], title = 'Gala quiz'): Promise<{ quizId: string; questionIds: string[] }> {
  return asUser(db, w.owner, async () => {
    const { rows } = await db.query<{ id: string }>(`insert into a41_quizzes (event_id, title) values ($1, $2) returning id`, [w.eventId, title]);
    const quizId = rows[0].id;
    const questionIds: string[] = [];
    for (const [index, q] of questions.entries()) {
      const { rows: created } = await db.query<{ id: string }>(
        `insert into a41_quiz_questions (quiz_id, prompt, options, correct_index, time_limit_seconds, base_points)
         values ($1, $2, $3, $4, $5, $6) returning id`,
        [quizId, q.prompt ?? `Question ${index + 1}?`, q.options ?? ['A', 'B', 'C'], q.correct ?? 1, q.seconds ?? 20, q.base ?? 1000],
      );
      questionIds.push(created[0].id);
    }
    return { quizId, questionIds };
  });
}

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

async function rpc<T = Json | null>(role: 'anon' | 'owner' | 'staff' | 'stranger', w: World | null, sql: string, params: unknown[] = []): Promise<T> {
  const run = async () => (await db.query<{ r: T }>(`select ${sql} as r`, params)).rows[0].r;
  if (role === 'anon' || !w) return asAnon(db, run);
  return asUser(db, w[role], run);
}

const openLobby = (w: World, quizId: string, role: 'owner' | 'staff' = 'owner') =>
  rpc<Json>(role, w, 'public.a41_quiz_open_lobby($1)', [quizId]);
const control = (w: World, sessionId: string, action: string, position: number | null = null, role: 'owner' | 'staff' | 'stranger' = 'owner') =>
  rpc<Json>(role, w, 'public.a41_quiz_control($1, $2, $3)', [sessionId, action, position]);
const answer = (token: string, position: number, choice: number) => rpc<Json | null>('anon', null, 'public.a41_quiz_answer($1, $2, $3)', [token, position, choice]);
const join = (token: string) => rpc<Json | null>('anon', null, 'public.a41_quiz_join($1)', [token]);
const me = (token: string) => rpc<Json | null>('anon', null, 'public.a41_quiz_me($1)', [token]);
const publicState = (key: string) => rpc<Json | null>('anon', null, 'public.a41_quiz_public_state($1)', [key]);
const playKey = (w: World) => rpc<string>('owner', w, 'public.a41_game_key($1)', [w.eventId]);

/** A quiz with a live session, started on its first question. */
async function liveQuiz(w: World, questions?: Question[]) {
  const quiz = await addQuiz(w, questions);
  const lobby = await openLobby(w, quiz.quizId);
  const sessionId = lobby.session.id as string;
  return { ...quiz, sessionId };
}

/** Moves the clock of the open question: it opened `openedAgoMs` ago and lasts `limitSeconds`. */
async function shiftQuestion(sessionId: string, openedAgoMs: number, limitSeconds = 20) {
  await db.query(
    `update a41_quiz_sessions
     set question_opened_at = clock_timestamp() - make_interval(secs => $2::numeric / 1000),
         question_closes_at = clock_timestamp() - make_interval(secs => $2::numeric / 1000) + make_interval(secs => $3::numeric)
     where id = $1`,
    [sessionId, openedAgoMs, limitSeconds],
  );
}

async function failure(run: () => Promise<unknown>): Promise<{ message: string; code?: string }> {
  try {
    await run();
  } catch (error) {
    const raised = error as { message: string; code?: string };
    return { message: raised.message, code: raised.code };
  }
  throw new Error('The statement was expected to fail');
}

const count = async (sql: string, params: unknown[] = []) =>
  (await db.query<{ n: number }>(`select count(*)::int as n from ${sql}`, params)).rows[0].n;

// ---------------------------------------------------------------- structure

const TABLES = [
  'a41_game_keys',
  'a41_quizzes',
  'a41_quiz_questions',
  'a41_quiz_sessions',
  'a41_quiz_players',
  'a41_quiz_answers',
  'a41_hunt_missions',
  'a41_hunt_claims',
  'a41_hunt_attempts',
];

describe('access to the game tables', () => {
  it('has row level security on every table', async () => {
    const { rows } = await db.query<{ relname: string; relrowsecurity: boolean }>(
      `select relname, relrowsecurity from pg_class where relname = any($1)`,
      [TABLES],
    );
    expect(rows).toHaveLength(TABLES.length);
    expect(rows.filter((row) => !row.relrowsecurity)).toEqual([]);
  });

  it.each(TABLES)('does not let signed-out visitors read or write %s', async (table) => {
    await expect(asAnon(db, () => db.query(`select * from ${table}`))).rejects.toThrow(/permission denied/);
    await expect(asAnon(db, () => db.query(`delete from ${table}`))).rejects.toThrow(/permission denied/);
  });

  it('never lets anyone but the functions read the wrong-code log', async () => {
    const w = await world();
    await expect(asUser(db, w.owner, () => db.query('select * from a41_hunt_attempts'))).rejects.toThrow(/permission denied/);
  });

  it('lets guests call the guest functions and only members call the host ones', async () => {
    const callable = async (role: string, signature: string) =>
      (await db.query<{ ok: boolean }>(`select has_function_privilege($1, $2, 'execute') as ok`, [role, signature])).rows[0].ok;
    for (const signature of [
      'public.a41_game_guest(text)',
      'public.a41_quiz_public_state(text)',
      'public.a41_quiz_me(text)',
      'public.a41_quiz_join(text)',
      'public.a41_quiz_answer(text, integer, integer)',
      'public.a41_hunt_board(text)',
      'public.a41_hunt_claim(text, text)',
      'public.a41_hunt_public_leaderboard(text)',
    ]) {
      expect(await callable('anon', signature), signature).toBe(true);
    }
    for (const signature of [
      'public.a41_game_key(uuid)',
      'public.a41_quiz_host_state(uuid)',
      'public.a41_hunt_host_board(uuid)',
      'public.a41_quiz_open_lobby(uuid)',
      'public.a41_quiz_control(uuid, text, integer)',
      'public.a41_quiz_move_question(uuid, integer)',
    ]) {
      expect(await callable('anon', signature), signature).toBe(false);
      expect(await callable('authenticated', signature), signature).toBe(true);
    }
  });
});

describe('the play key', () => {
  it('is created on demand, stays the same and is unguessable', async () => {
    const w = await world();
    const first = await playKey(w);
    expect(first).toMatch(/^[0-9a-f]{32}$/);
    expect(await playKey(w)).toBe(first);
    expect(await rpc('staff', w, 'public.a41_game_key($1)', [w.eventId])).toBe(first);
    expect(await playKey(await world())).not.toBe(first);
  });

  it('is not given to strangers, and not callable by signed-out visitors', async () => {
    const w = await world();
    const stranger = await failure(() => rpc('stranger', w, 'public.a41_game_key($1)', [w.eventId]));
    expect(stranger.code).toBe('42501');
    await expect(rpc('anon', null, 'public.a41_game_key($1)', [w.eventId])).rejects.toThrow(/permission denied/);
  });

  it('comes with the guest token and only while the event is published', async () => {
    const w = await world();
    const info = await rpc<Json>('anon', null, 'public.a41_game_guest($1)', [w.guests[0].token]);
    expect(info.playKey).toBe(await playKey(w));
    expect(info.eventName).toBe('Annual Gala');
    expect(info.name).toBe('Dewi Lestari');

    expect(await rpc('anon', null, 'public.a41_game_guest($1)', ['0'.repeat(64)])).toBeNull();
    const draft = await world({ status: 'draft' });
    expect(await rpc('anon', null, 'public.a41_game_guest($1)', [draft.guests[0].token])).toBeNull();
  });

  it('can be read by the team only', async () => {
    const w = await world();
    await playKey(w);
    const seen = (user: string) => asUser(db, user, async () => (await db.query('select play_key from a41_game_keys where event_id = $1', [w.eventId])).rows.length);
    expect(await seen(w.owner)).toBe(1);
    expect(await seen(w.staff)).toBe(1);
    expect(await seen(w.stranger)).toBe(0);
    await expect(asUser(db, w.owner, () => db.query(`update a41_game_keys set play_key = 'x' where event_id = $1`, [w.eventId]))).rejects.toThrow(/permission denied/);
  });
});

// ------------------------------------------------------------------ scoring

describe('quiz points', () => {
  it('pay the full base for an instant answer and half at the deadline', async () => {
    const point = async (base: number, ms: number, limit: number) =>
      (await db.query<{ p: number }>('select a41_private.quiz_points($1, $2, $3) as p', [base, ms, limit])).rows[0].p;
    expect(await point(1000, 0, 20)).toBe(1000);
    expect(await point(1000, 10000, 20)).toBe(750);
    expect(await point(1000, 20000, 20)).toBe(500);
    expect(await point(1000, 5000, 20)).toBe(875);
    // never more than the base, never less than half, whatever the clock said
    expect(await point(1000, -300, 20)).toBe(1000);
    expect(await point(1000, 90000, 20)).toBe(500);
    // rounds half up
    expect(await point(101, 20000, 20)).toBe(51);
  });

  it('are the same in the app and in the database', async () => {
    for (const base of [100, 101, 333, 1000, 2500, 9999, 10000]) {
      for (const limit of [10, 17, 20, 45, 60]) {
        for (const ms of [-5, 0, 1, 499, 500, 1234, 9999, limit * 500, limit * 1000 - 1, limit * 1000, limit * 1000 + 700]) {
          const { rows } = await db.query<{ p: number }>('select a41_private.quiz_points($1, $2, $3) as p', [base, ms, limit]);
          expect(quizPoints(base, ms, limit), `${base} ${ms} ${limit}`).toBe(rows[0].p);
        }
      }
    }
  });

  it('are shown on the big screen as "Dewi L."', async () => {
    const shown = async (name: string) => (await db.query<{ n: string }>('select a41_private.display_name($1) as n', [name])).rows[0].n;
    expect(await shown('Dewi Lestari')).toBe('Dewi L.');
    expect(await shown('Agus Wijaya Kusuma')).toBe('Agus K.');
    expect(await shown('Rina')).toBe('Rina');
    expect(await shown('  Budi   santoso ')).toBe('Budi S.');
  });
});

// --------------------------------------------------------------- quiz setup

describe('writing a quiz', () => {
  it('lets owners create it and numbers the questions in order', async () => {
    const w = await world();
    const { questionIds } = await addQuiz(w, [{ prompt: '  First?  ', options: [' Yes ', 'No'] }, {}, {}]);
    const { rows } = await db.query<{ position: number; prompt: string; options: string[]; event_id: string }>(
      'select position, prompt, options, event_id from a41_quiz_questions where id = any($1) order by position',
      [questionIds],
    );
    expect(rows.map((row) => row.position)).toEqual([1, 2, 3]);
    expect(rows[0].prompt).toBe('First?');
    expect(rows[0].options).toEqual(['Yes', 'No']);
    expect(rows.every((row) => row.event_id === w.eventId)).toBe(true);
  });

  it('shows it to the team and to nobody else', async () => {
    const w = await world();
    await addQuiz(w);
    const questions = (user: string) => asUser(db, user, async () => (await db.query('select id from a41_quiz_questions')).rows.length);
    const quizzes = (user: string) => asUser(db, user, async () => (await db.query('select id from a41_quizzes where event_id = $1', [w.eventId])).rows.length);
    expect(await quizzes(w.owner)).toBe(1);
    expect(await quizzes(w.staff)).toBe(1);
    expect(await quizzes(w.stranger)).toBe(0);
    expect(await questions(w.owner)).toBe(2);
    expect(await questions(w.stranger)).toBe(0);
  });

  it('is an owner job: staff and strangers cannot create, change or delete', async () => {
    const w = await world();
    const { quizId, questionIds } = await addQuiz(w);
    for (const user of [w.staff, w.stranger]) {
      await expect(asUser(db, user, () => db.query(`insert into a41_quizzes (event_id, title) values ($1, 'Mine')`, [w.eventId]))).rejects.toThrow(/row-level security/);
      await expect(
        asUser(db, user, () => db.query(`insert into a41_quiz_questions (quiz_id, prompt, options, correct_index) values ($1, 'Hi?', '{a,b}', 0)`, [quizId])),
      ).rejects.toThrow(/row-level security/);
      const renamed = await asUser(db, user, () => db.query(`update a41_quizzes set title = 'Hijacked' where id = $1`, [quizId]));
      expect(renamed.affectedRows).toBe(0);
      const edited = await asUser(db, user, () => db.query(`update a41_quiz_questions set correct_index = 0 where id = $1`, [questionIds[0]]));
      expect(edited.affectedRows).toBe(0);
      const removed = await asUser(db, user, () => db.query(`delete from a41_quiz_questions where id = $1`, [questionIds[0]]));
      expect(removed.affectedRows).toBe(0);
      const removedQuiz = await asUser(db, user, () => db.query(`delete from a41_quizzes where id = $1`, [quizId]));
      expect(removedQuiz.affectedRows).toBe(0);
    }
  });

  it('keeps a quiz inside its own event: nobody names the event or writes into another quiz', async () => {
    const w = await world();
    const other = await world();
    const { quizId } = await addQuiz(other);
    await expect(
      asUser(db, w.owner, () => db.query(`insert into a41_quiz_questions (quiz_id, event_id, prompt, options, correct_index) values ($1, $2, 'Hi?', '{a,b}', 0)`, [quizId, w.eventId])),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asUser(db, w.owner, () => db.query(`insert into a41_quiz_questions (quiz_id, prompt, options, correct_index) values ($1, 'Hi?', '{a,b}', 0)`, [quizId])),
    ).rejects.toThrow(/row-level security/);
    await expect(asUser(db, w.owner, () => db.query(`insert into a41_quizzes (event_id, title) values ($1, 'x')`, [other.eventId]))).rejects.toThrow(/row-level security/);
  });

  it('wants 2 to 4 answers, exactly one of them correct, and sensible limits', async () => {
    const w = await world();
    const { quizId } = await addQuiz(w, []);
    const insert = (options: string[], correct: number, seconds = 20, base = 1000) =>
      asUser(db, w.owner, () =>
        db.query(
          `insert into a41_quiz_questions (quiz_id, prompt, options, correct_index, time_limit_seconds, base_points) values ($1, 'Q?', $2, $3, $4, $5)`,
          [quizId, options, correct, seconds, base],
        ),
      );

    await insert(['A', 'B'], 0);
    await insert(['A', 'B', 'C', 'D'], 3);
    await expect(insert(['A'], 0)).rejects.toThrow(/violates check constraint/);
    await expect(insert(['A', 'B', 'C', 'D', 'E'], 0)).rejects.toThrow(/violates check constraint/);
    await expect(insert(['A', 'B'], 2)).rejects.toThrow(/violates check constraint/);
    await expect(insert(['A', 'B'], -1)).rejects.toThrow(/violates check constraint/);
    expect((await failure(() => insert(['A', ''], 0))).message).toBe('invalid_options');
    expect((await failure(() => insert(['A', '   '], 0))).message).toBe('invalid_options');
    expect((await failure(() => insert(['A', 'x'.repeat(121)], 0))).message).toBe('invalid_options');
    await insert(['A', 'B'], 0, 10);
    await insert(['A', 'B'], 0, 60);
    await expect(insert(['A', 'B'], 0, 9)).rejects.toThrow(/violates check constraint/);
    await expect(insert(['A', 'B'], 0, 61)).rejects.toThrow(/violates check constraint/);
    await expect(insert(['A', 'B'], 0, 20, 99)).rejects.toThrow(/violates check constraint/);
    await expect(asUser(db, w.owner, () => db.query(`insert into a41_quiz_questions (quiz_id, prompt, options, correct_index) values ($1, '', '{a,b}', 0)`, [quizId]))).rejects.toThrow(
      /violates check constraint/,
    );
  });

  it('caps quizzes per event and questions per quiz', async () => {
    const w = await world();
    for (let index = 0; index < 10; index++) await addQuiz(w, [], `Round ${index + 1}`);
    expect((await failure(() => addQuiz(w, [], 'One too many'))).message).toBe('quiz_limit');

    const { quizId } = await addQuiz(await world(), []);
    await db.query(
      `insert into a41_quiz_questions (quiz_id, event_id, prompt, options, correct_index)
       select $1, event_id, 'Q' || g, '{a,b}', 0 from a41_quizzes, generate_series(1, 50) g where id = $1`,
      [quizId],
    );
    await expect(
      db.query(`insert into a41_quiz_questions (quiz_id, event_id, prompt, options, correct_index) select $1, event_id, 'Q51', '{a,b}', 0 from a41_quizzes where id = $1`, [quizId]),
    ).rejects.toThrow(/quiz_too_long/);
  });

  it('lets an owner move a question up or down, and nobody else', async () => {
    const w = await world();
    const { questionIds } = await addQuiz(w, [{ prompt: 'One' }, { prompt: 'Two' }, { prompt: 'Three' }]);
    const order = async () =>
      (await db.query<{ prompt: string }>('select prompt from a41_quiz_questions where id = any($1) order by position', [questionIds])).rows.map((row) => row.prompt);

    await rpc('owner', w, 'public.a41_quiz_move_question($1, 1)', [questionIds[0]]);
    expect(await order()).toEqual(['Two', 'One', 'Three']);
    await rpc('owner', w, 'public.a41_quiz_move_question($1, -1)', [questionIds[2]]);
    expect(await order()).toEqual(['Two', 'Three', 'One']);
    // already first: nothing to do
    await rpc('owner', w, 'public.a41_quiz_move_question($1, -1)', [questionIds[1]]);
    expect(await order()).toEqual(['Two', 'Three', 'One']);

    expect((await failure(() => rpc('staff', w, 'public.a41_quiz_move_question($1, 1)', [questionIds[1]]))).code).toBe('42501');
    expect((await failure(() => rpc('stranger', w, 'public.a41_quiz_move_question($1, 1)', [questionIds[1]]))).code).toBe('42501');
    expect((await failure(() => rpc('owner', w, 'public.a41_quiz_move_question($1, 2)', [questionIds[1]]))).message).toBe('invalid_direction');
    expect(await order()).toEqual(['Two', 'Three', 'One']);
  });

  it('is frozen once it has been played, until its results are cleared', async () => {
    const w = await world();
    const { quizId, questionIds, sessionId } = await liveQuiz(w);
    const edit = () => asUser(db, w.owner, () => db.query(`update a41_quiz_questions set correct_index = 0 where id = $1`, [questionIds[0]]));
    const add = () => asUser(db, w.owner, () => db.query(`insert into a41_quiz_questions (quiz_id, prompt, options, correct_index) values ($1, 'New?', '{a,b}', 0)`, [quizId]));
    const remove = () => asUser(db, w.owner, () => db.query(`delete from a41_quiz_questions where id = $1`, [questionIds[0]]));
    const move = () => rpc('owner', w, 'public.a41_quiz_move_question($1, 1)', [questionIds[0]]);

    for (const change of [edit, add, remove, move]) expect((await failure(change)).message).toBe('quiz_in_use');

    // the title is not part of the results
    await asUser(db, w.owner, () => db.query(`update a41_quizzes set title = 'Renamed' where id = $1`, [quizId]));

    await asUser(db, w.owner, () => db.query('delete from a41_quiz_sessions where id = $1', [sessionId]));
    await edit();
    await add();
  });
});

// ------------------------------------------------------------ state machine

describe('the live quiz session', () => {
  it('opens a lobby for a quiz that has questions', async () => {
    const w = await world();
    const empty = await addQuiz(w, [], 'Empty');
    expect((await failure(() => openLobby(w, empty.quizId))).message).toBe('quiz_has_no_questions');

    const { quizId } = await addQuiz(w);
    const state = await openLobby(w, quizId);
    expect(state.session).toMatchObject({ phase: 'lobby', quizTitle: 'Gala quiz', questionCount: 2, position: null, players: 0, question: null, reveal: null });
  });

  it('can be opened by staff, not by strangers or signed-out visitors', async () => {
    const w = await world();
    const { quizId } = await addQuiz(w);
    expect((await openLobby(w, quizId, 'staff')).session.phase).toBe('lobby');
    const other = await world();
    const otherQuiz = await addQuiz(other);
    expect((await failure(() => rpc('stranger', w, 'public.a41_quiz_open_lobby($1)', [otherQuiz.quizId]))).code).toBe('42501');
    await expect(rpc('anon', null, 'public.a41_quiz_open_lobby($1)', [quizId])).rejects.toThrow(/permission denied/);
    expect((await failure(() => rpc('owner', w, 'public.a41_quiz_open_lobby($1)', [randomUUID()]))).code).toBe('42501');
  });

  it('allows one live session per event, until it finishes', async () => {
    const w = await world();
    const { quizId, sessionId } = await liveQuiz(w);
    expect((await failure(() => openLobby(w, quizId))).message).toBe('session_already_live');
    const second = await addQuiz(w, [{}], 'Second');
    expect((await failure(() => openLobby(w, second.quizId))).message).toBe('session_already_live');

    await control(w, sessionId, 'end');
    const again = await openLobby(w, second.quizId);
    expect(again.session.phase).toBe('lobby');
    expect(again.session.id).not.toBe(sessionId);
  });

  it('runs lobby, question, reveal, question, reveal, finished', async () => {
    const w = await world();
    const { sessionId } = await liveQuiz(w, [{ seconds: 20 }, { seconds: 30 }]);

    const first = await control(w, sessionId, 'start');
    expect(first.session).toMatchObject({ phase: 'question', position: 1, questionCount: 2 });
    expect(first.session.question).toMatchObject({ timeLimit: 20, prompt: 'Question 1?', options: ['A', 'B', 'C'] });
    expect(first.session.question.closesAt - first.session.question.openedAt).toBe(20000);

    const revealed = await control(w, sessionId, 'reveal', 1);
    expect(revealed.session).toMatchObject({ phase: 'reveal', position: 1 });
    expect(revealed.session.reveal.correctIndex).toBe(1);

    const second = await control(w, sessionId, 'next', 1);
    expect(second.session).toMatchObject({ phase: 'question', position: 2 });
    expect(second.session.question.closesAt - second.session.question.openedAt).toBe(30000);
    expect(second.session.rev).toBeGreaterThan(first.session.rev);
    await control(w, sessionId, 'reveal', 2);

    const done = await control(w, sessionId, 'next', 2);
    expect(done.session.phase).toBe('finished');
    const { rows } = await db.query<{ finished_at: Date | null }>('select finished_at from a41_quiz_sessions where id = $1', [sessionId]);
    expect(rows[0].finished_at).not.toBeNull();
  });

  it('takes the time of every question from the database clock', async () => {
    const w = await world();
    const { sessionId } = await liveQuiz(w);
    const before = Date.now();
    const state = await control(w, sessionId, 'start');
    const after = Date.now();
    expect(state.session.question.openedAt).toBeGreaterThanOrEqual(before - 2000);
    expect(state.session.question.openedAt).toBeLessThanOrEqual(after + 2000);
  });

  it('refuses moves that do not fit the phase', async () => {
    const w = await world();
    const { sessionId } = await liveQuiz(w);
    const refused = async (action: string, position: number | null = null) => (await failure(() => control(w, sessionId, action, position))).message;

    expect(await refused('reveal')).toBe('invalid_transition');
    expect(await refused('next')).toBe('invalid_transition');
    expect(await refused('jump')).toBe('invalid_transition');
    await control(w, sessionId, 'start');
    expect(await refused('start')).toBe('invalid_transition');
    expect(await refused('next')).toBe('invalid_transition');
    await control(w, sessionId, 'reveal');
    expect(await refused('start')).toBe('invalid_transition');
    await control(w, sessionId, 'next');
    await control(w, sessionId, 'end');
    expect(await refused('start')).toBe('invalid_transition');
    expect(await refused('reveal')).toBe('invalid_transition');
    expect(await refused('next')).toBe('invalid_transition');
  });

  it('survives a double click: reveal twice scores once, next twice does not skip a question', async () => {
    const w = await world();
    const { sessionId } = await liveQuiz(w, [{}, {}, {}]);
    await control(w, sessionId, 'start');
    await answer(w.guests[0].token, 1, 1);
    await control(w, sessionId, 'reveal', 1);
    await control(w, sessionId, 'reveal', 1);
    expect((await me(w.guests[0].token))!.score).toBeGreaterThan(0);
    const score = (await me(w.guests[0].token))!.score;

    await control(w, sessionId, 'next', 1);
    expect((await failure(() => control(w, sessionId, 'next', 1))).message).toBe('stale_question');
    expect((await failure(() => control(w, sessionId, 'next'))).message).toBe('invalid_transition');
    expect((await publicState(await playKey(w)))!.session.position).toBe(2);
    expect((await me(w.guests[0].token))!.score).toBe(score);
  });

  it('ignores an auto-reveal that arrives after the host moved on', async () => {
    const w = await world();
    const { sessionId } = await liveQuiz(w, [{}, {}]);
    await control(w, sessionId, 'start');
    await control(w, sessionId, 'reveal', 1);
    await control(w, sessionId, 'next', 1);
    expect((await failure(() => control(w, sessionId, 'reveal', 1))).message).toBe('stale_question');
    expect((await publicState(await playKey(w)))!.session.phase).toBe('question');
  });

  it('can be ended from the lobby or from an open question, and ending twice is harmless', async () => {
    const w = await world();
    const first = await liveQuiz(w);
    expect((await control(w, first.sessionId, 'end')).session.phase).toBe('finished');
    expect((await control(w, first.sessionId, 'end')).session.phase).toBe('finished');

    const second = await addQuiz(w);
    const lobby = await openLobby(w, second.quizId);
    await control(w, lobby.session.id, 'start');
    expect((await control(w, lobby.session.id, 'end')).session.phase).toBe('finished');
  });

  it('is moved by owners and staff only', async () => {
    const w = await world();
    const { sessionId } = await liveQuiz(w);
    expect((await failure(() => control(w, sessionId, 'start', null, 'stranger'))).code).toBe('42501');
    await expect(rpc('anon', null, 'public.a41_quiz_control($1, $2, $3)', [sessionId, 'start', null])).rejects.toThrow(/permission denied/);
    // a guest holding a token is still just anon
    await expect(rpc('anon', null, 'public.a41_quiz_control($1, $2, $3)', [sessionId, 'end', null])).rejects.toThrow(/permission denied/);
    expect((await failure(() => control(w, randomUUID(), 'start'))).code).toBe('42501');
    expect((await control(w, sessionId, 'start', null, 'staff' as 'owner')).session.phase).toBe('question');
    expect((await publicState(await playKey(w)))!.session.phase).toBe('question');
  });

  it('cannot be changed with a plain update, even by the owner', async () => {
    const w = await world();
    const { sessionId } = await liveQuiz(w);
    await expect(asUser(db, w.owner, () => db.query(`update a41_quiz_sessions set phase = 'finished', finished_at = now() where id = $1`, [sessionId]))).rejects.toThrow(/permission denied/);
    await expect(asUser(db, w.owner, () => db.query(`insert into a41_quiz_sessions (event_id, quiz_id, question_count) select event_id, quiz_id, 1 from a41_quiz_sessions where id = $1`, [sessionId]))).rejects.toThrow(
      /permission denied/,
    );
    await expect(asUser(db, w.owner, () => db.query(`update a41_quiz_players set score = 99999`))).rejects.toThrow(/permission denied/);
    await expect(asUser(db, w.owner, () => db.query(`update a41_quiz_answers set points = 99999`))).rejects.toThrow(/permission denied/);
  });

  it('can be cleared by an owner, not by staff', async () => {
    const w = await world();
    const { sessionId } = await liveQuiz(w);
    const byStaff = await asUser(db, w.staff, () => db.query('delete from a41_quiz_sessions where id = $1', [sessionId]));
    expect(byStaff.affectedRows).toBe(0);
    const byOwner = await asUser(db, w.owner, () => db.query('delete from a41_quiz_sessions where id = $1', [sessionId]));
    expect(byOwner.affectedRows).toBe(1);
  });

  it('is shown by the host state to the team only, even before the event is published', async () => {
    const w = await world({ status: 'draft' });
    const { sessionId } = await liveQuiz(w);
    await control(w, sessionId, 'start');
    expect((await rpc<Json>('staff', w, 'public.a41_quiz_host_state($1)', [w.eventId])).session.phase).toBe('question');
    expect((await failure(() => rpc('stranger', w, 'public.a41_quiz_host_state($1)', [w.eventId]))).code).toBe('42501');
    await expect(rpc('anon', null, 'public.a41_quiz_host_state($1)', [w.eventId])).rejects.toThrow(/permission denied/);
    // phones cannot see a draft event's quiz
    expect(await publicState(await playKey(w))).toBeNull();
  });
});

// ------------------------------------------------------------------ playing

describe('joining the quiz', () => {
  it('counts each guest once in the lobby', async () => {
    const w = await world({ guests: 3 });
    const { sessionId } = await liveQuiz(w);
    expect((await join(w.guests[0].token))!.joined).toBe(true);
    await join(w.guests[0].token);
    await join(w.guests[1].token);
    expect((await publicState(await playKey(w)))!.session.players).toBe(2);
    expect(await count('a41_quiz_players where session_id = $1', [sessionId])).toBe(2);
  });

  it('does nothing when no game is live, and not for a finished one', async () => {
    const w = await world();
    expect((await join(w.guests[0].token))!.session).toBeNull();
    const { sessionId } = await liveQuiz(w);
    await control(w, sessionId, 'end');
    const afterwards = await join(w.guests[0].token);
    expect(afterwards!.joined).toBe(false);
    expect(afterwards!.session.phase).toBe('finished');
    expect(await count('a41_quiz_players where session_id = $1', [sessionId])).toBe(0);
  });

  it('lets a guest join late, in the middle of a game', async () => {
    const w = await world();
    const { sessionId } = await liveQuiz(w);
    await control(w, sessionId, 'start');
    const joined = await join(w.guests[2].token);
    expect(joined).toMatchObject({ joined: true, score: 0 });
    expect((await answer(w.guests[2].token, 1, 1))!.ok).toBe(true);
  });

  it('answers the same for an unknown token and for a draft event', async () => {
    const w = await world({ status: 'draft' });
    await liveQuiz(w);
    expect(await join(w.guests[0].token)).toBeNull();
    expect(await join('0'.repeat(64))).toBeNull();
    expect(await me(w.guests[0].token)).toBeNull();
    expect(await answer(w.guests[0].token, 1, 0)).toBeNull();
  });

  it('keeps events apart: a guest only ever plays in their own event', async () => {
    const a = await world();
    const b = await world();
    const live = await liveQuiz(a);
    await control(a, live.sessionId, 'start');
    // event B has no live game, so its guests get nothing from event A
    expect((await join(b.guests[0].token))!.session).toBeNull();
    expect(await answer(b.guests[0].token, 1, 1)).toEqual({ ok: false, reason: 'no_session' });
    expect(await count('a41_quiz_answers where event_id = $1', [b.eventId])).toBe(0);
    expect((await publicState(await playKey(b)))!.session).toBeNull();
  });
});

describe('answering', () => {
  it('stores one answer, decided and scored by the database, and does not say whether it was right', async () => {
    const w = await world();
    const { sessionId, questionIds } = await liveQuiz(w, [{ correct: 1, base: 1000, seconds: 20 }, {}]);
    await control(w, sessionId, 'start');
    await shiftQuestion(sessionId, 5000);

    const reply = await answer(w.guests[0].token, 1, 1);
    expect(reply).toEqual({ ok: true, choice: 1 });

    const { rows } = await db.query<{ choice: number; is_correct: boolean; points: number; elapsed_ms: number; question_id: string }>(
      'select choice, is_correct, points, elapsed_ms, question_id from a41_quiz_answers where guest_id = $1',
      [w.guests[0].id],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ choice: 1, is_correct: true, question_id: questionIds[0] });
    expect(rows[0].elapsed_ms).toBeGreaterThanOrEqual(5000);
    expect(rows[0].elapsed_ms).toBeLessThan(6500);
    expect(rows[0].points).toBe(quizPoints(1000, rows[0].elapsed_ms, 20));
  });

  it('pays more for a faster correct answer and nothing for a wrong one', async () => {
    const w = await world();
    const { sessionId } = await liveQuiz(w, [{ correct: 2, base: 1000, seconds: 20 }, {}]);
    await control(w, sessionId, 'start');
    await shiftQuestion(sessionId, 2000);
    await answer(w.guests[0].token, 1, 2);
    await shiftQuestion(sessionId, 12000);
    await answer(w.guests[1].token, 1, 2);
    await answer(w.guests[2].token, 1, 0);

    const points = async (guest: Guest) =>
      (await db.query<{ points: number; is_correct: boolean }>('select points, is_correct from a41_quiz_answers where guest_id = $1', [guest.id])).rows[0];
    const fast = await points(w.guests[0]);
    const slow = await points(w.guests[1]);
    const wrong = await points(w.guests[2]);
    expect(fast.points).toBeGreaterThan(slow.points);
    expect(fast.points).toBeGreaterThan(890);
    expect(slow.points).toBeLessThan(710);
    expect(slow.points).toBeGreaterThanOrEqual(500);
    expect(wrong).toEqual({ points: 0, is_correct: false });
  });

  it('takes the first answer of a guest and refuses a second one', async () => {
    const w = await world();
    const { sessionId } = await liveQuiz(w);
    await control(w, sessionId, 'start');
    expect(await answer(w.guests[0].token, 1, 0)).toEqual({ ok: true, choice: 0 });
    expect(await answer(w.guests[0].token, 1, 1)).toEqual({ ok: false, reason: 'already_answered', choice: 0 });
    expect(await answer(w.guests[0].token, 1, 0)).toEqual({ ok: false, reason: 'already_answered', choice: 0 });
    const { rows } = await db.query<{ choice: number; points: number }>('select choice, points from a41_quiz_answers where guest_id = $1', [w.guests[0].id]);
    expect(rows).toEqual([{ choice: 0, points: 0 }]);
  });

  it('does not accept an answer once the time is up', async () => {
    const w = await world();
    const { sessionId } = await liveQuiz(w);
    await control(w, sessionId, 'start');
    await shiftQuestion(sessionId, 20500, 20);
    expect(await answer(w.guests[0].token, 1, 1)).toEqual({ ok: false, reason: 'late' });
    expect(await count('a41_quiz_answers where event_id = $1', [w.eventId])).toBe(0);

    // just inside the deadline still counts
    await shiftQuestion(sessionId, 19000, 20);
    expect((await answer(w.guests[1].token, 1, 1))!.ok).toBe(true);
  });

  it('does not accept answers in the lobby, after the reveal, for another question or for no option', async () => {
    const w = await world();
    const { sessionId } = await liveQuiz(w);
    expect(await answer(w.guests[0].token, 1, 1)).toEqual({ ok: false, reason: 'closed' });
    await control(w, sessionId, 'start');
    expect(await answer(w.guests[0].token, 2, 1)).toEqual({ ok: false, reason: 'closed' });
    expect(await answer(w.guests[0].token, 1, -1)).toEqual({ ok: false, reason: 'invalid_choice' });
    expect(await answer(w.guests[0].token, 1, 3)).toEqual({ ok: false, reason: 'invalid_choice' });
    expect(await answer(w.guests[0].token, 1, 99)).toEqual({ ok: false, reason: 'invalid_choice' });
    await control(w, sessionId, 'reveal');
    expect(await answer(w.guests[0].token, 1, 1)).toEqual({ ok: false, reason: 'closed' });
    await control(w, sessionId, 'next');
    await control(w, sessionId, 'reveal');
    await control(w, sessionId, 'next');
    expect(await answer(w.guests[0].token, 2, 1)).toEqual({ ok: false, reason: 'no_session' });
    expect(await count('a41_quiz_answers where event_id = $1', [w.eventId])).toBe(0);
  });

  it('takes the second question only after the first is over', async () => {
    const w = await world();
    const { sessionId } = await liveQuiz(w);
    await control(w, sessionId, 'start');
    await answer(w.guests[0].token, 1, 1);
    await control(w, sessionId, 'reveal');
    await control(w, sessionId, 'next');
    expect(await answer(w.guests[0].token, 1, 1)).toEqual({ ok: false, reason: 'closed' });
    expect((await answer(w.guests[0].token, 2, 1))!.ok).toBe(true);
    expect(await count('a41_quiz_answers where guest_id = $1', [w.guests[0].id])).toBe(2);
  });
});

describe('what stays hidden until the reveal', () => {
  it('keeps the correct option, the counts and the standings out of the shared state', async () => {
    const w = await world();
    const { sessionId } = await liveQuiz(w, [{ correct: 2, options: ['Jakarta', 'Bandung', 'Surabaya'] }, {}]);
    await control(w, sessionId, 'start');
    await answer(w.guests[0].token, 1, 2);
    await answer(w.guests[1].token, 1, 0);

    const state = await publicState(await playKey(w));
    expect(state!.session.phase).toBe('question');
    expect(state!.session.reveal).toBeNull();
    expect(state!.session.leaderboard).toBeNull();
    expect(state!.session.answered).toBe(2);
    expect(JSON.stringify(state)).not.toMatch(/correct|counts/i);
    expect(Object.keys(state!.session.question).sort()).toEqual(['basePoints', 'closesAt', 'openedAt', 'options', 'prompt', 'timeLimit']);

    const host = await rpc<Json>('owner', w, 'public.a41_quiz_host_state($1)', [w.eventId]);
    expect(JSON.stringify(host)).not.toMatch(/correct|counts/i);
  });

  it('keeps a guest result private until the reveal, and keeps the score from moving early', async () => {
    const w = await world();
    const { sessionId } = await liveQuiz(w, [{ correct: 1 }, {}]);
    await control(w, sessionId, 'start');
    await answer(w.guests[0].token, 1, 1);

    const during = await me(w.guests[0].token);
    expect(during!.answer).toEqual({ position: 1, choice: 1 });
    expect(during!.score).toBe(0);
    expect(during!.rank).toBe(1);
    // a rank of 1 alone says nothing: everybody is on 0 until the reveal
    await answer(w.guests[1].token, 1, 0);
    expect((await me(w.guests[1].token))!.score).toBe(0);
    expect((await me(w.guests[1].token))!.rank).toBe(1);

    await control(w, sessionId, 'reveal');
    const after = await me(w.guests[0].token);
    expect(after!.answer).toMatchObject({ position: 1, choice: 1, correct: true });
    expect(after!.answer.points).toBeGreaterThan(0);
    expect(after!.score).toBe(after!.answer.points);
    expect(after!.rank).toBe(1);
    expect((await me(w.guests[1].token))!.answer).toMatchObject({ choice: 0, correct: false, points: 0 });
    expect((await me(w.guests[1].token))!.rank).toBe(2);
  });

  it('never shows one guest what another answered, and the tables stay closed to guests', async () => {
    const w = await world();
    const { sessionId } = await liveQuiz(w);
    await control(w, sessionId, 'start');
    await answer(w.guests[0].token, 1, 1);
    const other = await me(w.guests[1].token);
    expect(other!.answer).toBeNull();
    await expect(asAnon(db, () => db.query('select * from a41_quiz_answers'))).rejects.toThrow(/permission denied/);
    await expect(asUser(db, w.stranger, async () => (await db.query('select * from a41_quiz_answers')).rows)).resolves.toEqual([]);
  });

  it('shows the correct option and how the room answered at the reveal', async () => {
    const w = await world({ guests: 4 });
    const { sessionId } = await liveQuiz(w, [{ correct: 2 }, {}]);
    await control(w, sessionId, 'start');
    await answer(w.guests[0].token, 1, 2);
    await answer(w.guests[1].token, 1, 2);
    await answer(w.guests[2].token, 1, 0);
    await control(w, sessionId, 'reveal');
    const state = await publicState(await playKey(w));
    expect(state!.session.reveal).toEqual({ correctIndex: 2, counts: [1, 0, 2] });
    expect(state!.session.question.options).toEqual(['A', 'B', 'C']);
  });

  it('asks nothing of a key that does not exist', async () => {
    expect(await publicState('0'.repeat(32))).toBeNull();
    expect(await publicState('')).toBeNull();
    expect(await rpc('anon', null, 'public.a41_hunt_public_leaderboard($1)', ['0'.repeat(32)])).toBeNull();
  });

  it('shares the state of one event only', async () => {
    const a = await world();
    const b = await world();
    const live = await liveQuiz(a, [{ prompt: 'Only for event A?' }]);
    await control(a, live.sessionId, 'start');
    expect(JSON.stringify(await publicState(await playKey(a)))).toContain('Only for event A?');
    expect(JSON.stringify(await publicState(await playKey(b)))).not.toContain('Only for event A?');
  });
});

describe('the quiz leaderboard', () => {
  /** Answers the open question: each entry is [guest index, choice, milliseconds after opening]. */
  async function round(w: World, sessionId: string, answers: [number, number, number][], position: number) {
    for (const [index, choice, ms] of answers) {
      await shiftQuestion(sessionId, ms);
      expect((await answer(w.guests[index].token, position, choice))!.ok).toBe(true);
    }
    await control(w, sessionId, 'reveal', position);
  }

  it('ranks by points, with the faster player first among equals', async () => {
    const w = await world({ guests: 4 });
    const { sessionId } = await liveQuiz(w, [{ correct: 0 }, { correct: 0 }]);
    await control(w, sessionId, 'start');
    // guest 2 is fastest, guest 0 next, guest 1 slowest, guest 3 is wrong
    await round(w, sessionId, [[0, 0, 4000], [1, 0, 9000], [2, 0, 1000], [3, 1, 500]], 1);
    const board = (await publicState(await playKey(w)))!.session.leaderboard as Json[];
    expect(board.map((row) => row.name)).toEqual(['Rina', 'Dewi L.', 'Budi S.', 'Agus K.']);
    expect(board.map((row) => row.rank)).toEqual([1, 2, 3, 4]);
    expect(board[0].score).toBeGreaterThan(board[1].score);
    expect(board[3].score).toBe(0);
  });

  it('gives players on the same score the same rank and lists the faster one first', async () => {
    const w = await world({ guests: 4 });
    const { sessionId } = await liveQuiz(w, [{ correct: 0 }, {}]);
    await control(w, sessionId, 'start');
    // the same milliseconds give the same points; a wrong answer gives none
    await db.query('select 1');
    for (const index of [0, 1, 2, 3]) {
      await answer(w.guests[index].token, 1, index < 2 ? 0 : 1);
    }
    await db.query(`update a41_quiz_answers set elapsed_ms = 1000, points = case when is_correct then 950 else 0 end`);
    await db.query(`update a41_quiz_answers set elapsed_ms = 800 where guest_id = $1`, [w.guests[1].id]);
    await control(w, sessionId, 'reveal');

    const board = (await publicState(await playKey(w)))!.session.leaderboard as Json[];
    expect(board.map((row) => [row.name, row.rank, row.score])).toEqual([
      ['Budi S.', 1, 950],
      ['Dewi L.', 1, 950],
      ['Agus K.', 3, 0],
      ['Rina', 3, 0],
    ]);
    // what a guest is told about their own place agrees
    expect((await me(w.guests[0].token))!.rank).toBe(1);
    expect((await me(w.guests[1].token))!.rank).toBe(1);
    expect((await me(w.guests[2].token))!.rank).toBe(3);
  });

  it('adds up over questions and shows the top 10 under short names', async () => {
    const w = await world({ guests: 12 });
    const { sessionId } = await liveQuiz(w, [{ correct: 0 }, { correct: 0 }]);
    await control(w, sessionId, 'start');
    await round(w, sessionId, w.guests.map((_, index) => [index, 0, 1000 + index * 1000] as [number, number, number]), 1);
    await control(w, sessionId, 'next', 1);
    await round(w, sessionId, w.guests.map((_, index) => [index, index === 0 ? 1 : 0, 2000] as [number, number, number]), 2);

    const state = await publicState(await playKey(w));
    const board = state!.session.leaderboard as Json[];
    expect(board).toHaveLength(10);
    expect(state!.session.players).toBe(12);
    // the first guest was fastest on question 1 but wrong on question 2: 1 correct answer, last place
    const first = await me(w.guests[0].token);
    expect(first).toMatchObject({ correct: 1, rank: 12 });
    expect(board.some((row) => row.name === 'Dewi L.')).toBe(false);
    // everybody else answered both correctly, and the quickest of them leads
    expect((await me(w.guests[1].token))!.correct).toBe(2);
    expect(board[0]).toMatchObject({ name: 'Budi S.', rank: 1, correct: 2 });
    // names on the board are short, and a phone finds itself by id
    expect(board.every((row) => /^\S+( \S\.)?$/.test(row.name) || /^\S+ \S+$/.test(row.name))).toBe(true);
    expect(board.map((row) => row.id)).toContain((await me(w.guests[1].token))!.id);
  });

  it('is final when the quiz finishes, and still readable', async () => {
    const w = await world({ guests: 3 });
    const { sessionId } = await liveQuiz(w, [{ correct: 1 }]);
    await control(w, sessionId, 'start');
    await round(w, sessionId, [[0, 1, 2000], [1, 0, 2000]], 1);
    await control(w, sessionId, 'next', 1);
    const state = await publicState(await playKey(w));
    expect(state!.session.phase).toBe('finished');
    expect((state!.session.leaderboard as Json[])[0].name).toBe('Dewi L.');
    expect((await me(w.guests[0].token))!.rank).toBe(1);
  });

  it('does not count a question that was ended before its reveal', async () => {
    const w = await world();
    const { sessionId } = await liveQuiz(w);
    await control(w, sessionId, 'start');
    await answer(w.guests[0].token, 1, 1);
    await control(w, sessionId, 'end');
    expect((await me(w.guests[0].token))!.score).toBe(0);
  });
});

// ------------------------------------------------------------------- hunt

async function addMission(w: World, fields: { title?: string; code?: string; points?: number; hint?: string; active?: boolean } = {}): Promise<{ id: string; code: string }> {
  return asUser(db, w.owner, async () => {
    const { rows } = await db.query<{ id: string; code: string }>(
      `insert into a41_hunt_missions (event_id, title, hint, points, code, active)
       values ($1, $2, $3, $4, coalesce($5, upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))), $6) returning id, code`,
      [w.eventId, fields.title ?? 'Find the mascot', fields.hint ?? null, fields.points ?? 100, fields.code ?? null, fields.active ?? true],
    );
    return rows[0];
  });
}

const claim = (token: string, code: string) => rpc<Json | null>('anon', null, 'public.a41_hunt_claim($1, $2)', [token, code]);
const board = (token: string) => rpc<Json | null>('anon', null, 'public.a41_hunt_board($1)', [token]);

describe('hunt missions', () => {
  it('get a secret code of their own, upper case, however it was typed', async () => {
    const w = await world();
    const generated = await addMission(w);
    expect(generated.code).toMatch(/^[A-Z0-9]{10}$/);
    expect((await addMission(w)).code).not.toBe(generated.code);
    expect((await addMission(w, { code: 'gala-2026 ' })).code).toBe('GALA2026');
  });

  it('need a code of 6 to 24 letters and digits, unique within the event', async () => {
    const w = await world();
    await addMission(w, { code: 'ABC123' });
    await expect(addMission(w, { code: 'short' })).rejects.toThrow(/violates check constraint/);
    await expect(addMission(w, { code: 'X'.repeat(25) })).rejects.toThrow(/violates check constraint/);
    await expect(addMission(w, { code: '---' })).rejects.toThrow(/violates check constraint/);
    await expect(addMission(w, { code: 'abc123' })).rejects.toThrow(/duplicate key/);
    // another event may use the same code
    await addMission(await world(), { code: 'ABC123' });
  });

  it('are numbered in order and checked for points, title and hint', async () => {
    const w = await world();
    const first = await addMission(w);
    const second = await addMission(w);
    const { rows } = await db.query<{ id: string; position: number }>('select id, position from a41_hunt_missions where event_id = $1 order by position', [w.eventId]);
    expect(rows.map((row) => row.id)).toEqual([first.id, second.id]);
    expect(rows.map((row) => row.position)).toEqual([1, 2]);
    await expect(addMission(w, { points: 0 })).rejects.toThrow(/violates check constraint/);
    await expect(addMission(w, { points: 1001 })).rejects.toThrow(/violates check constraint/);
    await expect(addMission(w, { title: '' })).rejects.toThrow(/violates check constraint/);
    await expect(addMission(w, { hint: 'h'.repeat(201) })).rejects.toThrow(/violates check constraint/);
  });

  it('are an owner job, visible to the team and nobody else', async () => {
    const w = await world();
    const { id } = await addMission(w);
    for (const user of [w.staff, w.stranger]) {
      await expect(
        asUser(db, user, () => db.query(`insert into a41_hunt_missions (event_id, title) values ($1, 'Mine')`, [w.eventId])),
      ).rejects.toThrow(/row-level security/);
      expect((await asUser(db, user, () => db.query(`update a41_hunt_missions set points = 1 where id = $1`, [id]))).affectedRows).toBe(0);
      expect((await asUser(db, user, () => db.query(`delete from a41_hunt_missions where id = $1`, [id]))).affectedRows).toBe(0);
    }
    const seen = (user: string) => asUser(db, user, async () => (await db.query('select code from a41_hunt_missions where event_id = $1', [w.eventId])).rows.length);
    expect(await seen(w.owner)).toBe(1);
    expect(await seen(w.staff)).toBe(1);
    expect(await seen(w.stranger)).toBe(0);
  });

  it('cap at 50 per event', async () => {
    const w = await world();
    await db.query(`insert into a41_hunt_missions (event_id, title) select $1, 'M' || g from generate_series(1, 50) g`, [w.eventId]);
    expect((await failure(() => addMission(w))).message).toBe('mission_limit');
  });

  it('never put their codes on a guest screen', async () => {
    const w = await world();
    const mission = await addMission(w, { title: 'Selfie with the CEO', hint: 'Near the stage' });
    await addMission(w, { title: 'Hidden one', active: false });
    const result = await board(w.guests[0].token);
    expect(JSON.stringify(result)).not.toContain(mission.code);
    expect(JSON.stringify(result)).not.toMatch(/"code"/);
    expect(result!.missions).toEqual([{ id: mission.id, title: 'Selfie with the CEO', hint: 'Near the stage', points: 100, done: false }]);
    expect(result).toMatchObject({ total: 0, claimed: 0, rank: null });
  });
});

describe('claiming a mission', () => {
  it('pays the points of the mission once, however the code is typed', async () => {
    const w = await world();
    const mission = await addMission(w, { code: 'GALA2026', points: 250, title: 'Photo with the CEO' });
    const typed = await claim(w.guests[0].token, ' gala-2026 ');
    expect(typed).toEqual({ status: 'claimed', mission: 'Photo with the CEO', points: 250, total: 250 });
    expect(await claim(w.guests[0].token, 'GALA2026')).toEqual({ status: 'already_claimed', mission: 'Photo with the CEO', points: 0, total: 250 });
    expect(await count('a41_hunt_claims where mission_id = $1', [mission.id])).toBe(1);
    expect(await board(w.guests[0].token)).toMatchObject({ total: 250, claimed: 1, rank: 1 });
    // a second guest earns it too
    expect((await claim(w.guests[1].token, 'GALA2026'))!.status).toBe('claimed');
  });

  it('adds up over missions and keeps the points the mission had when it was claimed', async () => {
    const w = await world();
    const first = await addMission(w, { code: 'FIRST1', points: 100 });
    await addMission(w, { code: 'SECOND', points: 200 });
    await claim(w.guests[0].token, 'FIRST1');
    await asUser(db, w.owner, () => db.query('update a41_hunt_missions set points = 999 where id = $1', [first.id]));
    expect(await claim(w.guests[0].token, 'SECOND')).toMatchObject({ status: 'claimed', points: 200, total: 300 });
    expect((await board(w.guests[0].token))!.total).toBe(300);
  });

  it('refuses a wrong code, a code of another event and a code of a switched-off mission', async () => {
    const w = await world();
    const other = await world();
    await addMission(w, { code: 'REALONE' });
    await addMission(w, { code: 'SWITCHED', active: false });
    await addMission(other, { code: 'ELSEWHERE' });
    for (const code of ['NOPE123', 'ELSEWHERE', 'SWITCHED', '', '   ']) {
      expect((await claim(w.guests[0].token, code))!.status, code).toBe('wrong_code');
    }
    expect(await count('a41_hunt_claims where event_id = $1', [w.eventId])).toBe(0);
    expect(await count('a41_hunt_attempts where guest_id = $1', [w.guests[0].id])).toBe(5);
  });

  it('treats an unknown token and a draft event alike', async () => {
    const w = await world({ status: 'draft' });
    await addMission(w, { code: 'REALONE' });
    expect(await claim(w.guests[0].token, 'REALONE')).toBeNull();
    expect(await claim('0'.repeat(64), 'REALONE')).toBeNull();
    expect(await board(w.guests[0].token)).toBeNull();
    expect(await count('a41_hunt_attempts where guest_id = $1', [w.guests[0].id])).toBe(0);
  });

  it('lets a guest try 5 wrong codes a minute, then makes them wait even with the right one', async () => {
    const w = await world();
    await addMission(w, { code: 'REALONE' });
    const token = w.guests[0].token;
    for (let attempt = 0; attempt < 5; attempt++) expect((await claim(token, `GUESS${attempt}`))!.status).toBe('wrong_code');

    const blocked = await claim(token, 'REALONE');
    expect(blocked!.status).toBe('rate_limited');
    expect(blocked!.retryAfter).toBeGreaterThanOrEqual(1);
    expect(blocked!.retryAfter).toBeLessThanOrEqual(60);
    expect((await claim(token, 'GUESS9'))!.status).toBe('rate_limited');
    // being told to wait does not make the wait longer
    expect(await count('a41_hunt_attempts where guest_id = $1', [w.guests[0].id])).toBe(5);
    expect(await count('a41_hunt_claims where event_id = $1', [w.eventId])).toBe(0);

    // another guest is not affected
    expect((await claim(w.guests[1].token, 'REALONE'))!.status).toBe('claimed');

    // a minute later the guest may try again
    await db.query(`update a41_hunt_attempts set attempted_at = attempted_at - interval '61 seconds'`);
    expect((await claim(token, 'REALONE'))!.status).toBe('claimed');
  });

  it('counts down the tries left', async () => {
    const w = await world();
    await addMission(w, { code: 'REALONE' });
    expect(await claim(w.guests[0].token, 'WRONG1')).toEqual({ status: 'wrong_code', triesLeft: 4 });
    expect(await claim(w.guests[0].token, 'WRONG2')).toEqual({ status: 'wrong_code', triesLeft: 3 });
  });

  it('forgets wrong tries after an hour', async () => {
    const w = await world();
    await addMission(w, { code: 'REALONE' });
    await claim(w.guests[0].token, 'WRONG1');
    await db.query(`update a41_hunt_attempts set attempted_at = attempted_at - interval '2 hours'`);
    await claim(w.guests[0].token, 'WRONG2');
    expect(await count('a41_hunt_attempts where guest_id = $1', [w.guests[0].id])).toBe(1);
  });

  it('is cleared by an owner, not by staff', async () => {
    const w = await world();
    await addMission(w, { code: 'REALONE' });
    await claim(w.guests[0].token, 'REALONE');
    expect((await asUser(db, w.staff, () => db.query('delete from a41_hunt_claims'))).affectedRows).toBe(0);
    await expect(asUser(db, w.owner, () => db.query('update a41_hunt_claims set points = 9999'))).rejects.toThrow(/permission denied/);
    expect((await asUser(db, w.owner, () => db.query('delete from a41_hunt_claims'))).affectedRows).toBe(1);
    expect((await claim(w.guests[0].token, 'REALONE'))!.status).toBe('claimed');
  });
});

describe('the hunt leaderboard', () => {
  it('ranks guests by points, gives ties one rank and lists whoever got there first before the rest', async () => {
    const w = await world({ guests: 5 });
    await addMission(w, { code: 'ALPHA1', points: 100 });
    await addMission(w, { code: 'BRAVO2', points: 300 });
    await claim(w.guests[1].token, 'ALPHA1');
    await claim(w.guests[0].token, 'ALPHA1');
    await claim(w.guests[2].token, 'BRAVO2');
    await claim(w.guests[3].token, 'ALPHA1');
    await claim(w.guests[3].token, 'BRAVO2');

    const result = await board(w.guests[1].token);
    const rows = (result!.leaderboard as Json[]).map((row) => [row.name, row.rank, row.score]);
    expect(rows).toEqual([
      ['Agus K.', 1, 400],
      ['Rina', 2, 300],
      ['Budi S.', 3, 100],
      ['Dewi L.', 3, 100],
    ]);
    // guests without a claim are not listed or ranked
    expect(result).toMatchObject({ total: 100, rank: 3, claimed: 1 });
    expect((await board(w.guests[4].token))!.rank).toBeNull();
    expect((result!.leaderboard as Json[]).map((row) => row.id)).toContain(result!.id);
  });

  it('is shared by key, cut to the top 10, and empty for a key that is not known', async () => {
    const w = await world({ guests: 12 });
    await addMission(w, { code: 'ALPHA1' });
    for (const guest of w.guests) await claim(guest.token, 'ALPHA1');
    const shared = await rpc<Json>('anon', null, 'public.a41_hunt_public_leaderboard($1)', [await playKey(w)]);
    expect(shared.missions).toBe(1);
    expect(shared.leaderboard).toHaveLength(10);
    expect((shared.leaderboard as Json[]).every((row) => row.rank === 1)).toBe(true);
    expect(JSON.stringify(shared)).not.toContain('ALPHA1');

    const draft = await world({ status: 'draft' });
    expect(await rpc('anon', null, 'public.a41_hunt_public_leaderboard($1)', [await playKey(draft)])).toBeNull();
  });

  it('keeps events apart', async () => {
    const a = await world();
    const b = await world();
    await addMission(a, { code: 'ALPHA1' });
    await claim(a.guests[0].token, 'ALPHA1');
    const seen = await rpc<Json>('anon', null, 'public.a41_hunt_public_leaderboard($1)', [await playKey(b)]);
    expect(seen).toEqual({ missions: 0, leaderboard: [] });
  });
});

describe('the hunt board for the team', () => {
  it('shows codes, how often each mission was found and full names, to owners and staff', async () => {
    const w = await world();
    const first = await addMission(w, { code: 'ALPHA1', title: 'Selfie' });
    await addMission(w, { code: 'BRAVO2', title: 'Quiz master', active: false });
    await claim(w.guests[0].token, 'ALPHA1');
    await claim(w.guests[1].token, 'ALPHA1');
    for (const role of ['owner', 'staff'] as const) {
      const result = await rpc<Json>(role, w, 'public.a41_hunt_host_board($1)', [w.eventId]);
      expect(result.missions).toMatchObject([
        { id: first.id, code: 'ALPHA1', found: 2, active: true },
        { code: 'BRAVO2', found: 0, active: false },
      ]);
      expect(result.players).toBe(2);
      expect((result.leaderboard as Json[]).map((row) => row.name)).toEqual(['Dewi Lestari', 'Budi Santoso']);
    }
  });

  it('is closed to strangers and signed-out visitors', async () => {
    const w = await world();
    expect((await failure(() => rpc('stranger', w, 'public.a41_hunt_host_board($1)', [w.eventId]))).code).toBe('42501');
    await expect(rpc('anon', null, 'public.a41_hunt_host_board($1)', [w.eventId])).rejects.toThrow(/permission denied/);
  });
});

// The app explains these failures in words. The database raises each one here,
// so a renamed rule breaks this test and not a host in front of a room.
describe('database errors the app explains', () => {
  const classified = async (run: () => Promise<unknown>): Promise<GameFailure> => {
    const raised = await failure(run);
    return classifyGameError({ code: raised.code, message: raised.message });
  };

  it('names every rule a host can hit', async () => {
    const w = await world();
    const { quizId, sessionId, questionIds } = await liveQuiz(w);
    expect(await classified(() => asUser(db, w.owner, () => db.query(`delete from a41_quiz_questions where id = $1`, [questionIds[0]])))).toBe('quiz_in_use');
    expect(await classified(() => openLobby(w, quizId))).toBe('session_already_live');
    expect(await classified(() => control(w, sessionId, 'reveal'))).toBe('invalid_transition');
    await control(w, sessionId, 'start');
    await control(w, sessionId, 'reveal', 1);
    await control(w, sessionId, 'next', 1);
    expect(await classified(() => control(w, sessionId, 'reveal', 1))).toBe('stale_question');
    expect(await classified(() => control(w, sessionId, 'start', null, 'stranger'))).toBe('forbidden');

    const empty = await world();
    const { quizId: emptyQuiz } = await addQuiz(empty, []);
    expect(await classified(() => openLobby(empty, emptyQuiz))).toBe('quiz_has_no_questions');
    expect(
      await classified(() => asUser(db, empty.owner, () => db.query(`insert into a41_quiz_questions (quiz_id, prompt, options, correct_index) values ($1, 'Q?', '{a,""}', 0)`, [emptyQuiz]))),
    ).toBe('invalid_options');

    const missions = await world();
    await addMission(missions, { code: 'ABC123' });
    expect(await classified(() => addMission(missions, { code: 'abc123' }))).toBe('duplicate_code');
    await db.query(`insert into a41_hunt_missions (event_id, title) select $1, 'M' || g from generate_series(1, 49) g`, [missions.eventId]);
    expect(await classified(() => addMission(missions))).toBe('mission_limit');
  });
});

describe('removing guests and events', () => {
  it('takes their game data with them', async () => {
    const w = await world();
    const { sessionId } = await liveQuiz(w);
    await control(w, sessionId, 'start');
    await answer(w.guests[0].token, 1, 1);
    await addMission(w, { code: 'ALPHA1' });
    await claim(w.guests[0].token, 'ALPHA1');
    await claim(w.guests[0].token, 'WRONG1');

    await asUser(db, w.owner, () => db.query('delete from a41_guests where id = $1', [w.guests[0].id]));
    expect(await count('a41_quiz_answers where guest_id = $1', [w.guests[0].id])).toBe(0);
    expect(await count('a41_quiz_players where guest_id = $1', [w.guests[0].id])).toBe(0);
    expect(await count('a41_hunt_claims where guest_id = $1', [w.guests[0].id])).toBe(0);
    expect(await count('a41_hunt_attempts where guest_id = $1', [w.guests[0].id])).toBe(0);

    await asService(db, () => db.query('delete from a41_events where id = $1', [w.eventId]));
    expect(await count('a41_quizzes where event_id = $1', [w.eventId])).toBe(0);
    expect(await count('a41_quiz_sessions where event_id = $1', [w.eventId])).toBe(0);
    expect(await count('a41_hunt_missions where event_id = $1', [w.eventId])).toBe(0);
  });
});

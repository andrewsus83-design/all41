import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { classifyDbError, type DbError } from '@/lib/db-errors';
import { parseInvitation, parsePublicEvent, parseSubmitResult } from '@/lib/guest/records';
import { asAnon, asService, asUser, createDb } from './harness';

let db: PGlite;

beforeAll(async () => {
  db = await createDb();
});

type Status = 'draft' | 'published' | 'archived';

async function newUser(): Promise<string> {
  const id = randomUUID();
  await db.query('insert into auth.users (id, email) values ($1, $2)', [id, `${id}@example.test`]);
  return id;
}

interface Fixture {
  owner: string;
  staff: string;
  orgId: string;
  eventId: string;
  slug: string;
}

/** An organization with an owner and a staff member, and one event in the given status. */
async function newEvent(status: Status = 'published'): Promise<Fixture> {
  const owner = await newUser();
  const staff = await newUser();
  const slug = `evt-${randomUUID().slice(0, 8)}`;
  const { orgId, eventId } = await asUser(db, owner, async () => {
    const { rows: orgs } = await db.query<{ id: string }>(`insert into a41_organizations (name) values ('Acme') returning id`);
    const { rows } = await db.query<{ id: string }>(
      `insert into a41_events (org_id, name, slug, type, timezone, starts_at, ends_at, venue_name, venue_address, theme)
       values ($1, 'Annual Gala', $2, 'corporate', 'Asia/Jakarta', now() + interval '30 days', now() + interval '30 days 3 hours',
               'Grand Ballroom', 'Jl. Sudirman 1, Jakarta', '{"preset":"gala","font":"classic"}') returning id`,
      [orgs[0].id, slug],
    );
    return { orgId: orgs[0].id, eventId: rows[0].id };
  });
  await db.query(`insert into a41_memberships (org_id, user_id, role) values ($1, $2, 'staff')`, [orgId, staff]);
  await setStatus(eventId, status);
  return { owner, staff, orgId, eventId, slug };
}

const setStatus = (eventId: string, status: Status) =>
  asService(db, () => db.query('update a41_events set status = $2 where id = $1', [eventId, status]));

/** The event has finished: both ends are in the past. */
const endEvent = (eventId: string) =>
  asService(db, () =>
    db.query(
      `update a41_events set starts_at = now() - interval '3 hours', ends_at = now() - interval '1 minute' where id = $1`,
      [eventId],
    ),
  );

async function addGuest(
  fixture: Fixture,
  name = 'Dewi Lestari',
  tableNo: string | null = 'A7',
): Promise<{ id: string; token: string; email: string; phone: string }> {
  const email = `${randomUUID()}@example.test`;
  const phone = `+6281${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`;
  const { rows } = await asUser(db, fixture.owner, () =>
    db.query<{ id: string }>(
      `insert into a41_guests (event_id, name, email, phone, tags, table_no)
       values ($1, $2, $3, $4, '{vip}', $5) returning id`,
      [fixture.eventId, name, email, phone, tableNo],
    ),
  );
  const { rows: tokens } = await db.query<{ token: string }>('select token from a41_guests where id = $1', [rows[0].id]);
  return { id: rows[0].id, token: tokens[0].token, email, phone };
}

const guestStatus = async (guestId: string) =>
  (await db.query<{ status: string }>('select status from a41_guests where id = $1', [guestId])).rows[0].status;

const rsvpRows = async (guestId: string) =>
  (await db.query<Record<string, unknown>>('select * from a41_rsvps where guest_id = $1', [guestId])).rows;

type Json = Record<string, unknown> | null;

async function publicEvent(slug: string): Promise<Json> {
  const { rows } = await asAnon(db, () => db.query<{ result: Json }>('select public.a41_public_event($1) as result', [slug]));
  return rows[0].result;
}

async function openInvitation(token: string): Promise<Json> {
  const { rows } = await asAnon(db, () => db.query<{ result: Json }>('select public.a41_open_invitation($1) as result', [token]));
  return rows[0].result;
}

interface Answer {
  response?: string | null;
  partySize?: number | null;
  meal?: string | null;
  message?: string | null;
}

async function submit(token: string, answer: Answer = {}): Promise<Record<string, unknown>> {
  const { response = 'attending', partySize = 1, meal = null, message = null } = answer;
  const { rows } = await asAnon(db, () =>
    db.query<{ result: Record<string, unknown> }>('select public.a41_submit_rsvp($1, $2, $3, $4, $5) as result', [
      token,
      response,
      partySize,
      meal,
      message,
    ]),
  );
  return rows[0].result;
}

describe('publishing an event', () => {
  it('lets an owner publish a draft and take it down again', async () => {
    const fixture = await newEvent('draft');
    const move = (status: Status) =>
      asUser(db, fixture.owner, () => db.query('update a41_events set status = $2 where id = $1 returning status', [fixture.eventId, status]));

    expect((await move('published')).rows).toEqual([{ status: 'published' }]);
    expect(await publicEvent(fixture.slug)).not.toBeNull();
    expect((await move('draft')).rows).toEqual([{ status: 'draft' }]);
    expect(await publicEvent(fixture.slug)).toBeNull();
  });

  it('does not let staff change the status: nothing is updated', async () => {
    const fixture = await newEvent('draft');
    const { rows } = await asUser(db, fixture.staff, () =>
      db.query(`update a41_events set status = 'published' where id = $1 returning id`, [fixture.eventId]),
    );
    expect(rows).toHaveLength(0);
    expect((await db.query('select status from a41_events where id = $1', [fixture.eventId])).rows).toEqual([{ status: 'draft' }]);
  });

  it('does not let a stranger or a signed-out visitor change the status', async () => {
    const fixture = await newEvent('draft');
    const stranger = await newUser();
    const { rows } = await asUser(db, stranger, () =>
      db.query(`update a41_events set status = 'published' where id = $1 returning id`, [fixture.eventId]),
    );
    expect(rows).toHaveLength(0);
    await expect(
      asAnon(db, () => db.query(`update a41_events set status = 'published' where id = $1`, [fixture.eventId])),
    ).rejects.toThrow(/permission denied/);
    expect((await db.query('select status from a41_events where id = $1', [fixture.eventId])).rows).toEqual([{ status: 'draft' }]);
  });

  it('refuses to publish an archived event, and the app can tell why', async () => {
    const fixture = await newEvent('archived');
    let raised: (DbError & { detail?: string }) | undefined;
    try {
      await asUser(db, fixture.owner, () => db.query(`update a41_events set status = 'published' where id = $1`, [fixture.eventId]));
    } catch (error) {
      raised = error as DbError & { detail?: string };
    }
    expect(raised?.message).toBe('archived_event_cannot_publish');
    expect(classifyDbError({ code: raised?.code, message: raised?.message })).toBe('archived_event_cannot_publish');
    expect((await db.query('select status from a41_events where id = $1', [fixture.eventId])).rows).toEqual([{ status: 'archived' }]);
  });

  it('refuses the same even for the server role', async () => {
    const fixture = await newEvent('archived');
    await expect(setStatus(fixture.eventId, 'published')).rejects.toThrow(/archived_event_cannot_publish/);
  });

  it('lets an archived event come back as a draft and be published from there', async () => {
    const fixture = await newEvent('archived');
    const move = (status: Status) =>
      asUser(db, fixture.owner, () => db.query('update a41_events set status = $2 where id = $1', [fixture.eventId, status]));
    await move('draft');
    await move('published');
    expect(await publicEvent(fixture.slug)).not.toBeNull();
  });

  it('lets a published event be archived', async () => {
    const fixture = await newEvent('published');
    await asUser(db, fixture.owner, () => db.query(`update a41_events set status = 'archived' where id = $1`, [fixture.eventId]));
    expect(await publicEvent(fixture.slug)).toBeNull();
  });

  it('does not get in the way of editing other columns of an archived event', async () => {
    const fixture = await newEvent('archived');
    await asUser(db, fixture.owner, () => db.query(`update a41_events set name = 'Renamed' where id = $1`, [fixture.eventId]));
    expect((await db.query('select name from a41_events where id = $1', [fixture.eventId])).rows).toEqual([{ name: 'Renamed' }]);
  });
});

describe('a41_public_event', () => {
  it('returns the page of a published event, and only that', async () => {
    const fixture = await newEvent('published');
    const event = await publicEvent(fixture.slug);
    expect(event).toEqual({
      slug: fixture.slug,
      name: 'Annual Gala',
      type: 'corporate',
      timezone: 'Asia/Jakarta',
      starts_at: expect.any(String),
      ends_at: expect.any(String),
      venue_name: 'Grand Ballroom',
      venue_address: 'Jl. Sudirman 1, Jakarta',
      theme: { preset: 'gala', font: 'classic' },
    });
    expect(Object.keys(event ?? {})).not.toContain('org_id');
    expect(JSON.stringify(event)).not.toContain(fixture.orgId);
    expect(JSON.stringify(event)).not.toContain(fixture.eventId);
  });

  it.each(['draft', 'archived'] as const)('returns nothing for a %s event', async (status) => {
    const fixture = await newEvent(status);
    expect(await publicEvent(fixture.slug)).toBeNull();
  });

  it('returns nothing for a slug that does not exist, which looks the same as a draft', async () => {
    const draft = await newEvent('draft');
    expect(await publicEvent('no-such-event')).toEqual(await publicEvent(draft.slug));
    expect(await publicEvent('')).toBeNull();
  });

  it("does not return another event's data for a similar slug", async () => {
    const first = await newEvent('published');
    await newEvent('published');
    expect(await publicEvent(`${first.slug}%`)).toBeNull();
    expect(await publicEvent(first.slug.toUpperCase())).toBeNull();
  });

  it('is callable by anon and by signed-in users, and the tables stay closed', async () => {
    const fixture = await newEvent('published');
    const { rows } = await asUser(db, fixture.staff, () => db.query('select public.a41_public_event($1) as result', [fixture.slug]));
    expect(rows[0]).not.toBeNull();
    await expect(asAnon(db, () => db.query('select * from a41_events'))).rejects.toThrow(/permission denied/);
  });
});

describe('a41_open_invitation', () => {
  it('shows a guest their own name, table and event', async () => {
    const fixture = await newEvent('published');
    const guest = await addGuest(fixture);
    const invitation = await openInvitation(guest.token);
    expect(invitation).toEqual({
      guest: { name: 'Dewi Lestari', table_no: 'A7' },
      event: expect.objectContaining({ slug: fixture.slug, name: 'Annual Gala', venue_name: 'Grand Ballroom' }),
      rsvp: null,
      rsvp_open: true,
      checked_in_at: null,
    });
  });

  it('shows nothing a guest should not see: no contact details, tags, token, ids or organization', async () => {
    const fixture = await newEvent('published');
    const guest = await addGuest(fixture);
    const text = JSON.stringify(await openInvitation(guest.token));
    for (const secret of [guest.token, guest.id, fixture.eventId, fixture.orgId, guest.phone, guest.email, 'vip']) {
      expect(text).not.toContain(secret);
    }
  });

  it('moves a guest who was invited or sent to opened, and does it again harmlessly', async () => {
    const fixture = await newEvent('published');
    const invited = await addGuest(fixture, 'Invited');
    const sent = await addGuest(fixture, 'Sent');
    await asService(db, () => db.query(`update a41_guests set status = 'sent' where id = $1`, [sent.id]));

    await openInvitation(invited.token);
    await openInvitation(sent.token);
    expect(await guestStatus(invited.id)).toBe('opened');
    expect(await guestStatus(sent.id)).toBe('opened');

    await openInvitation(invited.token);
    expect(await guestStatus(invited.id)).toBe('opened');
  });

  it('never moves a guest backwards', async () => {
    const fixture = await newEvent('published');
    const guest = await addGuest(fixture);
    await submit(guest.token);
    expect(await guestStatus(guest.id)).toBe('rsvp');
    await openInvitation(guest.token);
    expect(await guestStatus(guest.id)).toBe('rsvp');

    await asUser(db, fixture.staff, () => db.query('insert into a41_checkins (guest_id, event_id) values ($1, $2)', [guest.id, fixture.eventId]));
    expect(await guestStatus(guest.id)).toBe('checked_in');
    const invitation = await openInvitation(guest.token);
    expect(await guestStatus(guest.id)).toBe('checked_in');
    expect(invitation?.checked_in_at).toEqual(expect.any(String));
  });

  it("returns the guest's existing answer", async () => {
    const fixture = await newEvent('published');
    const guest = await addGuest(fixture);
    await submit(guest.token, { response: 'attending', partySize: 3, meal: 'Vegetarian', message: 'See you there' });
    const invitation = await openInvitation(guest.token);
    expect(invitation?.rsvp).toEqual({
      response: 'attending',
      party_size: 3,
      meal_preference: 'Vegetarian',
      message: 'See you there',
      responded_at: expect.any(String),
    });
  });

  it('says the answer is closed once the event has ended, but still shows the pass', async () => {
    const fixture = await newEvent('published');
    const guest = await addGuest(fixture);
    await submit(guest.token);
    await endEvent(fixture.eventId);
    const invitation = await openInvitation(guest.token);
    expect(invitation).toMatchObject({ rsvp_open: false, guest: { name: 'Dewi Lestari' } });
  });

  it.each(['draft', 'archived'] as const)('returns nothing, and changes nothing, while the event is %s', async (status) => {
    const fixture = await newEvent('published');
    const guest = await addGuest(fixture);
    await setStatus(fixture.eventId, status);
    expect(await openInvitation(guest.token)).toBeNull();
    expect(await guestStatus(guest.id)).toBe('invited');
  });

  it('answers a made-up token exactly like a draft event', async () => {
    const fixture = await newEvent('draft');
    const guest = await addGuest(fixture);
    expect(await openInvitation('0'.repeat(64))).toBeNull();
    expect(await openInvitation(guest.token)).toBeNull();
    expect(await openInvitation('')).toBeNull();
    expect(await openInvitation('x'.repeat(5000))).toBeNull();
  });

  it('only opens the guest whose token it is', async () => {
    const fixture = await newEvent('published');
    const first = await addGuest(fixture, 'First');
    const second = await addGuest(fixture, 'Second');
    const invitation = await openInvitation(first.token);
    expect(invitation).toMatchObject({ guest: { name: 'First' } });
    expect(await guestStatus(first.id)).toBe('opened');
    expect(await guestStatus(second.id)).toBe('invited');
  });
});

describe('a41_submit_rsvp', () => {
  it('records an answer and moves the guest to rsvp', async () => {
    const fixture = await newEvent('published');
    const guest = await addGuest(fixture);
    const result = await submit(guest.token, { response: 'attending', partySize: 2, meal: 'Halal', message: 'Looking forward to it' });

    expect(result).toEqual({
      ok: true,
      rsvp: { response: 'attending', party_size: 2, meal_preference: 'Halal', message: 'Looking forward to it', responded_at: expect.any(String) },
    });
    expect(await rsvpRows(guest.id)).toEqual([
      expect.objectContaining({ guest_id: guest.id, event_id: fixture.eventId, response: 'attending', party_size: 2, meal_preference: 'Halal' }),
    ]);
    expect(await guestStatus(guest.id)).toBe('rsvp');
  });

  it('records a decline as a party of one without a meal', async () => {
    const fixture = await newEvent('published');
    const guest = await addGuest(fixture);
    const result = await submit(guest.token, { response: 'declined', partySize: 5, meal: 'Vegan', message: 'Sorry, I am travelling' });
    expect(result).toMatchObject({ ok: true, rsvp: { response: 'declined', party_size: 1, meal_preference: null, message: 'Sorry, I am travelling' } });
  });

  it('treats a missing party size as one', async () => {
    const fixture = await newEvent('published');
    const guest = await addGuest(fixture);
    expect(await submit(guest.token, { partySize: null })).toMatchObject({ ok: true, rsvp: { party_size: 1 } });
  });

  it('lets a guest change their mind: one row, the latest answer wins', async () => {
    const fixture = await newEvent('published');
    const guest = await addGuest(fixture);
    await submit(guest.token, { response: 'attending', partySize: 4, meal: 'Halal' });
    const first = (await rsvpRows(guest.id))[0];
    await submit(guest.token, { response: 'declined' });

    const rows = await rsvpRows(guest.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ response: 'declined', party_size: 1, meal_preference: null });
    expect(new Date(rows[0].responded_at as string).getTime()).toBeGreaterThanOrEqual(new Date(first.responded_at as string).getTime());
  });

  it('survives a double submit: two identical requests at once leave one answer', async () => {
    const fixture = await newEvent('published');
    const guest = await addGuest(fixture);
    const results = await Promise.all([submit(guest.token, { partySize: 2 }), submit(guest.token, { partySize: 2 })]);
    expect(results.map((result) => result.ok)).toEqual([true, true]);
    expect(await rsvpRows(guest.id)).toHaveLength(1);
    expect(await guestStatus(guest.id)).toBe('rsvp');
  });

  it('trims what was typed and stores nothing for blanks', async () => {
    const fixture = await newEvent('published');
    const guest = await addGuest(fixture);
    expect(await submit(guest.token, { meal: '  Vegetarian \n', message: '   \t ' })).toMatchObject({
      ok: true,
      rsvp: { meal_preference: 'Vegetarian', message: null },
    });
  });

  it('keeps line breaks inside a message', async () => {
    const fixture = await newEvent('published');
    const guest = await addGuest(fixture);
    expect(await submit(guest.token, { message: 'Line one\nLine two' })).toMatchObject({ ok: true, rsvp: { message: 'Line one\nLine two' } });
  });

  it.each([
    ['an unknown response', { response: 'maybe' }, 'response'],
    ['no response', { response: null }, 'response'],
    ['an empty response', { response: '' }, 'response'],
    ['a party of zero', { partySize: 0 }, 'party_size'],
    ['a negative party', { partySize: -2 }, 'party_size'],
    ['a party of eleven', { partySize: 11 }, 'party_size'],
    ['a meal preference over 100 characters', { meal: 'x'.repeat(101) }, 'meal_preference'],
    ['a message over 500 characters', { message: 'x'.repeat(501) }, 'message'],
  ] as const)('refuses %s and stores nothing', async (_label, answer, field) => {
    const fixture = await newEvent('published');
    const guest = await addGuest(fixture);
    const result = await submit(guest.token, answer);
    expect(result).toEqual({ ok: false, reason: 'invalid', field });
    expect(await rsvpRows(guest.id)).toHaveLength(0);
    expect(await guestStatus(guest.id)).toBe('invited');
  });

  it('accepts the edges: a party of ten, 100 characters of meal, 500 of message', async () => {
    const fixture = await newEvent('published');
    const guest = await addGuest(fixture);
    const result = await submit(guest.token, { partySize: 10, meal: 'm'.repeat(100), message: 'n'.repeat(500) });
    expect(result).toMatchObject({ ok: true, rsvp: { party_size: 10 } });
  });

  it('keeps a declined answer at one person even if the party size is nonsense', async () => {
    const fixture = await newEvent('published');
    const guest = await addGuest(fixture);
    expect(await submit(guest.token, { response: 'declined', partySize: 999 })).toMatchObject({ ok: true, rsvp: { party_size: 1 } });
  });

  it('is closed once the event has ended, and the earlier answer stays as it was', async () => {
    const fixture = await newEvent('published');
    const guest = await addGuest(fixture);
    await submit(guest.token, { response: 'attending', partySize: 2 });
    await endEvent(fixture.eventId);

    expect(await submit(guest.token, { response: 'declined' })).toEqual({ ok: false, reason: 'closed' });
    expect(await rsvpRows(guest.id)).toEqual([expect.objectContaining({ response: 'attending', party_size: 2 })]);
  });

  it('is closed for a guest who never answered, too', async () => {
    const fixture = await newEvent('published');
    const guest = await addGuest(fixture);
    await endEvent(fixture.eventId);
    expect(await submit(guest.token)).toEqual({ ok: false, reason: 'closed' });
    expect(await rsvpRows(guest.id)).toHaveLength(0);
  });

  it('is still open until the very end of the event', async () => {
    const fixture = await newEvent('published');
    const guest = await addGuest(fixture);
    await asService(db, () =>
      db.query(`update a41_events set starts_at = now() - interval '2 hours', ends_at = now() + interval '1 minute' where id = $1`, [fixture.eventId]),
    );
    expect(await submit(guest.token)).toMatchObject({ ok: true });
  });

  it.each(['draft', 'archived'] as const)('does nothing while the event is %s', async (status) => {
    const fixture = await newEvent('published');
    const guest = await addGuest(fixture);
    await setStatus(fixture.eventId, status);
    expect(await submit(guest.token)).toEqual({ ok: false, reason: 'not_found' });
    expect(await rsvpRows(guest.id)).toHaveLength(0);
  });

  it('answers a made-up token exactly like a draft event, whatever else is wrong with the request', async () => {
    const fixture = await newEvent('draft');
    const guest = await addGuest(fixture);
    const notFound = { ok: false, reason: 'not_found' };
    expect(await submit('0'.repeat(64))).toEqual(notFound);
    expect(await submit(guest.token)).toEqual(notFound);
    expect(await submit('0'.repeat(64), { response: 'maybe', partySize: 99 })).toEqual(notFound);
    expect(await submit(guest.token, { response: 'maybe', partySize: 99 })).toEqual(notFound);
    expect(await submit('')).toEqual(notFound);
  });

  it("only ever writes the answer of the guest whose token it is", async () => {
    const fixture = await newEvent('published');
    const first = await addGuest(fixture, 'First');
    const second = await addGuest(fixture, 'Second');
    await submit(first.token, { response: 'attending', partySize: 2 });

    expect(await rsvpRows(first.id)).toHaveLength(1);
    expect(await rsvpRows(second.id)).toHaveLength(0);
    expect(await guestStatus(second.id)).toBe('invited');
  });

  it('does not let a token from another event reach this one', async () => {
    const eventA = await newEvent('published');
    const eventB = await newEvent('published');
    const guestA = await addGuest(eventA);
    const guestB = await addGuest(eventB);
    await submit(guestA.token);
    expect((await rsvpRows(guestA.id))[0]).toMatchObject({ event_id: eventA.eventId });
    expect(await rsvpRows(guestB.id)).toHaveLength(0);
  });

  it('keeps a checked-in guest checked in when they change their answer', async () => {
    const fixture = await newEvent('published');
    const guest = await addGuest(fixture);
    await submit(guest.token);
    await asUser(db, fixture.staff, () => db.query('insert into a41_checkins (guest_id, event_id) values ($1, $2)', [guest.id, fixture.eventId]));
    await submit(guest.token, { response: 'declined' });
    expect(await guestStatus(guest.id)).toBe('checked_in');
  });

  it('is not a way around the tables: anon still cannot read or write answers directly', async () => {
    const fixture = await newEvent('published');
    const guest = await addGuest(fixture);
    await submit(guest.token);
    await expect(asAnon(db, () => db.query('select * from a41_rsvps'))).rejects.toThrow(/permission denied/);
    await expect(
      asAnon(db, () =>
        db.query(`insert into a41_rsvps (guest_id, event_id, response) values ($1, $2, 'attending')`, [guest.id, fixture.eventId]),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(asAnon(db, () => db.query(`update a41_rsvps set response = 'declined'`))).rejects.toThrow(/permission denied/);
  });
});

describe('who can call what', () => {
  it('keeps the helpers private', async () => {
    for (const call of [
      `select a41_private.public_event_json(null::public.a41_events)`,
      `select a41_private.clean_text(' x ')`,
      `select * from a41_private.guest_by_token('x')`,
    ]) {
      await expect(asAnon(db, () => db.query(call))).rejects.toThrow(/permission denied/);
    }
  });

  it('lets guests and signed-in users call the three public functions and nobody else is locked out', async () => {
    const calls = [
      `select public.a41_public_event('x')`,
      `select public.a41_open_invitation('x')`,
      `select public.a41_submit_rsvp('x', 'attending', 1, null, null)`,
    ];
    for (const call of calls) {
      await expect(asAnon(db, () => db.query(call))).resolves.toBeDefined();
      await expect(asUser(db, await newUser(), () => db.query(call))).resolves.toBeDefined();
    }
  });

  it('keeps every public function pinned to an empty search path and running as its owner', async () => {
    const { rows } = await db.query<{ proname: string; prosecdef: boolean; proconfig: string[] | null }>(
      `select proname, prosecdef, proconfig from pg_proc
       where pronamespace = 'public'::regnamespace and proname in ('a41_public_event', 'a41_open_invitation', 'a41_submit_rsvp')`,
    );
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.prosecdef).toBe(true);
      expect(row.proconfig).toContain('search_path=""');
    }
  });
});

describe('the app reads what the functions return', () => {
  // The pages parse the functions' JSON with zod. These tests feed it the real output.
  it('reads the public event, the invitation with and without an answer, and every kind of outcome', async () => {
    const fixture = await newEvent('published');
    const guest = await addGuest(fixture);

    expect(parsePublicEvent(await publicEvent(fixture.slug))).toMatchObject({
      slug: fixture.slug,
      venueName: 'Grand Ballroom',
      theme: { preset: 'gala', font: 'classic' },
    });

    expect(parseInvitation(await openInvitation(guest.token))).toMatchObject({ guestName: 'Dewi Lestari', tableNo: 'A7', rsvp: null, rsvpOpen: true });
    expect(parseSubmitResult(await submit(guest.token, { partySize: 3, meal: 'Halal' }))).toMatchObject({ ok: true, rsvp: { partySize: 3 } });
    expect(parseInvitation(await openInvitation(guest.token))).toMatchObject({ rsvp: { response: 'attending', mealPreference: 'Halal' } });

    expect(parseSubmitResult(await submit(guest.token, { partySize: 99 }))).toEqual({ ok: false, reason: 'invalid', field: 'party_size' });
    expect(parseSubmitResult(await submit('0'.repeat(64)))).toEqual({ ok: false, reason: 'not_found' });
    await endEvent(fixture.eventId);
    expect(parseSubmitResult(await submit(guest.token))).toEqual({ ok: false, reason: 'closed' });
  });
});

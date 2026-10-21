import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { addGuests, failure, newEvent, newFixture, newUser, rpc, type Fixture } from './checkin-fixtures';
import { asAnon, asUser, createDb } from './harness';

let db: PGlite;

beforeAll(async () => {
  db = await createDb();
});

interface Card {
  outcome: string;
  checked_in_at?: string;
  event_name?: string;
  guest?: { id: string; name: string; table_no: string | null; tags: string[]; party_size: number | null; response: string | null };
}

const scan = (user: string, eventId: string, token: string) =>
  rpc<Card>(db, user, 'a41_check_in_by_token($1, $2)', [eventId, token]);
const checkIn = (user: string, eventId: string, guestId: string) =>
  rpc<Card>(db, user, 'a41_check_in_guest($1, $2)', [eventId, guestId]);
const undo = (user: string, eventId: string, guestId: string) =>
  rpc<boolean>(db, user, 'a41_undo_check_in($1, $2)', [eventId, guestId]);
const stats = (user: string, eventId: string, recent = 8) =>
  rpc<{
    total_guests: number;
    checked_in: number;
    attending: number;
    attending_checked_in: number;
    recent: { guest_id: string; name: string; table_no: string | null; checked_in_at: string }[];
  }>(db, user, 'a41_checkin_stats($1, $2)', [eventId, recent]);
const search = (user: string, eventId: string, query: string) =>
  rpc<{ id: string; name: string; email: string | null; phone: string | null; checked_in_at: string | null }[]>(
    db,
    user,
    'a41_search_checkin_guests($1, $2)',
    [eventId, query],
  );

const statusOf = async (guestId: string) =>
  (await db.query<{ status: string }>('select status from a41_guests where id = $1', [guestId])).rows[0].status;
const checkinCount = async (eventId: string) =>
  (await db.query<{ n: number }>('select count(*)::int as n from a41_checkins where event_id = $1', [eventId])).rows[0].n;

describe('scanning a pass', () => {
  let f: Fixture;
  beforeAll(async () => {
    f = await newFixture(db, 4);
  });

  it('lets staff check a guest in and shows the card', async () => {
    const guest = f.guests[0];
    await db.query(`update a41_guests set tags = '{VIP,Board}' where id = $1`, [guest.id]);

    const card = await scan(f.staff, f.eventId, guest.token);

    expect(card.outcome).toBe('checked_in');
    expect(card.guest).toMatchObject({ id: guest.id, name: guest.name, table_no: 'T1', tags: ['VIP', 'Board'] });
    expect(card.checked_in_at).toBeTruthy();
    expect(await statusOf(guest.id)).toBe('checked_in');

    const { rows } = await db.query<{ checked_in_by: string }>('select checked_in_by from a41_checkins where guest_id = $1', [guest.id]);
    expect(rows[0].checked_in_by).toBe(f.staff);
  });

  it('lets an owner check a guest in', async () => {
    expect((await scan(f.owner, f.eventId, f.guests[1].token)).outcome).toBe('checked_in');
  });

  it('is idempotent: a double scan changes nothing and the first time wins', async () => {
    const guest = f.guests[2];
    const first = await scan(f.staff, f.eventId, guest.token);
    const second = await scan(f.owner, f.eventId, guest.token);

    expect(first.outcome).toBe('checked_in');
    expect(second.outcome).toBe('already_checked_in');
    expect(new Date(second.checked_in_at!).getTime()).toBe(new Date(first.checked_in_at!).getTime());
    const { rows } = await db.query('select 1 from a41_checkins where guest_id = $1', [guest.id]);
    expect(rows).toHaveLength(1);
  });

  it('shows the party size and answer of a guest who responded', async () => {
    const guest = f.guests[3];
    await db.query(`insert into a41_rsvps (guest_id, event_id, response, party_size) values ($1, $2, 'attending', 3)`, [guest.id, f.eventId]);
    const card = await scan(f.staff, f.eventId, guest.token);
    expect(card.guest).toMatchObject({ party_size: 3, response: 'attending' });
  });

  it('works while the event is still a draft', async () => {
    const draft = await newFixture(db, 1, { published: false });
    expect((await scan(draft.staff, draft.eventId, draft.guests[0].token)).outcome).toBe('checked_in');
  });

  it('reports a pass from another event of the same organization without checking it in', async () => {
    const otherEvent = await newEvent(db, f.owner, f.orgId, 'Summer Party');
    const [stranger] = await addGuests(db, f.owner, otherEvent, 1, 'Visitor');

    const card = await scan(f.staff, f.eventId, stranger.token);

    expect(card).toEqual({ outcome: 'other_event', event_name: 'Summer Party' });
    expect(await checkinCount(otherEvent)).toBe(0);
  });

  it('does not reveal a pass that belongs to another organization', async () => {
    const elsewhere = await newFixture(db, 1);
    const card = await scan(f.staff, f.eventId, elsewhere.guests[0].token);
    expect(card).toEqual({ outcome: 'unknown' });
    expect(await checkinCount(elsewhere.eventId)).toBe(0);
  });

  it('does not know a token that does not exist, or one that is far too short or long', async () => {
    expect(await scan(f.staff, f.eventId, '0'.repeat(64))).toEqual({ outcome: 'unknown' });
    expect(await scan(f.staff, f.eventId, 'abc')).toEqual({ outcome: 'unknown' });
    expect(await scan(f.staff, f.eventId, 'x'.repeat(500))).toEqual({ outcome: 'unknown' });
  });

  it('refuses people who are not members of the event, whatever they send', async () => {
    const outsider = await newUser(db);
    const guest = (await newFixture(db, 1)).guests[0];
    const other = await newFixture(db, 1);

    for (const run of [
      () => scan(outsider, f.eventId, guest.token),
      () => checkIn(outsider, f.eventId, f.guests[0].id),
      () => stats(outsider, f.eventId),
      () => search(outsider, f.eventId, 'Guest'),
      // a member of another organization, using the other organization's event id on this one's guest
      () => scan(other.staff, f.eventId, f.guests[0].token),
    ]) {
      expect(await failure(run)).toMatchObject({ code: '42501', message: 'forbidden' });
    }
    expect(await checkinCount(other.eventId)).toBe(0);
  });

  it('is not callable by anon', async () => {
    const calls = [
      ['a41_check_in_by_token($1, $2)', [f.eventId, f.guests[0].token]],
      ['a41_check_in_guest($1, $2)', [f.eventId, f.guests[0].id]],
      ['a41_checkin_stats($1, 8)', [f.eventId]],
      ['a41_search_checkin_guests($1, $2)', [f.eventId, 'guest']],
      ['a41_add_walk_in($1, $2)', [f.eventId, 'Walker']],
    ] as const;
    for (const [call, params] of calls) {
      expect(await failure(() => asAnon(db, () => db.query(`select ${call}`, [...params])))).toMatchObject({ code: '42501' });
    }
  });
});

describe('checking in by hand', () => {
  it('checks a guest in, once', async () => {
    const f = await newFixture(db, 2);
    expect((await checkIn(f.staff, f.eventId, f.guests[0].id)).outcome).toBe('checked_in');
    expect((await checkIn(f.staff, f.eventId, f.guests[0].id)).outcome).toBe('already_checked_in');
  });

  it("does not check in another event's guest through this event", async () => {
    const f = await newFixture(db, 1);
    const other = await newFixture(db, 1);
    // the staff member belongs to neither guest's event for the second, and the guest is not in this event for the first
    expect(await checkIn(f.owner, f.eventId, other.guests[0].id)).toEqual({ outcome: 'unknown' });
    expect(await checkinCount(other.eventId)).toBe(0);

    const sibling = await newEvent(db, f.owner, f.orgId, 'Sibling');
    const [guest] = await addGuests(db, f.owner, sibling, 1, 'Sibling guest');
    expect(await checkIn(f.owner, f.eventId, guest.id)).toEqual({ outcome: 'unknown' });
    expect(await checkinCount(sibling)).toBe(0);
  });
});

describe('the check-in table itself', () => {
  it('rejects a direct insert from someone outside the event and from anon', async () => {
    const f = await newFixture(db, 1);
    const outsider = await newUser(db);
    const insert = () => db.query('insert into a41_checkins (guest_id, event_id) values ($1, $2)', [f.guests[0].id, f.eventId]);

    expect(await failure(() => asUser(db, outsider, insert))).toMatchObject({ code: '42501' });
    expect(await failure(() => asAnon(db, insert))).toMatchObject({ code: '42501' });
    expect(await checkinCount(f.eventId)).toBe(0);
  });

  it('cannot be edited by members', async () => {
    const f = await newFixture(db, 1);
    await scan(f.staff, f.eventId, f.guests[0].token);
    for (const user of [f.staff, f.owner]) {
      expect(
        await failure(() => asUser(db, user, () => db.query(`update a41_checkins set checked_in_at = now() - interval '1 day'`))),
      ).toMatchObject({ code: '42501' });
    }
  });

  it('does not let a member choose who checked in, or when', async () => {
    const f = await newFixture(db, 1);
    const colleague = f.owner;
    expect(
      await failure(() =>
        asUser(db, f.staff, () =>
          db.query('insert into a41_checkins (guest_id, event_id, checked_in_by) values ($1, $2, $3)', [f.guests[0].id, f.eventId, colleague]),
        ),
      ),
    ).toMatchObject({ code: '42501' });
    expect(
      await failure(() =>
        asUser(db, f.staff, () =>
          db.query(`insert into a41_checkins (guest_id, event_id, checked_in_at) values ($1, $2, now() - interval '2 days')`, [f.guests[0].id, f.eventId]),
        ),
      ),
    ).toMatchObject({ code: '42501' });
  });

  it("hides one organization's check-ins from another", async () => {
    const a = await newFixture(db, 1);
    const b = await newFixture(db, 1);
    await scan(a.staff, a.eventId, a.guests[0].token);
    const { rows } = await asUser(db, b.owner, () => db.query('select * from a41_checkins'));
    expect(rows).toEqual([]);
    expect((await asAnon(db, () => db.query('select 1 from a41_checkins').catch((error) => ({ error })))) as unknown).toHaveProperty('error');
  });
});

describe('undoing a check-in', () => {
  it('lets an owner undo it and puts the guest back where they were', async () => {
    const f = await newFixture(db, 2);
    const [responded, silent] = f.guests;
    await db.query(`insert into a41_rsvps (guest_id, event_id, response) values ($1, $2, 'attending')`, [responded.id, f.eventId]);
    await db.query(`update a41_guests set status = 'opened' where id = $1`, [silent.id]);
    await scan(f.staff, f.eventId, responded.token);
    await scan(f.staff, f.eventId, silent.token);
    expect(await statusOf(responded.id)).toBe('checked_in');
    expect(await statusOf(silent.id)).toBe('checked_in');

    for (const guest of [responded, silent]) {
      expect(await undo(f.owner, f.eventId, guest.id)).toBe(true);
    }

    expect(await statusOf(responded.id)).toBe('rsvp');
    expect(await statusOf(silent.id)).toBe('opened');
    expect(await checkinCount(f.eventId)).toBe(0);
    // and the guest can be scanned in again
    expect((await scan(f.staff, f.eventId, silent.token)).outcome).toBe('checked_in');
  });

  it('puts back "responded" when the answer came after the check-in', async () => {
    const f = await newFixture(db, 1);
    const [guest] = f.guests;
    await scan(f.staff, f.eventId, guest.token);
    await db.query(`insert into a41_rsvps (guest_id, event_id, response) values ($1, $2, 'attending')`, [guest.id, f.eventId]);
    expect(await statusOf(guest.id)).toBe('checked_in');
    expect(await undo(f.owner, f.eventId, guest.id)).toBe(true);
    expect(await statusOf(guest.id)).toBe('rsvp');
  });

  it('does not let staff, other organizations or anon undo it', async () => {
    const f = await newFixture(db, 1);
    const other = await newFixture(db, 1);
    await scan(f.staff, f.eventId, f.guests[0].token);

    for (const user of [f.staff, other.owner]) {
      expect(await failure(() => undo(user, f.eventId, f.guests[0].id))).toMatchObject({ code: '42501', message: 'forbidden' });
    }
    expect(await failure(() => asAnon(db, () => db.query('select a41_undo_check_in($1, $2)', [f.eventId, f.guests[0].id])))).toMatchObject({ code: '42501' });
    expect(await checkinCount(f.eventId)).toBe(1);
    expect(await statusOf(f.guests[0].id)).toBe('checked_in');
  });

  it('keeps the table closed: nobody deletes a check-in straight from it, not even the owner', async () => {
    const f = await newFixture(db, 1);
    await scan(f.staff, f.eventId, f.guests[0].token);

    for (const user of [f.owner, f.staff]) {
      expect(await failure(() => asUser(db, user, () => db.query('delete from a41_checkins where guest_id = $1', [f.guests[0].id])))).toMatchObject({
        code: '42501',
      });
    }
    expect(await failure(() => asAnon(db, () => db.query('delete from a41_checkins')))).toMatchObject({ code: '42501' });
    expect(await checkinCount(f.eventId)).toBe(1);
  });

  it('says false when the guest is not checked in, and leaves other guests alone', async () => {
    const f = await newFixture(db, 2);
    await scan(f.staff, f.eventId, f.guests[0].token);
    expect(await undo(f.owner, f.eventId, f.guests[1].id)).toBe(false);
    expect(await undo(f.owner, f.eventId, f.guests[0].id)).toBe(true);
    expect(await undo(f.owner, f.eventId, f.guests[0].id)).toBe(false);
  });

  it('only undoes the guest on the event it is asked about', async () => {
    const f = await newFixture(db, 1);
    const g = await newFixture(db, 1);
    await scan(g.staff, g.eventId, g.guests[0].token);
    // the owner of the first event names the guest of the second: nothing is removed
    expect(await undo(f.owner, f.eventId, g.guests[0].id)).toBe(false);
    expect(await checkinCount(g.eventId)).toBe(1);
  });

  it('is removed with the guest', async () => {
    const f = await newFixture(db, 1);
    await scan(f.staff, f.eventId, f.guests[0].token);
    await asUser(db, f.owner, () => db.query('delete from a41_guests where id = $1', [f.guests[0].id]));
    expect(await checkinCount(f.eventId)).toBe(0);
  });
});

describe('walk-ins', () => {
  it('lets an owner add a guest at the door and checks them in', async () => {
    const f = await newFixture(db, 1);
    const card = await rpc<Card>(db, f.owner, 'a41_add_walk_in($1, $2, $3, $4, $5)', [f.eventId, '  Pak Hendra ', '+6281234567890', 'HENDRA@Example.com', ' T9 ']);

    expect(card.outcome).toBe('checked_in');
    expect(card.guest).toMatchObject({ name: 'Pak Hendra', table_no: 'T9', tags: ['walk-in'] });
    const { rows } = await db.query<{ status: string; email: string; phone: string }>('select status, email, phone from a41_guests where id = $1', [card.guest!.id]);
    expect(rows[0]).toEqual({ status: 'checked_in', email: 'hendra@example.com', phone: '+6281234567890' });
    expect(await checkinCount(f.eventId)).toBe(1);
  });

  it('needs only a name', async () => {
    const f = await newFixture(db, 0);
    const card = await rpc<Card>(db, f.owner, 'a41_add_walk_in($1, $2)', [f.eventId, 'Someone']);
    expect(card.guest).toMatchObject({ name: 'Someone', table_no: null });
  });

  it('is for owners: staff, outsiders and anon cannot add guests', async () => {
    const f = await newFixture(db, 0);
    const outsider = await newUser(db);
    for (const user of [f.staff, outsider]) {
      expect(await failure(() => rpc(db, user, 'a41_add_walk_in($1, $2)', [f.eventId, 'Sneaky']))).toMatchObject({ code: '42501', message: 'forbidden' });
    }
    expect(await failure(() => asAnon(db, () => db.query('select a41_add_walk_in($1, $2)', [f.eventId, 'Sneaky'])))).toMatchObject({ code: '42501' });
    expect((await db.query('select 1 from a41_guests where event_id = $1', [f.eventId])).rows).toHaveLength(0);
  });

  it('respects the paid capacity and leaves nothing behind when the list is full', async () => {
    // a Plus event holds 300 guests: fill it to the brim, then try one more
    const full = await newFixture(db, 5);
    await asUser(db, full.owner, () =>
      db.query(`insert into a41_guests (event_id, name) select $1, 'Filler ' || g from generate_series(1, 295) g`, [full.eventId]),
    );
    expect(await failure(() => rpc(db, full.owner, 'a41_add_walk_in($1, $2)', [full.eventId, 'One too many']))).toMatchObject({
      code: '23514',
      message: 'guest_capacity_exceeded',
    });
    const { rows } = await db.query('select 1 from a41_guests where event_id = $1', [full.eventId]);
    expect(rows).toHaveLength(300);
    expect(await checkinCount(full.eventId)).toBe(0);
  });

  it('refuses a phone number or email that is already on the list, and creates nothing', async () => {
    const f = await newFixture(db, 1);
    await db.query(`update a41_guests set phone = '+6281200000001', email = 'a@example.com' where id = $1`, [f.guests[0].id]);

    const phone = await failure(() => rpc(db, f.owner, 'a41_add_walk_in($1, $2, $3)', [f.eventId, 'Twin', '+6281200000001']));
    const email = await failure(() => rpc(db, f.owner, 'a41_add_walk_in($1, $2, null, $3)', [f.eventId, 'Twin', 'A@example.com']));

    expect(phone).toMatchObject({ code: '23505' });
    expect(phone?.message).toContain('a41_guests_event_phone_key');
    expect(email).toMatchObject({ code: '23505' });
    expect(email?.message).toContain('a41_guests_event_email_key');
    expect((await db.query('select 1 from a41_guests where event_id = $1', [f.eventId])).rows).toHaveLength(1);
  });

  it('refuses a blank name and a malformed phone', async () => {
    const f = await newFixture(db, 0);
    expect(await failure(() => rpc(db, f.owner, 'a41_add_walk_in($1, $2)', [f.eventId, '   ']))).toMatchObject({ code: '23514' });
    expect(await failure(() => rpc(db, f.owner, 'a41_add_walk_in($1, $2, $3)', [f.eventId, 'Valid', '0812']))).toMatchObject({ code: '23514' });
  });
});

describe('live numbers', () => {
  it('counts guests, answers and check-ins, and lists the latest first', async () => {
    const f = await newFixture(db, 6);
    const [a, b, c, d] = f.guests;
    await db.query(`insert into a41_rsvps (guest_id, event_id, response) values ($1, $4, 'attending'), ($2, $4, 'attending'), ($3, $4, 'declined')`, [a.id, b.id, c.id, f.eventId]);

    await checkIn(f.staff, f.eventId, a.id); // attending
    await checkIn(f.staff, f.eventId, c.id); // declined, came anyway
    await checkIn(f.staff, f.eventId, d.id); // never answered
    await db.query(`update a41_checkins set checked_in_at = now() - interval '1 hour' where guest_id = $1`, [a.id]);

    const numbers = await stats(f.staff, f.eventId, 2);

    expect(numbers).toMatchObject({ total_guests: 6, checked_in: 3, attending: 2, attending_checked_in: 1 });
    expect(numbers.recent).toHaveLength(2);
    expect(numbers.recent.map((row) => row.guest_id)).not.toContain(a.id);
    expect(new Date(numbers.recent[0].checked_in_at).getTime()).toBeGreaterThanOrEqual(new Date(numbers.recent[1].checked_in_at).getTime());
    expect(numbers.recent[0]).toHaveProperty('name');
    expect(numbers.recent[0]).toHaveProperty('table_no');
  });

  it('never counts another event', async () => {
    const f = await newFixture(db, 2);
    const other = await newFixture(db, 3);
    await checkIn(other.staff, other.eventId, other.guests[0].id);
    expect(await stats(f.owner, f.eventId)).toMatchObject({ total_guests: 2, checked_in: 0, attending: 0, recent: [] });
  });

  it('bounds the recent list', async () => {
    const f = await newFixture(db, 3);
    for (const guest of f.guests) await checkIn(f.staff, f.eventId, guest.id);
    expect((await stats(f.staff, f.eventId, 0)).recent).toHaveLength(1);
    expect((await stats(f.staff, f.eventId, 1000)).recent).toHaveLength(3);
  });
});

describe('searching the guest list', () => {
  let f: Fixture;
  beforeAll(async () => {
    f = await newFixture(db, 0);
    await asUser(db, f.owner, () =>
      db.query(
        `insert into a41_guests (event_id, name, email, phone, table_no) values
          ($1, 'Dewi Sartika', 'dewi@acme.example', '+628123456789', '1'),
          ($1, 'Andewi Putra', 'andewi@other.example', '+628777000111', '2'),
          ($1, 'Budi Santoso', null, '+6281399988877', '3'),
          ($1, 'Rina 100%', null, null, null)`,
        [f.eventId],
      ),
    );
  });

  const names = (rows: { name: string }[]) => rows.map((row) => row.name);

  it('finds a guest by any word of the name, in any order, ignoring case', async () => {
    expect(names(await search(f.staff, f.eventId, 'sartika dewi'))).toEqual(['Dewi Sartika']);
    expect(names(await search(f.staff, f.eventId, 'BUDI'))).toEqual(['Budi Santoso']);
  });

  it('puts names that start with the search first', async () => {
    expect(names(await search(f.staff, f.eventId, 'dewi'))).toEqual(['Dewi Sartika', 'Andewi Putra']);
  });

  it('finds a guest by email', async () => {
    expect(names(await search(f.staff, f.eventId, 'other.example'))).toEqual(['Andewi Putra']);
  });

  it('finds a guest by phone however it is typed', async () => {
    expect(names(await search(f.staff, f.eventId, '0812 3456'))).toEqual(['Dewi Sartika']);
    expect(names(await search(f.staff, f.eventId, '+62 813-999'))).toEqual(['Budi Santoso']);
    expect(names(await search(f.staff, f.eventId, '88877'))).toEqual(['Budi Santoso']);
  });

  it('treats the search as text, not as a pattern', async () => {
    expect(await search(f.staff, f.eventId, '%%')).toEqual([]);
    expect(await search(f.staff, f.eventId, '__')).toEqual([]);
    expect(names(await search(f.staff, f.eventId, '100%'))).toEqual(['Rina 100%']);
  });

  it('answers nothing to a query that is too short, or to two digits', async () => {
    expect(await search(f.staff, f.eventId, 'd')).toEqual([]);
    expect(await search(f.staff, f.eventId, '')).toEqual([]);
    expect(await search(f.staff, f.eventId, '81')).toEqual([]);
  });

  it('shows whether the guest is already checked in', async () => {
    const [dewi] = await search(f.staff, f.eventId, 'sartika');
    expect(dewi.checked_in_at).toBeNull();
    await checkIn(f.staff, f.eventId, dewi.id);
    expect((await search(f.staff, f.eventId, 'sartika'))[0].checked_in_at).toBeTruthy();
  });

  it('only searches this event, and returns at most 20 guests', async () => {
    const other = await newFixture(db, 0);
    await asUser(db, other.owner, () => db.query(`insert into a41_guests (event_id, name) values ($1, 'Dewi Elsewhere')`, [other.eventId]));
    expect(names(await search(f.staff, f.eventId, 'elsewhere'))).toEqual([]);

    const big = await newFixture(db, 30, { published: false });
    expect(await search(big.staff, big.eventId, 'guest')).toHaveLength(20);
  });
});

describe('event removal', () => {
  it('takes the check-ins with it when a Free event is deleted', async () => {
    const f = await newFixture(db, 1, { free: true });
    await scan(f.staff, f.eventId, f.guests[0].token);
    await asUser(db, f.owner, () => db.query('delete from a41_events where id = $1', [f.eventId]));
    expect(await checkinCount(f.eventId)).toBe(0);
  });
});

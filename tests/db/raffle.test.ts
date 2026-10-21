import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { addGuests, failure, newEvent, newFixture, newUser, rpc, type Fixture } from './checkin-fixtures';
import { asAnon, asService, asUser, createDb } from './harness';

let db: PGlite;

beforeAll(async () => {
  db = await createDb();
});

interface Prize {
  id: string;
  name: string;
  quantity: number;
  awarded: number;
  sort_order?: number;
}
interface Draw {
  draw: { id: string; status: string; drawn_at: string };
  guest: { name: string; table_no: string | null; tags: string[] };
  prize: Prize;
  remaining: number;
  decoys: string[];
}

const addPrize = async (f: Fixture, name = 'Smart TV', quantity = 1, sortOrder = 0): Promise<string> =>
  asUser(db, f.owner, async () => {
    const { rows } = await db.query<{ id: string }>(
      `insert into a41_raffle_prizes (event_id, name, quantity, sort_order) values ($1, $2, $3, $4) returning id`,
      [f.eventId, name, quantity, sortOrder],
    );
    return rows[0].id;
  });

const checkInAll = async (f: Fixture, count = f.guests.length) => {
  for (const guest of f.guests.slice(0, count)) {
    await rpc(db, f.staff, 'a41_check_in_guest($1, $2)', [f.eventId, guest.id]);
  }
};

const draw = (user: string, prizeId: string) => rpc<Draw>(db, user, 'a41_draw_raffle_winner($1)', [prizeId]);
const forfeit = (user: string, drawId: string) =>
  rpc<{ draw_id: string; prize: Prize; remaining: number }>(db, user, 'a41_forfeit_raffle_draw($1)', [drawId]);
const summary = (user: string, eventId: string) =>
  rpc<{ checked_in: number; remaining: number; prizes: Prize[] }>(db, user, 'a41_raffle_summary($1)', [eventId]);
const log = (user: string, eventId: string) =>
  rpc<
    {
      id: string;
      status: string;
      prize_name: string;
      guest_name: string;
      drawn_by_email: string | null;
      resolved_by_email: string | null;
      resolved_at: string | null;
    }[]
  >(db, user, 'a41_raffle_log($1)', [eventId]);

const drawRows = async (eventId: string) =>
  (await db.query<{ guest_id: string | null; guest_name: string; status: string; prize_id: string }>(
    'select guest_id, guest_name, status, prize_id from a41_raffle_draws where event_id = $1 order by drawn_at, id',
    [eventId],
  )).rows;

describe('prizes', () => {
  let f: Fixture;
  beforeAll(async () => {
    f = await newFixture(db, 2);
  });

  it('are managed by owners', async () => {
    const id = await addPrize(f, 'Voucher', 5, 2);
    await asUser(db, f.owner, () => db.query(`update a41_raffle_prizes set name = 'Big voucher', quantity = 6, sort_order = 1 where id = $1`, [id]));
    const { rows } = await db.query<Prize>('select name, quantity, sort_order from a41_raffle_prizes where id = $1', [id]);
    expect(rows[0]).toMatchObject({ name: 'Big voucher', quantity: 6, sort_order: 1 });

    await asUser(db, f.owner, () => db.query('delete from a41_raffle_prizes where id = $1', [id]));
    expect((await db.query('select 1 from a41_raffle_prizes where id = $1', [id])).rows).toHaveLength(0);
  });

  it('can be read by staff but not changed', async () => {
    const id = await addPrize(f, 'Headphones');
    const { rows } = await asUser(db, f.staff, () => db.query('select name from a41_raffle_prizes where id = $1', [id]));
    expect(rows).toEqual([{ name: 'Headphones' }]);

    expect(
      await failure(() =>
        asUser(db, f.staff, () => db.query(`insert into a41_raffle_prizes (event_id, name) values ($1, 'Sneaky')`, [f.eventId])),
      ),
    ).toMatchObject({ code: '42501' });

    const updated = await asUser(db, f.staff, () => db.query(`update a41_raffle_prizes set name = 'Mine' where id = $1 returning id`, [id]));
    expect(updated.rows).toEqual([]);
    const deleted = await asUser(db, f.staff, () => db.query('delete from a41_raffle_prizes where id = $1 returning id', [id]));
    expect(deleted.rows).toEqual([]);
    expect((await db.query<{ name: string }>('select name from a41_raffle_prizes where id = $1', [id])).rows[0].name).toBe('Headphones');
  });

  it("are invisible to and untouchable by another organization's members", async () => {
    const other = await newFixture(db, 1);
    const id = await addPrize(f, 'Secret prize');
    expect((await asUser(db, other.owner, () => db.query('select * from a41_raffle_prizes'))).rows.map((row) => (row as { id: string }).id)).not.toContain(id);

    expect(
      await failure(() =>
        asUser(db, other.owner, () => db.query(`insert into a41_raffle_prizes (event_id, name) values ($1, 'Hijack')`, [f.eventId])),
      ),
    ).toMatchObject({ code: '42501' });
    const updated = await asUser(db, other.owner, () => db.query(`update a41_raffle_prizes set quantity = 99 where id = $1 returning id`, [id]));
    expect(updated.rows).toEqual([]);
  });

  it('cannot be read or written by anon', async () => {
    expect(await failure(() => asAnon(db, () => db.query('select * from a41_raffle_prizes')))).toMatchObject({ code: '42501' });
    expect(
      await failure(() => asAnon(db, () => db.query(`insert into a41_raffle_prizes (event_id, name) values ($1, 'x')`, [f.eventId]))),
    ).toMatchObject({ code: '42501' });
  });

  it('keep their event and creation time out of owners reach', async () => {
    const id = await addPrize(f, 'Fixed');
    const other = await newEvent(db, f.owner, f.orgId, 'Sibling');
    expect(
      await failure(() => asUser(db, f.owner, () => db.query('update a41_raffle_prizes set event_id = $2 where id = $1', [id, other]))),
    ).toMatchObject({ code: '42501' });
    expect(
      await failure(() => asUser(db, f.owner, () => db.query(`update a41_raffle_prizes set created_at = now() where id = $1`, [id]))),
    ).toMatchObject({ code: '42501' });
  });

  it('need a name and a sensible quantity', async () => {
    for (const [name, quantity] of [['', 1], ['x'.repeat(121), 1], ['Prize', 0], ['Prize', -1], ['Prize', 501]] as const) {
      expect(await failure(() => addPrize(f, name, quantity))).toMatchObject({ code: '23514' });
    }
  });

  it('are limited to 100 per event', async () => {
    const small = await newFixture(db, 0);
    await asUser(db, small.owner, () =>
      db.query(`insert into a41_raffle_prizes (event_id, name) select $1, 'Prize ' || g from generate_series(1, 100) g`, [small.eventId]),
    );
    expect(await failure(() => addPrize(small, 'One more'))).toMatchObject({ code: '23514', message: 'raffle_prize_limit' });
  });

  it('cannot give out fewer than they already have', async () => {
    const g = await newFixture(db, 3);
    await checkInAll(g);
    const prize = await addPrize(g, 'Vouchers', 3);
    await draw(g.staff, prize);
    await draw(g.staff, prize);

    expect(
      await failure(() => asUser(db, g.owner, () => db.query('update a41_raffle_prizes set quantity = 1 where id = $1', [prize]))),
    ).toMatchObject({ code: '23514', message: 'prize_quantity_below_awarded' });
    await asUser(db, g.owner, () => db.query('update a41_raffle_prizes set quantity = 2 where id = $1', [prize]));
    expect((await summary(g.owner, g.eventId)).prizes[0]).toMatchObject({ quantity: 2, awarded: 2 });
  });

  it('cannot be deleted once they have been drawn, but can before', async () => {
    const g = await newFixture(db, 1);
    await checkInAll(g);
    const drawn = await addPrize(g, 'Drawn');
    const untouched = await addPrize(g, 'Untouched');
    await draw(g.staff, drawn);

    const blocked = await failure(() => asUser(db, g.owner, () => db.query('delete from a41_raffle_prizes where id = $1', [drawn])));
    expect(blocked).toMatchObject({ code: '23503' });
    await asUser(db, g.owner, () => db.query('delete from a41_raffle_prizes where id = $1', [untouched]));
    expect((await db.query('select 1 from a41_raffle_prizes where event_id = $1', [g.eventId])).rows).toHaveLength(1);
  });
});

describe('drawing a winner', () => {
  it('picks a checked-in guest and records who drew, when and for which prize', async () => {
    const f = await newFixture(db, 5);
    await checkInAll(f, 3);
    const prize = await addPrize(f, 'Smart TV');

    const result = await draw(f.staff, prize);

    const checkedIn = f.guests.slice(0, 3).map((guest) => guest.name);
    expect(checkedIn).toContain(result.guest.name);
    expect(result.draw.status).toBe('won');
    expect(result.prize).toEqual({ id: prize, name: 'Smart TV', quantity: 1, awarded: 1 });
    expect(result.remaining).toBe(2);

    const rows = await db.query<{ drawn_by: string; guest_table_no: string | null; event_id: string }>(
      'select drawn_by, guest_table_no, event_id from a41_raffle_draws where id = $1',
      [result.draw.id],
    );
    expect(rows.rows[0]).toMatchObject({ drawn_by: f.staff, event_id: f.eventId });
    expect(rows.rows[0].guest_table_no).toBe(result.guest.table_no);
  });

  it('lets owners draw too', async () => {
    const f = await newFixture(db, 2);
    await checkInAll(f);
    expect((await draw(f.owner, await addPrize(f))).draw.status).toBe('won');
  });

  it('never picks a guest who has not checked in', async () => {
    const f = await newFixture(db, 30);
    await checkInAll(f, 1);
    const prize = await addPrize(f, 'First', 1);
    // one guest has checked in: they can win, and a second prize has nobody left to go to
    expect((await draw(f.staff, prize)).guest.name).toBe(f.guests[0].name);
    const second = await addPrize(f, 'Second');
    expect(await failure(() => draw(f.staff, second))).toMatchObject({ message: 'no_eligible_guests' });
  });

  it('has nobody to draw when nobody checked in, and when check-ins were undone', async () => {
    const f = await newFixture(db, 3);
    const prize = await addPrize(f);
    expect(await failure(() => draw(f.staff, prize))).toMatchObject({ message: 'no_eligible_guests' });

    await checkInAll(f);
    await asUser(db, f.owner, () => db.query('delete from a41_checkins where event_id = $1', [f.eventId]));
    expect(await failure(() => draw(f.staff, prize))).toMatchObject({ message: 'no_eligible_guests' });
    expect(await drawRows(f.eventId)).toEqual([]);
  });

  it('never picks the same guest twice, across prizes', async () => {
    const f = await newFixture(db, 8);
    await checkInAll(f);
    const prizes = [await addPrize(f, 'A', 3, 1), await addPrize(f, 'B', 3, 2), await addPrize(f, 'C', 2, 3)];

    const winners: string[] = [];
    for (const [index, quantity] of [3, 3, 2].entries()) {
      for (let n = 0; n < quantity; n++) winners.push((await draw(f.staff, prizes[index])).guest.name);
    }

    expect(new Set(winners).size).toBe(8);
    expect([...winners].sort()).toEqual(f.guests.map((guest) => guest.name).sort());
    // the pool is empty now, whichever prize is asked
    const extra = await addPrize(f, 'D');
    expect(await failure(() => draw(f.staff, extra))).toMatchObject({ message: 'no_eligible_guests' });
  });

  it('stops at the quantity of the prize', async () => {
    const f = await newFixture(db, 5);
    await checkInAll(f);
    const prize = await addPrize(f, 'Vouchers', 2);
    await draw(f.staff, prize);
    const second = await draw(f.staff, prize);
    expect(second.prize.awarded).toBe(2);
    expect(await failure(() => draw(f.staff, prize))).toMatchObject({ message: 'prize_fully_awarded' });
    expect(await drawRows(f.eventId)).toHaveLength(2);
  });

  it('never draws from another event, and never reveals another organization prize', async () => {
    const f = await newFixture(db, 2);
    const other = await newFixture(db, 4);
    await checkInAll(other);
    const prize = await addPrize(f);
    // the other event's guests are all checked in, this event's none are
    expect(await failure(() => draw(f.staff, prize))).toMatchObject({ message: 'no_eligible_guests' });

    const theirs = await addPrize(other);
    for (const call of [
      () => draw(f.staff, theirs),
      () => draw(f.staff, '00000000-0000-4000-8000-000000000000'),
      async () => draw(await newUser(db), prize),
    ]) {
      expect(await failure(call)).toMatchObject({ message: 'prize_not_found' });
    }
    expect(await drawRows(other.eventId)).toEqual([]);
  });

  it('is only for signed-in members of the event', async () => {
    const f = await newFixture(db, 2);
    await checkInAll(f);
    const prize = await addPrize(f);
    expect(await failure(() => asAnon(db, () => db.query('select a41_draw_raffle_winner($1)', [prize])))).toMatchObject({ code: '42501' });
    // the server's own role is nobody's team member: it cannot draw either
    expect(await failure(() => asService(db, () => db.query('select a41_draw_raffle_winner($1)', [prize])))).not.toBeNull();
    expect(await drawRows(f.eventId)).toEqual([]);
  });

  it('gives the screen other names to spin through, never the winner', async () => {
    const f = await newFixture(db, 60);
    await checkInAll(f);
    const result = await draw(f.owner, await addPrize(f));
    expect(result.decoys).toHaveLength(40);
    expect(result.decoys).not.toContain(result.guest.name);
    expect(new Set(result.decoys).size).toBe(40);
    expect(result.remaining).toBe(59);
  });

  it('takes the per-event lock so two devices cannot draw at once', async () => {
    const f = await newFixture(db, 2);
    await checkInAll(f);
    const prize = await addPrize(f);
    await db.exec('begin');
    try {
      await db.exec('set local role authenticated');
      await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [f.staff]);
      await db.query('select a41_draw_raffle_winner($1)', [prize]);
      const { rows } = await db.query<{ n: number }>(
        `select count(*)::int as n from pg_locks where locktype = 'advisory' and pid = pg_backend_pid()`,
      );
      expect(rows[0].n).toBeGreaterThan(0);
    } finally {
      await db.exec('rollback');
    }
  });
});

describe('fairness', () => {
  it('gives every guest in the pool the same chance', async () => {
    const f = await newFixture(db, 3);
    await checkInAll(f);
    await addGuests(db, f.owner, f.eventId, 5, 'Absent'); // on the list but not here: never picked

    const trials = 900;
    const tally = new Map<string, number>();
    for (let n = 0; n < trials; n++) {
      const { rows } = await db.query<{ id: string }>('select a41_private.pick_raffle_guest($1) as id', [f.eventId]);
      tally.set(rows[0].id, (tally.get(rows[0].id) ?? 0) + 1);
    }

    expect([...tally.keys()].sort()).toEqual(f.guests.map((guest) => guest.id).sort());
    // 300 each on average; the spread (standard deviation 14) makes 90 more or less a 6-sigma bound
    for (const count of tally.values()) expect(Math.abs(count - trials / 3)).toBeLessThan(90);
  });

  it('does not favour the order guests were created or checked in', async () => {
    const f = await newFixture(db, 4);
    // check in in reverse order: the last created checks in first
    for (const guest of [...f.guests].reverse()) await rpc(db, f.staff, 'a41_check_in_guest($1, $2)', [f.eventId, guest.id]);

    const trials = 800;
    let first = 0;
    for (let n = 0; n < trials; n++) {
      const { rows } = await db.query<{ id: string }>('select a41_private.pick_raffle_guest($1) as id', [f.eventId]);
      if (rows[0].id === f.guests[0].id) first++;
    }
    // 200 expected, standard deviation 12
    expect(Math.abs(first - trials / 4)).toBeLessThan(80);
  });
});

describe('a winner who is not there', () => {
  it('forfeits the draw, frees the prize and is never drawn again', async () => {
    const f = await newFixture(db, 3);
    await checkInAll(f);
    const prize = await addPrize(f, 'Smart TV');

    const first = await draw(f.staff, prize);
    const forfeited = await forfeit(f.staff, first.draw.id);
    expect(forfeited.prize).toMatchObject({ awarded: 0, quantity: 1 });
    expect(forfeited.remaining).toBe(2);

    const second = await draw(f.staff, prize);
    expect(second.guest.name).not.toBe(first.guest.name);
    expect(second.prize.awarded).toBe(1);

    const rows = await drawRows(f.eventId);
    expect(rows.map((row) => row.status)).toEqual(['forfeited', 'won']);
    const { rows: audit } = await db.query<{ resolved_by: string; resolved_at: string }>(
      `select resolved_by, resolved_at from a41_raffle_draws where id = $1`,
      [first.draw.id],
    );
    expect(audit[0].resolved_by).toBe(f.staff);
    expect(audit[0].resolved_at).toBeTruthy();

    // a third draw cannot bring the absent guest back, even when only they are left
    const third = await addPrize(f, 'Voucher');
    const winner = await draw(f.staff, third);
    expect(new Set([first.guest.name, second.guest.name, winner.guest.name]).size).toBe(3);
    const nothingLeft = await addPrize(f, 'Nothing left');
    expect(await failure(() => draw(f.staff, nothingLeft))).toMatchObject({ message: 'no_eligible_guests' });
  });

  it('can only be forfeited once, so a second tap or device does not redraw', async () => {
    const f = await newFixture(db, 3);
    await checkInAll(f);
    const prize = await addPrize(f);
    const { draw: current } = await draw(f.staff, prize);

    await forfeit(f.staff, current.id);
    expect(await failure(() => forfeit(f.owner, current.id))).toMatchObject({ message: 'draw_not_open' });
    expect((await drawRows(f.eventId)).filter((row) => row.status === 'forfeited')).toHaveLength(1);
  });

  it('can be done by staff and owners, and by nobody else', async () => {
    const f = await newFixture(db, 4);
    await checkInAll(f);
    const prize = await addPrize(f, 'Voucher', 3);
    const a = await draw(f.staff, prize);
    const outsider = await newUser(db);
    const other = await newFixture(db, 1);

    for (const user of [outsider, other.owner]) {
      expect(await failure(() => forfeit(user, a.draw.id))).toMatchObject({ message: 'draw_not_found' });
    }
    expect(await failure(() => forfeit(f.staff, '00000000-0000-4000-8000-000000000000'))).toMatchObject({ message: 'draw_not_found' });
    expect(await failure(() => asAnon(db, () => db.query('select a41_forfeit_raffle_draw($1)', [a.draw.id])))).toMatchObject({ code: '42501' });
    expect((await drawRows(f.eventId))[0].status).toBe('won');

    await forfeit(f.owner, a.draw.id);
    expect((await drawRows(f.eventId))[0].status).toBe('forfeited');
  });

  it('counts only winners who took the prize towards its quantity', async () => {
    const f = await newFixture(db, 5);
    await checkInAll(f);
    const prize = await addPrize(f, 'Vouchers', 2);
    const a = await draw(f.staff, prize);
    await draw(f.staff, prize);
    await forfeit(f.staff, a.draw.id);
    expect((await draw(f.staff, prize)).prize.awarded).toBe(2);
    expect(await failure(() => draw(f.staff, prize))).toMatchObject({ message: 'prize_fully_awarded' });
  });
});

describe('the audit log', () => {
  let f: Fixture;
  let drawId: string;
  beforeAll(async () => {
    f = await newFixture(db, 4);
    await checkInAll(f);
    const prize = await addPrize(f);
    drawId = (await draw(f.staff, prize)).draw.id;
  });

  it('cannot be written to directly by anyone, including the server', async () => {
    const statements = [
      `insert into a41_raffle_draws (event_id, prize_id, guest_name) select event_id, prize_id, 'Forged' from a41_raffle_draws`,
      `update a41_raffle_draws set status = 'won'`,
      `update a41_raffle_draws set guest_name = 'Someone else'`,
      `update a41_raffle_draws set guest_id = null`,
      `delete from a41_raffle_draws`,
      `truncate a41_raffle_draws`,
    ];
    const who: [string, <T>(run: () => Promise<T>) => Promise<T>][] = [
      ['owner', (run) => asUser(db, f.owner, run)],
      ['staff', (run) => asUser(db, f.staff, run)],
      ['anon', (run) => asAnon(db, run)],
      ['service', (run) => asService(db, run)],
    ];
    for (const [, as] of who) {
      for (const sql of statements) {
        expect(await failure(() => as(() => db.query(sql)))).toMatchObject({ code: '42501' });
      }
    }
    const rows = await drawRows(f.eventId);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('won');
  });

  it('can be read by members of the event only', async () => {
    const other = await newFixture(db, 1);
    for (const user of [f.owner, f.staff]) {
      expect((await asUser(db, user, () => db.query('select id from a41_raffle_draws'))).rows).toEqual([{ id: drawId }]);
    }
    expect((await asUser(db, other.owner, () => db.query('select id from a41_raffle_draws'))).rows).toEqual([]);
    expect(await failure(() => asAnon(db, () => db.query('select id from a41_raffle_draws')))).toMatchObject({ code: '42501' });
  });

  it('lists every draw with who drew and who handled it, only for members', async () => {
    const entries = await log(f.owner, f.eventId);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ status: 'won', prize_name: 'Smart TV' });
    const { rows } = await db.query<{ email: string }>('select email from auth.users where id = $1', [f.staff]);
    expect(entries[0].drawn_by_email).toBe(rows[0].email);

    const outsider = await newUser(db);
    expect(await failure(() => log(outsider, f.eventId))).toMatchObject({ code: '42501' });
    expect(await failure(() => asAnon(db, () => db.query('select a41_raffle_log($1)', [f.eventId])))).toMatchObject({ code: '42501' });
  });

  it('keeps the entry, with the name as it was, when the guest is removed', async () => {
    const g = await newFixture(db, 2);
    await checkInAll(g);
    const result = await draw(g.staff, await addPrize(g));
    const winner = g.guests.find((guest) => guest.name === result.guest.name)!;

    await asUser(db, g.owner, () => db.query('delete from a41_guests where id = $1', [winner.id]));

    const rows = await drawRows(g.eventId);
    expect(rows).toEqual([expect.objectContaining({ guest_id: null, guest_name: winner.name, status: 'won' })]);
    expect((await log(g.owner, g.eventId))[0]).toMatchObject({ guest_name: winner.name });
  });

  it('shows the pool and the prizes with their counts', async () => {
    const g = await newFixture(db, 5);
    await checkInAll(g, 4);
    const tv = await addPrize(g, 'TV', 1, 2);
    await addPrize(g, 'Voucher', 3, 1);
    await draw(g.staff, tv);

    const state = await summary(g.staff, g.eventId);
    expect(state).toMatchObject({ checked_in: 4, remaining: 3 });
    expect(state.prizes.map((prize) => [prize.name, prize.quantity, prize.awarded, prize.sort_order])).toEqual([
      ['Voucher', 3, 0, 1],
      ['TV', 1, 1, 2],
    ]);
    const outsider = await newUser(db);
    expect(await failure(() => summary(outsider, g.eventId))).toMatchObject({ code: '42501' });
  });
});

describe('event removal', () => {
  it('takes prizes and draws with a deleted Free event', async () => {
    const f = await newFixture(db, 2, { free: true });
    await checkInAll(f);
    const prize = await addPrize(f);
    await draw(f.staff, prize);

    await asUser(db, f.owner, () => db.query('delete from a41_events where id = $1', [f.eventId]));

    expect((await db.query('select 1 from a41_raffle_prizes where event_id = $1', [f.eventId])).rows).toEqual([]);
    expect((await db.query('select 1 from a41_raffle_draws where event_id = $1', [f.eventId])).rows).toEqual([]);
  });
});

import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { classifyDbError } from '@/lib/db-errors';
import { checkinProblem, walkInProblem } from '@/lib/checkin/errors';
import { parseCheckinResult, parseCheckinStats, parseSearchResults } from '@/lib/checkin/records';
import { classifyRaffleError, type RaffleFailure } from '@/lib/raffle/errors';
import {
  parseDrawResult,
  parseForfeitResult,
  parseRaffleLog,
  parseRaffleSummary,
} from '@/lib/raffle/records';
import { failure, newFixture, newUser, rpc, type Fixture } from './checkin-fixtures';
import { asUser, createDb } from './harness';

// The app reads what the database answers and explains what it refuses. These
// tests make the real database answer and refuse, so a renamed key or rule
// breaks here and not at the door.
let db: PGlite;
let f: Fixture;

beforeAll(async () => {
  db = await createDb();
  f = await newFixture(db, 3);
});

describe('the app reads the check-in answers', () => {
  it('a scan, a repeat scan, another event and an unknown pass', async () => {
    await db.query(`update a41_guests set tags = '{VIP}' where id = $1`, [f.guests[0].id]);
    await db.query(`insert into a41_rsvps (guest_id, event_id, response, party_size) values ($1, $2, 'attending', 2)`, [f.guests[0].id, f.eventId]);

    const first = parseCheckinResult(await rpc(db, f.staff, 'a41_check_in_by_token($1, $2)', [f.eventId, f.guests[0].token]));
    expect(first).toMatchObject({
      outcome: 'checked_in',
      guest: { name: f.guests[0].name, tableNo: 'T1', tags: ['VIP'], partySize: 2, response: 'attending' },
    });

    const again = parseCheckinResult(await rpc(db, f.staff, 'a41_check_in_by_token($1, $2)', [f.eventId, f.guests[0].token]));
    expect(again.outcome).toBe('already_checked_in');

    expect(parseCheckinResult(await rpc(db, f.staff, 'a41_check_in_by_token($1, $2)', [f.eventId, '0'.repeat(64)]))).toEqual({ outcome: 'unknown' });

    const sibling = await newFixture(db, 0);
    await db.query(`update a41_events set org_id = $1 where id = $2`, [f.orgId, sibling.eventId]);
    await db.query(`insert into a41_guests (event_id, name, token) values ($1, 'Visitor', $2)`, [sibling.eventId, 'v'.repeat(40)]);
    expect(parseCheckinResult(await rpc(db, f.staff, 'a41_check_in_by_token($1, $2)', [f.eventId, 'v'.repeat(40)]))).toEqual({
      outcome: 'other_event',
      eventName: 'Annual Gala',
    });
  });

  it('the live numbers and a search', async () => {
    const stats = parseCheckinStats(await rpc(db, f.staff, 'a41_checkin_stats($1, 5)', [f.eventId]));
    expect(stats).toMatchObject({ totalGuests: 3, checkedIn: 1, attending: 1, attendingCheckedIn: 1 });
    expect(stats.recent[0]).toMatchObject({ guestId: f.guests[0].id, name: f.guests[0].name, tableNo: 'T1' });

    const hits = parseSearchResults(await rpc(db, f.staff, 'a41_search_checkin_guests($1, $2)', [f.eventId, 'guest']));
    expect(hits).toHaveLength(3);
    expect(hits[0]).toMatchObject({ checkedInAt: expect.any(String), partySize: 2 });
    expect(hits[2]).toMatchObject({ checkedInAt: null, partySize: null, response: null });
  });
});

describe('the app reads the raffle answers', () => {
  it('summary, draw, forfeit and log', async () => {
    const prize = await asUser(db, f.owner, async () => {
      const { rows } = await db.query<{ id: string }>(
        `insert into a41_raffle_prizes (event_id, name, quantity, sort_order) values ($1, 'Smart TV', 2, 3) returning id`,
        [f.eventId],
      );
      return rows[0].id;
    });
    await rpc(db, f.staff, 'a41_check_in_guest($1, $2)', [f.eventId, f.guests[1].id]);

    expect(parseRaffleSummary(await rpc(db, f.staff, 'a41_raffle_summary($1)', [f.eventId]))).toEqual({
      checkedIn: 2,
      remaining: 2,
      prizes: [{ id: prize, name: 'Smart TV', quantity: 2, awarded: 0, sortOrder: 3 }],
    });

    const drawn = parseDrawResult(await rpc(db, f.staff, 'a41_draw_raffle_winner($1)', [prize]));
    expect(drawn).toMatchObject({ prize: { id: prize, awarded: 1 }, remaining: 1 });
    expect(drawn.winner.name).toMatch(/^Guest /);
    expect(drawn.decoys).toHaveLength(1);

    const forfeited = parseForfeitResult(await rpc(db, f.staff, 'a41_forfeit_raffle_draw($1)', [drawn.drawId]));
    expect(forfeited).toMatchObject({ drawId: drawn.drawId, prize: { awarded: 0 }, remaining: 1 });

    const log = parseRaffleLog(await rpc(db, f.owner, 'a41_raffle_log($1)', [f.eventId]));
    expect(log).toEqual([
      expect.objectContaining({ id: drawn.drawId, status: 'forfeited', prizeName: 'Smart TV', guestName: drawn.winner.name, resolvedAt: expect.any(String) }),
    ]);
    expect(log[0].drawnBy).toContain('staff-');
  });
});

describe('the app explains what the database refuses', () => {
  const raised = async (run: () => Promise<unknown>) => {
    const error = await failure(run);
    if (!error) throw new Error('The statement was expected to fail');
    return error;
  };

  it('raffle failures, by name', async () => {
    const g = await newFixture(db, 2);
    const prize = await asUser(db, g.owner, async () => {
      const { rows } = await db.query<{ id: string }>(`insert into a41_raffle_prizes (event_id, name) values ($1, 'One') returning id`, [g.eventId]);
      return rows[0].id;
    });
    const stranger = await newUser(db);
    const cases: [RaffleFailure, () => Promise<unknown>][] = [
      ['no_eligible_guests', () => rpc(db, g.staff, 'a41_draw_raffle_winner($1)', [prize])],
      ['prize_not_found', () => rpc(db, stranger, 'a41_draw_raffle_winner($1)', [prize])],
      ['draw_not_found', () => rpc(db, stranger, 'a41_forfeit_raffle_draw($1)', ['00000000-0000-4000-8000-000000000000'])],
      ['forbidden', () => rpc(db, stranger, 'a41_raffle_summary($1)', [g.eventId])],
      ['raffle_prize_limit', async () => {
        await asUser(db, g.owner, () =>
          db.query(`insert into a41_raffle_prizes (event_id, name) select $1, 'P' || n from generate_series(1, 100) n`, [g.eventId]),
        );
      }],
    ];
    for (const [expected, run] of cases) {
      const error = await raised(run);
      expect(classifyRaffleError(error), `${expected}: ${error.message}`).toBe(expected);
    }

    await rpc(db, g.staff, 'a41_check_in_guest($1, $2)', [g.eventId, g.guests[0].id]);
    const open = await rpc<{ draw: { id: string } }>(db, g.staff, 'a41_draw_raffle_winner($1)', [prize]);
    expect(classifyRaffleError(await raised(() => rpc(db, g.staff, 'a41_draw_raffle_winner($1)', [prize])))).toBe('prize_fully_awarded');

    // a prize that has been drawn cannot be deleted
    expect(
      classifyRaffleError(await raised(() => asUser(db, g.owner, () => db.query('delete from a41_raffle_prizes where id = $1', [prize])))),
    ).toBe('prize_drawn');
    await rpc(db, g.staff, 'a41_forfeit_raffle_draw($1)', [open.draw.id]);
    expect(classifyRaffleError(await raised(() => rpc(db, g.staff, 'a41_forfeit_raffle_draw($1)', [open.draw.id])))).toBe('draw_not_open');
  });

  it('a quantity below the winners already given out', async () => {
    const g = await newFixture(db, 3);
    for (const guest of g.guests) await rpc(db, g.staff, 'a41_check_in_guest($1, $2)', [g.eventId, guest.id]);
    const prize = await asUser(db, g.owner, async () => {
      const { rows } = await db.query<{ id: string }>(
        `insert into a41_raffle_prizes (event_id, name, quantity) values ($1, 'Vouchers', 3) returning id`,
        [g.eventId],
      );
      return rows[0].id;
    });
    await rpc(db, g.staff, 'a41_draw_raffle_winner($1)', [prize]);
    await rpc(db, g.staff, 'a41_draw_raffle_winner($1)', [prize]);
    const error = await raised(() => asUser(db, g.owner, () => db.query('update a41_raffle_prizes set quantity = 1 where id = $1', [prize])));
    expect(classifyRaffleError(error)).toBe('prize_quantity_below_awarded');
  });

  it('walk-in failures', async () => {
    const g = await newFixture(db, 1);
    await db.query(`update a41_guests set phone = '+6281200000001', email = 'a@example.com' where id = $1`, [g.guests[0].id]);

    const phone = await raised(() => rpc(db, g.owner, 'a41_add_walk_in($1, $2, $3)', [g.eventId, 'Twin', '+6281200000001']));
    expect(walkInProblem(phone).fieldErrors).toHaveProperty('phone');
    const email = await raised(() => rpc(db, g.owner, 'a41_add_walk_in($1, $2, null, $3)', [g.eventId, 'Twin', 'a@example.com']));
    expect(walkInProblem(email).fieldErrors).toHaveProperty('email');

    const forbidden = await raised(() => rpc(db, g.staff, 'a41_add_walk_in($1, $2)', [g.eventId, 'Sneaky']));
    expect(classifyDbError(forbidden)).toBe('forbidden');
    expect(walkInProblem(forbidden).error).toMatch(/owner/i);
    expect(checkinProblem(forbidden).error).toMatch(/access/i);

    await asUser(db, g.owner, () =>
      db.query(`insert into a41_guests (event_id, name) select $1, 'Filler ' || n from generate_series(1, 299) n`, [g.eventId]),
    );
    const full = await raised(() => rpc(db, g.owner, 'a41_add_walk_in($1, $2)', [g.eventId, 'One too many']));
    expect(walkInProblem(full).error).toMatch(/full/i);
  });
});

import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { asService, asUser, createDb } from './harness';

let db: PGlite;

beforeAll(async () => {
  db = await createDb();
});

async function guestToken(status: 'draft' | 'published' | 'archived'): Promise<{ token: string; guestId: string }> {
  const owner = randomUUID();
  await db.query('insert into auth.users (id, email) values ($1, $2)', [owner, `${owner}@example.test`]);
  const eventId = await asUser(db, owner, async () => {
    const { rows: orgs } = await db.query<{ id: string }>(`insert into a41_organizations (name) values ('Acme') returning id`);
    const { rows } = await db.query<{ id: string }>(
      `insert into a41_events (org_id, name, slug, type, starts_at, ends_at)
       values ($1, 'Gala', $2, 'corporate', now() + interval '30 days', now() + interval '31 days') returning id`,
      [orgs[0].id, `evt-${randomUUID().slice(0, 8)}`],
    );
    await db.query(`insert into a41_guests (event_id, name) values ($1, 'Dewi')`, [rows[0].id]);
    return rows[0].id;
  });
  await asService(db, () => db.query('update a41_events set status = $2 where id = $1', [eventId, status]));
  const { rows } = await asService(db, () =>
    db.query<{ token: string; id: string }>('select id, token from a41_guests where event_id = $1', [eventId]),
  );
  return { token: rows[0].token, guestId: rows[0].id };
}

const lookup = async (token: string) =>
  (await db.query<{ id: string }>('select id from a41_private.guest_by_token($1)', [token])).rows;

describe('a41_private.guest_by_token', () => {
  it('finds the guest of a published event', async () => {
    const { token, guestId } = await guestToken('published');
    expect((await lookup(token)).map((row) => row.id)).toEqual([guestId]);
  });

  it('finds nobody while the event is a draft or archived', async () => {
    expect(await lookup((await guestToken('draft')).token)).toEqual([]);
    expect(await lookup((await guestToken('archived')).token)).toEqual([]);
  });

  it('finds nobody for a token that does not exist', async () => {
    expect(await lookup('0'.repeat(64))).toEqual([]);
  });

  it('is not callable by the public roles directly', async () => {
    await db.exec('set role anon');
    try {
      await expect(db.query('select * from a41_private.guest_by_token($1)', ['x'])).rejects.toThrow();
    } finally {
      await db.exec('reset role');
    }
  });
});

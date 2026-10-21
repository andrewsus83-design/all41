import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { asService, asUser } from './harness';

export interface Guest {
  id: string;
  token: string;
  name: string;
}

export interface Fixture {
  owner: string;
  staff: string;
  orgId: string;
  eventId: string;
  guests: Guest[];
}

export async function newUser(db: PGlite, label = 'user'): Promise<string> {
  const id = randomUUID();
  await db.query('insert into auth.users (id, email) values ($1, $2)', [id, `${label}-${id.slice(0, 8)}@example.test`]);
  return id;
}

/** An organization with an owner and a staff member, one event on the Plus package (300 guests, or Free with `free`), and `guests` guests. */
export async function newFixture(
  db: PGlite,
  guestCount = 4,
  options: { published?: boolean; free?: boolean } = {},
): Promise<Fixture> {
  const owner = await newUser(db, 'owner');
  const staff = await newUser(db, 'staff');
  const orgId = await asUser(db, owner, async () => {
    const { rows } = await db.query<{ id: string }>(`insert into a41_organizations (name) values ('Acme') returning id`);
    return rows[0].id;
  });
  await db.query(`insert into a41_memberships (org_id, user_id, role) values ($1, $2, 'staff')`, [orgId, staff]);

  const eventId = await newEvent(db, owner, orgId);
  await asService(db, () =>
    db.query(`update a41_events set package = $3, status = $2 where id = $1`, [
      eventId,
      options.published === false ? 'draft' : 'published',
      options.free ? 'free' : 'plus',
    ]),
  );
  const guests = await addGuests(db, owner, eventId, guestCount);
  return { owner, staff, orgId, eventId, guests };
}

export async function newEvent(db: PGlite, owner: string, orgId: string, name = 'Annual Gala'): Promise<string> {
  return asUser(db, owner, async () => {
    const { rows } = await db.query<{ id: string }>(
      `insert into a41_events (org_id, name, slug, type, starts_at, ends_at)
       values ($1, $2, $3, 'corporate', now() + interval '30 days', now() + interval '31 days') returning id`,
      [orgId, name, `evt-${randomUUID().slice(0, 8)}`],
    );
    return rows[0].id;
  });
}

export async function addGuests(db: PGlite, owner: string, eventId: string, count: number, prefix = 'Guest'): Promise<Guest[]> {
  await asUser(db, owner, () =>
    db.query(
      `insert into a41_guests (event_id, name, table_no)
       select $1, $2 || ' ' || g, 'T' || g from generate_series(1, $3::int) g`,
      [eventId, prefix, count],
    ),
  );
  const { rows } = await db.query<Guest>(
    `select id, token, name from a41_guests where event_id = $1 and name like $2 order by name`,
    [eventId, `${prefix} %`],
  );
  return rows;
}

/** Calls a function as a signed-in user and returns the parsed jsonb result. */
export async function rpc<T = Record<string, unknown>>(
  db: PGlite,
  userId: string,
  sql: string,
  params: unknown[] = [],
): Promise<T> {
  const { rows } = await asUser(db, userId, () => db.query<{ result: T }>(`select ${sql} as result`, params));
  return rows[0].result;
}

/** The message and code of the error a statement raised, or null when it succeeded. */
export async function failure(run: () => Promise<unknown>): Promise<{ code?: string; message: string } | null> {
  try {
    await run();
    return null;
  } catch (error) {
    const raised = error as { code?: string; message: string };
    return { code: raised.code, message: raised.message };
  }
}

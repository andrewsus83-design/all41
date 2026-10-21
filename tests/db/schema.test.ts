import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { PACKAGES } from '@/lib/pricing';
import { asAnon, asService, asUser, createDb } from './harness';

let db: PGlite;

beforeAll(async () => {
  db = await createDb();
});

async function newUser(): Promise<string> {
  const id = randomUUID();
  await db.query('insert into auth.users (id, email) values ($1, $2)', [id, `${id}@example.test`]);
  return id;
}

async function newOrg(ownerId: string): Promise<string> {
  return asUser(db, ownerId, async () => {
    const { rows } = await db.query<{ id: string }>(
      `insert into a41_organizations (name) values ('Acme Events') returning id`,
    );
    return rows[0].id;
  });
}

async function addMember(orgId: string, userId: string, role: 'owner' | 'staff'): Promise<void> {
  await db.query('insert into a41_memberships (org_id, user_id, role) values ($1, $2, $3)', [orgId, userId, role]);
}

async function newEvent(ownerId: string, orgId: string, overrides: { slug?: string; endsInDays?: number } = {}) {
  const slug = overrides.slug ?? `evt-${randomUUID().slice(0, 8)}`;
  const endsInDays = overrides.endsInDays ?? 31;
  return asUser(db, ownerId, async () => {
    const { rows } = await db.query<{ id: string }>(
      `insert into a41_events (org_id, name, slug, type, starts_at, ends_at)
       values ($1, 'Annual Gala', $2, 'corporate', now() + ($3 || ' days')::interval - interval '1 day', now() + ($3 || ' days')::interval)
       returning id`,
      [orgId, slug, String(endsInDays)],
    );
    return rows[0].id;
  });
}

/** Billing columns are only written by the server, e.g. after a payment. */
async function setPackage(eventId: string, pkg: string, extraGuests = 0): Promise<void> {
  await asService(db, () =>
    db.query('update a41_events set package = $2, extra_guests = $3 where id = $1', [eventId, pkg, extraGuests]),
  );
}

/** A paid event: created Free, then upgraded the way a payment would. */
async function newPaidEvent(ownerId: string, orgId: string, pkg = 'starter', extraGuests = 0): Promise<string> {
  const eventId = await newEvent(ownerId, orgId);
  await setPackage(eventId, pkg, extraGuests);
  return eventId;
}

async function addGuests(userId: string, eventId: string, count: number): Promise<void> {
  await asUser(db, userId, () =>
    db.query(`insert into a41_guests (event_id, name) select $1, 'Guest ' || g from generate_series(1, $2::int) g`, [
      eventId,
      count,
    ]),
  );
}

async function guestCount(eventId: string): Promise<number> {
  const { rows } = await db.query<{ n: number }>('select count(*)::int as n from a41_guests where event_id = $1', [
    eventId,
  ]);
  return rows[0].n;
}

async function newGuest(userId: string, eventId: string): Promise<string> {
  return asUser(db, userId, async () => {
    const { rows } = await db.query<{ id: string }>(
      `insert into a41_guests (event_id, name) values ($1, 'Rina') returning id`,
      [eventId],
    );
    return rows[0].id;
  });
}

describe('package catalog', () => {
  it('matches the catalog in the app', async () => {
    const { rows } = await db.query(
      `select tier, name, guest_capacity, price_idr, extra_guest_price_idr,
              whatsapp_fonnte_price_idr, whatsapp_official_price_idr
       from a41_packages order by sort_order`,
    );
    expect(rows).toEqual(
      PACKAGES.map((p) => ({
        tier: p.tier,
        name: p.name,
        guest_capacity: p.guestCapacity,
        price_idr: p.priceIdr,
        extra_guest_price_idr: p.extraGuestPriceIdr,
        whatsapp_fonnte_price_idr: p.whatsappIdr?.fonnte ?? null,
        whatsapp_official_price_idr: p.whatsappIdr?.official ?? null,
      })),
    );
  });

  it('is readable by anyone but not writable', async () => {
    const { rows } = await asAnon(db, () => db.query('select tier from a41_packages'));
    expect(rows).toHaveLength(PACKAGES.length);
    await expect(
      asUser(db, await newUser(), () => db.query(`update a41_packages set price_idr = 1 where tier = 'scale'`)),
    ).rejects.toThrow(/permission denied/);
  });
});

describe('access for signed-out visitors', () => {
  it.each(['a41_organizations', 'a41_memberships', 'a41_events', 'a41_guests', 'a41_rsvps', 'a41_checkins'])(
    'cannot read %s',
    async (table) => {
      await expect(asAnon(db, () => db.query(`select * from ${table}`))).rejects.toThrow(/permission denied/);
    },
  );
});

describe('organizations', () => {
  it('makes the creator an owner and hides the organization from others', async () => {
    const owner = await newUser();
    const stranger = await newUser();
    const orgId = await newOrg(owner);

    const { rows: members } = await db.query('select user_id, role from a41_memberships where org_id = $1', [orgId]);
    expect(members).toEqual([{ user_id: owner, role: 'owner' }]);

    const seenByOwner = await asUser(db, owner, () => db.query('select id from a41_organizations where id = $1', [orgId]));
    const seenByStranger = await asUser(db, stranger, () =>
      db.query('select id from a41_organizations where id = $1', [orgId]),
    );
    expect(seenByOwner.rows).toHaveLength(1);
    expect(seenByStranger.rows).toHaveLength(0);
  });

  it('cannot be created in somebody else name or given members directly', async () => {
    const user = await newUser();
    const other = await newUser();
    await expect(
      asUser(db, user, () => db.query(`insert into a41_organizations (name, created_by) values ('Fake', $1)`, [other])),
    ).rejects.toThrow(/permission denied/);

    const orgId = await newOrg(other);
    await expect(
      asUser(db, user, () =>
        db.query(`insert into a41_memberships (org_id, user_id, role) values ($1, $2, 'owner')`, [orgId, user]),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it('can only be renamed by an owner', async () => {
    const owner = await newUser();
    const staff = await newUser();
    const orgId = await newOrg(owner);
    await addMember(orgId, staff, 'staff');

    const byStaff = await asUser(db, staff, () =>
      db.query(`update a41_organizations set name = 'Hijacked' where id = $1`, [orgId]),
    );
    expect(byStaff.affectedRows).toBe(0);

    const byOwner = await asUser(db, owner, () =>
      db.query(`update a41_organizations set name = 'Renamed' where id = $1`, [orgId]),
    );
    expect(byOwner.affectedRows).toBe(1);
  });
});

describe('events', () => {
  it('start as Free drafts and are visible to the whole team only', async () => {
    const owner = await newUser();
    const staff = await newUser();
    const stranger = await newUser();
    const orgId = await newOrg(owner);
    await addMember(orgId, staff, 'staff');
    const eventId = await newEvent(owner, orgId);

    const { rows } = await db.query('select package, extra_guests, status from a41_events where id = $1', [eventId]);
    expect(rows).toEqual([{ package: 'free', extra_guests: 0, status: 'draft' }]);

    const seenByStaff = await asUser(db, staff, () => db.query('select id from a41_events where id = $1', [eventId]));
    const seenByStranger = await asUser(db, stranger, () =>
      db.query('select id from a41_events where id = $1', [eventId]),
    );
    expect(seenByStaff.rows).toHaveLength(1);
    expect(seenByStranger.rows).toHaveLength(0);
  });

  it('can only be created by an owner of the organization', async () => {
    const owner = await newUser();
    const staff = await newUser();
    const stranger = await newUser();
    const orgId = await newOrg(owner);
    await addMember(orgId, staff, 'staff');

    await expect(newEvent(staff, orgId)).rejects.toThrow(/row-level security/);
    await expect(newEvent(stranger, orgId)).rejects.toThrow(/row-level security/);
  });

  it('cannot be given a package or extra guests by users', async () => {
    const owner = await newUser();
    const orgId = await newOrg(owner);
    const eventId = await newEvent(owner, orgId);

    await expect(
      asUser(db, owner, () =>
        db.query(
          `insert into a41_events (org_id, name, slug, type, starts_at, ends_at, package)
           values ($1, 'Sneaky', 'sneaky-gala', 'corporate', now(), now() + interval '1 day', 'scale')`,
          [orgId],
        ),
      ),
    ).rejects.toThrow(/permission denied/);

    await expect(
      asUser(db, owner, () => db.query(`update a41_events set package = 'scale' where id = $1`, [eventId])),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asUser(db, owner, () => db.query(`update a41_events set extra_guests = 100 where id = $1`, [eventId])),
    ).rejects.toThrow(/permission denied/);
  });

  it('get a subdomain-safe, unreserved, unique slug', async () => {
    const owner = await newUser();
    const orgId = await newOrg(owner);
    const first = await newEvent(owner, orgId, { slug: 'town-hall-2026' });
    // upgraded, so it does not trip the one-Free-event rule while we try bad slugs
    await setPackage(first, 'starter');

    for (const slug of ['ab', 'UPPER', 'has space', '-leading', 'trailing-', 'double--dash', 'www', 'admin']) {
      await expect(newEvent(owner, orgId, { slug, endsInDays: 40 })).rejects.toThrow(/violates check constraint/);
    }
    const other = await newUser();
    const otherOrg = await newOrg(other);
    await expect(newEvent(other, otherOrg, { slug: 'town-hall-2026' })).rejects.toThrow(/duplicate key/);
  });

  it('allow one active Free event per organization', async () => {
    const owner = await newUser();
    const orgId = await newOrg(owner);
    const first = await newEvent(owner, orgId);

    await expect(newEvent(owner, orgId)).rejects.toThrow(/free_event_limit/);

    // a finished or archived Free event frees the slot
    await asUser(db, owner, () => db.query(`update a41_events set status = 'archived' where id = $1`, [first]));
    await newEvent(owner, orgId);
  });

  it('do not count a Free event that already ended', async () => {
    const owner = await newUser();
    const orgId = await newOrg(owner);
    await newEvent(owner, orgId, { endsInDays: -5 });
    await newEvent(owner, orgId);
  });

  it('do not limit paid events', async () => {
    const owner = await newUser();
    const orgId = await newOrg(owner);
    const first = await newEvent(owner, orgId);
    await setPackage(first, 'starter');
    const second = await newEvent(owner, orgId);
    await setPackage(second, 'plus');
    await newEvent(owner, orgId);
  });

  it('only sell extra guests in blocks of 10 and not for Free or Scale', async () => {
    const owner = await newUser();
    const orgId = await newOrg(owner);
    const eventId = await newEvent(owner, orgId);

    await expect(setPackage(eventId, 'starter', 15)).rejects.toThrow(/violates check constraint/);
    await expect(setPackage(eventId, 'free', 10)).rejects.toThrow(/extra_guests_not_available/);
    await expect(setPackage(eventId, 'scale', 10)).rejects.toThrow(/extra_guests_not_available/);
    await setPackage(eventId, 'starter', 20);
  });

  it('never lose paid capacity', async () => {
    const owner = await newUser();
    const orgId = await newOrg(owner);
    const eventId = await newEvent(owner, orgId);
    await setPackage(eventId, 'plus', 30);

    await expect(setPackage(eventId, 'starter', 0)).rejects.toThrow(/capacity_cannot_decrease/);
    await expect(setPackage(eventId, 'plus', 20)).rejects.toThrow(/capacity_cannot_decrease/);
    await setPackage(eventId, 'pro', 0);
  });

  it('can be deleted by the owner only while Free', async () => {
    const owner = await newUser();
    const orgId = await newOrg(owner);
    const paidEvent = await newEvent(owner, orgId);
    await setPackage(paidEvent, 'starter');
    const freeEvent = await newEvent(owner, orgId);

    const paid = await asUser(db, owner, () => db.query('delete from a41_events where id = $1', [paidEvent]));
    expect(paid.affectedRows).toBe(0);
    const free = await asUser(db, owner, () => db.query('delete from a41_events where id = $1', [freeEvent]));
    expect(free.affectedRows).toBe(1);
  });

  it('keep updated_at current', async () => {
    const owner = await newUser();
    const orgId = await newOrg(owner);
    const eventId = await newEvent(owner, orgId);
    const before = await db.query<{ updated_at: Date }>('select updated_at from a41_events where id = $1', [eventId]);
    await new Promise((resolve) => setTimeout(resolve, 20));
    await asUser(db, owner, () => db.query(`update a41_events set name = 'Renamed' where id = $1`, [eventId]));
    const after = await db.query<{ updated_at: Date }>('select updated_at from a41_events where id = $1', [eventId]);
    expect(after.rows[0].updated_at.getTime()).toBeGreaterThan(before.rows[0].updated_at.getTime());
  });
});

describe('guest list capacity', () => {
  it('holds 5 guests on Free and refuses the 6th', async () => {
    const owner = await newUser();
    const eventId = await newEvent(owner, await newOrg(owner));

    await addGuests(owner, eventId, 5);
    await expect(newGuest(owner, eventId)).rejects.toThrow(/guest_capacity_exceeded/);
    expect(await guestCount(eventId)).toBe(5);
  });

  it('holds the package capacity on a paid event and refuses one more', async () => {
    const owner = await newUser();
    const eventId = await newEvent(owner, await newOrg(owner));
    await setPackage(eventId, 'starter');

    await addGuests(owner, eventId, 50);
    await expect(newGuest(owner, eventId)).rejects.toThrow(/guest_capacity_exceeded/);
  });

  it('refuses a bulk import that would pass capacity and imports nothing', async () => {
    const owner = await newUser();
    const eventId = await newEvent(owner, await newOrg(owner));
    await setPackage(eventId, 'starter');

    await expect(addGuests(owner, eventId, 51)).rejects.toThrow(/guest_capacity_exceeded/);
    expect(await guestCount(eventId)).toBe(0);
  });

  it('grows with purchased extra guests', async () => {
    const owner = await newUser();
    const eventId = await newEvent(owner, await newOrg(owner));
    await setPackage(eventId, 'starter', 20);

    await addGuests(owner, eventId, 70);
    await expect(newGuest(owner, eventId)).rejects.toThrow(/guest_capacity_exceeded/);
  });

  it('frees a seat when a guest is removed', async () => {
    const owner = await newUser();
    const eventId = await newEvent(owner, await newOrg(owner));
    await addGuests(owner, eventId, 5);

    await asUser(db, owner, () => db.query(`delete from a41_guests where event_id = $1 and name = 'Guest 1'`, [eventId]));
    await newGuest(owner, eventId);
  });
});

describe('guests', () => {
  it('get a long unguessable token', async () => {
    const owner = await newUser();
    const eventId = await newEvent(owner, await newOrg(owner));
    await addGuests(owner, eventId, 3);

    const { rows } = await db.query<{ token: string }>('select token from a41_guests where event_id = $1', [eventId]);
    expect(new Set(rows.map((r) => r.token)).size).toBe(3);
    for (const { token } of rows) expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('are unique by email and phone within an event only', async () => {
    const owner = await newUser();
    const orgId = await newOrg(owner);
    const first = await newPaidEvent(owner, orgId);
    const second = await newPaidEvent(owner, orgId);

    const insert = (eventId: string, email: string | null, phone: string | null) =>
      asUser(db, owner, () =>
        db.query(`insert into a41_guests (event_id, name, email, phone) values ($1, 'Budi', $2, $3)`, [
          eventId,
          email,
          phone,
        ]),
      );

    await insert(first, 'budi@example.test', '+628123456789');
    await expect(insert(first, 'budi@example.test', null)).rejects.toThrow(/duplicate key/);
    await expect(insert(first, null, '+628123456789')).rejects.toThrow(/duplicate key/);
    await insert(second, 'budi@example.test', '+628123456789');
    // guests without contact details never collide with each other
    await insert(first, null, null);
    await insert(first, null, null);
  });

  it('are stored with a lowercase email and an international phone number', async () => {
    const owner = await newUser();
    const eventId = await newEvent(owner, await newOrg(owner));
    const insert = (email: string | null, phone: string | null) =>
      asUser(db, owner, () =>
        db.query(`insert into a41_guests (event_id, name, email, phone) values ($1, 'Budi', $2, $3)`, [
          eventId,
          email,
          phone,
        ]),
      );

    await expect(insert('Budi@Example.test', null)).rejects.toThrow(/violates check constraint/);
    await expect(insert('not-an-email', null)).rejects.toThrow(/violates check constraint/);
    await expect(insert(null, '08123456789')).rejects.toThrow(/violates check constraint/);
    await insert('budi@example.test', '+628123456789');
  });

  it('can be managed by owners and only read by staff', async () => {
    const owner = await newUser();
    const staff = await newUser();
    const stranger = await newUser();
    const orgId = await newOrg(owner);
    await addMember(orgId, staff, 'staff');
    const eventId = await newEvent(owner, orgId);
    const guestId = await newGuest(owner, eventId);

    const read = (userId: string) =>
      asUser(db, userId, () => db.query('select id from a41_guests where id = $1', [guestId]));
    expect((await read(staff)).rows).toHaveLength(1);
    expect((await read(stranger)).rows).toHaveLength(0);

    await expect(newGuest(staff, eventId)).rejects.toThrow(/row-level security/);
    const renamedByStaff = await asUser(db, staff, () =>
      db.query(`update a41_guests set name = 'Hijacked' where id = $1`, [guestId]),
    );
    expect(renamedByStaff.affectedRows).toBe(0);
    const deletedByStaff = await asUser(db, staff, () => db.query('delete from a41_guests where id = $1', [guestId]));
    expect(deletedByStaff.affectedRows).toBe(0);

    const renamedByOwner = await asUser(db, owner, () =>
      db.query(`update a41_guests set name = 'Rina S.', table_no = '7' where id = $1`, [guestId]),
    );
    expect(renamedByOwner.affectedRows).toBe(1);
  });

  it('cannot have their status, token or event changed by users', async () => {
    const owner = await newUser();
    const orgId = await newOrg(owner);
    const eventId = await newPaidEvent(owner, orgId);
    const otherEvent = await newEvent(owner, orgId);
    const guestId = await newGuest(owner, eventId);

    for (const set of [`status = 'checked_in'`, `token = 'abc'`, `event_id = '${otherEvent}'`]) {
      await expect(
        asUser(db, owner, () => db.query(`update a41_guests set ${set} where id = $1`, [guestId])),
      ).rejects.toThrow(/permission denied/);
    }
  });
});

describe('RSVPs', () => {
  it('are written by the server and read by the team', async () => {
    const owner = await newUser();
    const stranger = await newUser();
    const eventId = await newEvent(owner, await newOrg(owner));
    const guestId = await newGuest(owner, eventId);

    await expect(
      asUser(db, owner, () =>
        db.query(`insert into a41_rsvps (guest_id, event_id, response) values ($1, $2, 'attending')`, [guestId, eventId]),
      ),
    ).rejects.toThrow(/permission denied/);

    await asService(db, () =>
      db.query(
        `insert into a41_rsvps (guest_id, event_id, response, party_size, meal_preference)
         values ($1, $2, 'attending', 2, 'vegetarian')`,
        [guestId, eventId],
      ),
    );

    const seenByOwner = await asUser(db, owner, () => db.query('select response from a41_rsvps where guest_id = $1', [guestId]));
    const seenByStranger = await asUser(db, stranger, () =>
      db.query('select response from a41_rsvps where guest_id = $1', [guestId]),
    );
    expect(seenByOwner.rows).toEqual([{ response: 'attending' }]);
    expect(seenByStranger.rows).toHaveLength(0);

    const { rows } = await db.query('select status from a41_guests where id = $1', [guestId]);
    expect(rows).toEqual([{ status: 'rsvp' }]);
  });

  it('must belong to a guest of the same event', async () => {
    const owner = await newUser();
    const orgId = await newOrg(owner);
    const eventId = await newPaidEvent(owner, orgId);
    const otherEvent = await newEvent(owner, orgId);
    const guestId = await newGuest(owner, eventId);

    await expect(
      asService(db, () =>
        db.query(`insert into a41_rsvps (guest_id, event_id, response) values ($1, $2, 'declined')`, [guestId, otherEvent]),
      ),
    ).rejects.toThrow(/foreign key/);
  });
});

describe('check-in', () => {
  async function setup() {
    const owner = await newUser();
    const staff = await newUser();
    const stranger = await newUser();
    const orgId = await newOrg(owner);
    await addMember(orgId, staff, 'staff');
    const eventId = await newEvent(owner, orgId);
    const guestId = await newGuest(owner, eventId);
    return { owner, staff, stranger, eventId, guestId };
  }

  const checkIn = (userId: string, eventId: string, guestId: string) =>
    asUser(db, userId, () => db.query('insert into a41_checkins (guest_id, event_id) values ($1, $2)', [guestId, eventId]));

  it('lets staff scan a guest in, records who did it and marks the guest as arrived', async () => {
    const { staff, eventId, guestId } = await setup();
    await checkIn(staff, eventId, guestId);

    const { rows } = await db.query('select checked_in_by from a41_checkins where guest_id = $1', [guestId]);
    expect(rows).toEqual([{ checked_in_by: staff }]);
    const guest = await db.query('select status from a41_guests where id = $1', [guestId]);
    expect(guest.rows).toEqual([{ status: 'checked_in' }]);
  });

  it('refuses a second check-in for the same guest', async () => {
    const { owner, staff, eventId, guestId } = await setup();
    await checkIn(staff, eventId, guestId);
    await expect(checkIn(owner, eventId, guestId)).rejects.toThrow(/duplicate key/);
  });

  it('is closed to people outside the organization', async () => {
    const { stranger, eventId, guestId } = await setup();
    await expect(checkIn(stranger, eventId, guestId)).rejects.toThrow(/row-level security/);
  });

  it('cannot be forged for another user or edited afterwards', async () => {
    const { owner, staff, eventId, guestId } = await setup();
    await expect(
      asUser(db, staff, () =>
        db.query('insert into a41_checkins (guest_id, event_id, checked_in_by) values ($1, $2, $3)', [
          guestId,
          eventId,
          owner,
        ]),
      ),
    ).rejects.toThrow(/permission denied/);

    await checkIn(staff, eventId, guestId);
    await expect(
      asUser(db, staff, () => db.query('delete from a41_checkins where guest_id = $1', [guestId])),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asUser(db, staff, () => db.query(`update a41_checkins set checked_in_at = now() where guest_id = $1`, [guestId])),
    ).rejects.toThrow(/permission denied/);
  });
});

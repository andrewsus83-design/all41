import { randomUUID } from "node:crypto";
import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { classifyDbError, type DbError, type DbFailure } from "@/lib/db-errors";
import { asUser, createDb } from "./harness";

// The app turns database errors into friendly messages by reading their code
// and text. These tests make the real database raise each error, so a renamed
// constraint or rule breaks here and not in front of a customer.
let db: PGlite;

beforeAll(async () => {
  db = await createDb();
});

async function newUser(): Promise<string> {
  const id = randomUUID();
  await db.query("insert into auth.users (id, email) values ($1, $2)", [id, `${id}@example.test`]);
  return id;
}

async function newOrg(ownerId: string): Promise<string> {
  return asUser(db, ownerId, async () => {
    const { rows } = await db.query<{ id: string }>(`insert into a41_organizations (name) values ('Acme') returning id`);
    return rows[0].id;
  });
}

async function newEvent(ownerId: string, orgId: string, slug = `evt-${randomUUID().slice(0, 8)}`): Promise<string> {
  return asUser(db, ownerId, async () => {
    const { rows } = await db.query<{ id: string }>(
      `insert into a41_events (org_id, name, slug, type, starts_at, ends_at)
       values ($1, 'Gala', $2, 'corporate', now() + interval '30 days', now() + interval '31 days') returning id`,
      [orgId, slug],
    );
    return rows[0].id;
  });
}

/** What the app would see: the code and message the database raised. */
async function failureOf(run: () => Promise<unknown>): Promise<DbFailure> {
  try {
    await run();
  } catch (error) {
    const raised = error as DbError & { detail?: string };
    return classifyDbError({ code: raised.code, message: raised.message, details: raised.detail });
  }
  throw new Error("The statement was expected to fail");
}

describe("database errors the app explains", () => {
  it("a taken event address", async () => {
    const owner = await newUser();
    const orgId = await newOrg(owner);
    await newEvent(owner, orgId, "town-hall");
    const other = await newUser();
    const otherOrg = await newOrg(other);
    expect(await failureOf(() => newEvent(other, otherOrg, "town-hall"))).toBe("slug_taken");
  });

  it("a guest whose email or phone is already on the list", async () => {
    const owner = await newUser();
    const eventId = await newEvent(owner, await newOrg(owner));
    await asUser(db, owner, () =>
      db.query(`insert into a41_guests (event_id, name, email, phone) values ($1, 'Dewi', 'dewi@example.com', '+6281234567890')`, [eventId]),
    );

    const insert = (email: string | null, phone: string | null) =>
      asUser(db, owner, () => db.query(`insert into a41_guests (event_id, name, email, phone) values ($1, 'Other', $2, $3)`, [eventId, email, phone]));

    expect(await failureOf(() => insert("dewi@example.com", null))).toBe("duplicate_email");
    expect(await failureOf(() => insert(null, "+6281234567890"))).toBe("duplicate_phone");
  });

  it("a full guest list", async () => {
    const owner = await newUser();
    const eventId = await newEvent(owner, await newOrg(owner));
    await asUser(db, owner, () =>
      db.query(`insert into a41_guests (event_id, name) select $1, 'Guest ' || g from generate_series(1, 5) g`, [eventId]),
    );
    expect(await failureOf(() => asUser(db, owner, () => db.query(`insert into a41_guests (event_id, name) values ($1, 'One more')`, [eventId])))).toBe(
      "guest_capacity_exceeded",
    );
  });

  it("a second active Free event", async () => {
    const owner = await newUser();
    const orgId = await newOrg(owner);
    await newEvent(owner, orgId);
    expect(await failureOf(() => newEvent(owner, orgId))).toBe("free_event_limit");
  });

  it("restoring an archived Free event while another one is active", async () => {
    const owner = await newUser();
    const orgId = await newOrg(owner);
    const first = await newEvent(owner, orgId);
    await asUser(db, owner, () => db.query(`update a41_events set status = 'archived' where id = $1`, [first]));
    await newEvent(owner, orgId);
    expect(await failureOf(() => asUser(db, owner, () => db.query(`update a41_events set status = 'draft' where id = $1`, [first])))).toBe(
      "free_event_limit",
    );
  });

  it("a guest added to an event that does not exist", async () => {
    const owner = await newUser();
    await newOrg(owner);
    // Row level security answers first: a stranger's event id is a permission error, not a missing row.
    const failure = await failureOf(() =>
      asUser(db, owner, () => db.query(`insert into a41_guests (event_id, name) values ($1, 'Ghost')`, [randomUUID()])),
    );
    expect(["forbidden", "missing_parent"]).toContain(failure);
  });

  it("a write by someone who may not make it", async () => {
    const owner = await newUser();
    const eventId = await newEvent(owner, await newOrg(owner));
    const stranger = await newUser();
    await newOrg(stranger);
    expect(
      await failureOf(() => asUser(db, stranger, () => db.query(`insert into a41_guests (event_id, name) values ($1, 'Intruder')`, [eventId]))),
    ).toBe("forbidden");
  });
});

import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { RESERVED_SLUGS } from "@/lib/events/slug";
import { createDb } from "./harness";

// Rules that exist twice, once in the app for friendly errors and once in the
// database to be safe, must not drift apart.
describe("app and database agree", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createDb();
  });

  it("reserve the same event addresses", async () => {
    const { rows } = await db.query<{ definition: string }>(
      `select pg_get_constraintdef(oid) as definition
       from pg_constraint
       where conrelid = 'public.a41_events'::regclass and contype = 'c'
         and pg_get_constraintdef(oid) like '%slug%'`,
    );
    expect(rows).toHaveLength(1);

    const list = /ARRAY\[([^\]]+)\]/.exec(rows[0].definition)?.[1] ?? "";
    const reserved = [...list.matchAll(/'([^']+)'/g)].map((match) => match[1]);

    expect(reserved.length).toBeGreaterThan(0);
    expect([...reserved].sort()).toEqual([...RESERVED_SLUGS].sort());
  });
});

describe("the app reads what the database holds", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createDb();
  });

  it("parses an event and a guest as the dashboard queries select them", async () => {
    const { parseEventRow, parseGuestRow, EVENT_COLUMNS, GUEST_COLUMNS } = await import("@/lib/events/records");

    await db.exec(`
      insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000aa', 'host@example.com');
      insert into public.a41_organizations (id, name, created_by) values
        ('00000000-0000-0000-0000-0000000000bb', 'Acme', '00000000-0000-0000-0000-0000000000aa');
      insert into public.a41_events (id, org_id, name, slug, type, starts_at, ends_at)
        values ('00000000-0000-0000-0000-0000000000cc', '00000000-0000-0000-0000-0000000000bb', 'Annual Dinner', 'annual-dinner', 'corporate',
                '2026-12-05T11:00:00Z', '2026-12-05T15:00:00Z');
      insert into public.a41_guests (event_id, name, email, tags)
        values ('00000000-0000-0000-0000-0000000000cc', 'Dewi', 'dewi@example.com', '{VIP,Board}');
    `);

    // PostgREST answers with JSON, where timestamps are strings.
    const events = await db.query<{ row: unknown }>(
      `select to_jsonb(t) as row from (select ${EVENT_COLUMNS} from public.a41_events) t`,
    );
    expect(parseEventRow(events.rows[0].row)).toMatchObject({
      name: "Annual Dinner",
      slug: "annual-dinner",
      type: "corporate",
      timezone: "Asia/Jakarta",
      package: "free",
      extraGuests: 0,
      status: "draft",
      theme: { preset: "midnight", font: "modern" },
    });

    const guests = await db.query<{ row: unknown }>(
      `select to_jsonb(t) as row from (select ${GUEST_COLUMNS} from public.a41_guests) t`,
    );
    expect(parseGuestRow(guests.rows[0].row)).toMatchObject({
      name: "Dewi",
      email: "dewi@example.com",
      phone: null,
      tags: ["VIP", "Board"],
      tableNo: null,
      status: "invited",
    });
  });
});

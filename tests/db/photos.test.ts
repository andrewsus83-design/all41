import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  MAX_PHOTO_BYTES,
  MAX_PHOTOS_PER_GUEST,
  PHOTO_BUCKET,
  PHOTO_MIME_TYPES,
  PHOTO_RETENTION_DAYS,
  UPLOAD_GRACE_HOURS,
} from '@/lib/photos/limits';
import { asAnon, asService, asUser, createDb } from './harness';

// The photo wall: settings, the upload ticket flow, the Storage policies, the
// guest and wall reads, moderation and retention. Storage itself is a stub in
// these tests (two tables), but the real policies run against it.
let db: PGlite;

beforeAll(async () => {
  db = await createDb();
});

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
  guestId: string;
  token: string;
}

interface FixtureOptions {
  status?: 'draft' | 'published' | 'archived';
  enabled?: boolean;
  moderation?: 'auto' | 'manual';
  /** Hours since the event ended; the event is still running when not set. */
  endedHoursAgo?: number;
}

/** An organization with an owner and a staff member, one event, and one guest. */
async function newFixture(options: FixtureOptions = {}): Promise<Fixture> {
  const { status = 'published', enabled = true, moderation = 'manual', endedHoursAgo } = options;
  const owner = await newUser();
  const staff = await newUser();
  const slug = `evt-${randomUUID().slice(0, 8)}`;

  const orgId = await asUser(db, owner, async () => {
    const { rows } = await db.query<{ id: string }>(`insert into a41_organizations (name) values ('Acme') returning id`);
    return rows[0].id;
  });
  await db.query(`insert into a41_memberships (org_id, user_id, role) values ($1, $2, 'staff')`, [orgId, staff]);

  const endsAt = endedHoursAgo === undefined ? `now() + interval '4 hours'` : `now() - interval '${endedHoursAgo} hours'`;
  const startsAt = endedHoursAgo === undefined ? `now() - interval '2 hours'` : `now() - interval '${endedHoursAgo + 3} hours'`;
  const eventId = await asUser(db, owner, async () => {
    const { rows } = await db.query<{ id: string }>(
      `insert into a41_events (org_id, name, slug, type, starts_at, ends_at)
       values ($1, 'Annual Gala', $2, 'corporate', ${startsAt}, ${endsAt}) returning id`,
      [orgId, slug],
    );
    return rows[0].id;
  });
  await asService(db, async () => {
    await db.query('update a41_events set status = $2 where id = $1', [eventId, status]);
    await db.query('update a41_photo_settings set enabled = $2, moderation = $3 where event_id = $1', [
      eventId,
      enabled,
      moderation,
    ]);
  });

  const { guestId, token } = await addGuest(owner, eventId, 'Dewi');
  return { owner, staff, orgId, eventId, slug, guestId, token };
}

async function addGuest(
  owner: string,
  eventId: string,
  name: string,
): Promise<{ eventId: string; guestId: string; token: string }> {
  await asUser(db, owner, () => db.query('insert into a41_guests (event_id, name) values ($1, $2)', [eventId, name]));
  const { rows } = await asService(db, () =>
    db.query<{ id: string; token: string }>(
      'select id, token from a41_guests where event_id = $1 and name = $2 order by created_at desc limit 1',
      [eventId, name],
    ),
  );
  return { eventId, guestId: rows[0].id, token: rows[0].token };
}

const newPath = (eventId: string, ext: 'webp' | 'jpg' = 'webp') => `${eventId}/${randomUUID()}.${ext}`;

interface Ticket {
  upload_path: string;
  ticket_expires_at: string;
  photos_left: number;
}

const requestUpload = async (token: string, format = 'webp', consent = true): Promise<Ticket> => {
  const { rows } = await asAnon(db, () =>
    db.query<Ticket>('select * from a41_request_photo_upload($1, $2, $3)', [token, format, consent]),
  );
  return rows[0];
};

/** What Storage does for a phone: insert the object's row as the caller, under row level security. */
const putObject = (path: string, { size = 120_000, mimetype = 'image/webp' } = {}, as: 'anon' | 'service' = 'anon') => {
  const run = () =>
    db.query(`insert into storage.objects (bucket_id, name, metadata) values ($1, $2, $3::jsonb)`, [
      PHOTO_BUCKET,
      path,
      JSON.stringify({ size, mimetype, contentLength: size }),
    ]);
  return as === 'anon' ? asAnon(db, run) : asService(db, run);
};

interface Committed {
  photo_id: string;
  photo_status: string;
  storage_path: string;
  created_at: string;
}

const commit = async (token: string, path: string): Promise<Committed> => {
  const { rows } = await asAnon(db, () => db.query<Committed>('select * from a41_commit_photo($1, $2)', [token, path]));
  return rows[0];
};

/** The whole happy path for one photo: ticket, upload, commit. */
async function uploadPhoto(fx: Pick<Fixture, 'token'>, size = 120_000): Promise<Committed> {
  const ticket = await requestUpload(fx.token);
  await putObject(ticket.upload_path, { size });
  return commit(fx.token, ticket.upload_path);
}

/** Inserts a photo row directly, as the server would after a commit. */
async function seedPhoto(
  fx: Pick<Fixture, 'eventId' | 'guestId'>,
  status: 'pending' | 'approved' | 'rejected' | 'removed' = 'approved',
): Promise<{ id: string; path: string }> {
  const path = newPath(fx.eventId);
  const { rows } = await asService(db, () =>
    db.query<{ id: string }>(
      `insert into a41_photos (event_id, guest_id, storage_path, status, bytes, content_type)
       values ($1, $2, $3, $4, 100000, 'image/webp') returning id`,
      [fx.eventId, fx.guestId, path, status],
    ),
  );
  return { id: rows[0].id, path };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function expectRejected(promise: Promise<unknown>, message: string | RegExp) {
  await expect(promise).rejects.toThrow(message);
}

describe('photo settings', () => {
  it('start with every event: off, manual moderation, an unguessable wall key', async () => {
    const owner = await newUser();
    const orgId = await asUser(db, owner, async () => {
      const { rows } = await db.query<{ id: string }>(`insert into a41_organizations (name) values ('Acme') returning id`);
      return rows[0].id;
    });
    const eventId = await asUser(db, owner, async () => {
      const { rows } = await db.query<{ id: string }>(
        `insert into a41_events (org_id, name, slug, type, starts_at, ends_at)
         values ($1, 'Gala', $2, 'corporate', now(), now() + interval '1 day') returning id`,
        [orgId, `evt-${randomUUID().slice(0, 8)}`],
      );
      return rows[0].id;
    });
    const { rows } = await asUser(db, owner, () =>
      db.query<{ enabled: boolean; moderation: string; wall_key: string }>(
        'select enabled, moderation, wall_key from a41_photo_settings where event_id = $1',
        [eventId],
      ),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].enabled).toBe(false);
    expect(rows[0].moderation).toBe('manual');
    expect(rows[0].wall_key).toMatch(/^[0-9a-f]{32}$/);
  });

  it('gives two events two different wall keys', async () => {
    const a = await newFixture();
    const b = await newFixture();
    const { rows } = await asService(db, () =>
      db.query<{ wall_key: string }>('select wall_key from a41_photo_settings where event_id in ($1, $2)', [a.eventId, b.eventId]),
    );
    expect(new Set(rows.map((row) => row.wall_key)).size).toBe(2);
  });

  it('are read by the team and nobody else', async () => {
    const fx = await newFixture();
    const stranger = await newUser();
    const read = (user: string) =>
      asUser(db, user, () => db.query('select event_id from a41_photo_settings where event_id = $1', [fx.eventId]));
    expect((await read(fx.owner)).rows).toHaveLength(1);
    expect((await read(fx.staff)).rows).toHaveLength(1);
    expect((await read(stranger)).rows).toHaveLength(0);
  });

  it('are changed by an owner, not by staff or a stranger', async () => {
    const fx = await newFixture({ enabled: false });
    const stranger = await newUser();
    const update = (user: string) =>
      asUser(db, user, () =>
        db.query(`update a41_photo_settings set enabled = true, moderation = 'auto' where event_id = $1`, [fx.eventId]),
      );

    expect((await update(fx.staff)).affectedRows).toBe(0);
    expect((await update(stranger)).affectedRows).toBe(0);
    expect((await update(fx.owner)).affectedRows).toBe(1);

    const { rows } = await asUser(db, fx.owner, () =>
      db.query('select enabled, moderation from a41_photo_settings where event_id = $1', [fx.eventId]),
    );
    expect(rows).toEqual([{ enabled: true, moderation: 'auto' }]);
  });

  it('only accept auto or manual moderation', async () => {
    const fx = await newFixture();
    await expectRejected(
      asUser(db, fx.owner, () => db.query(`update a41_photo_settings set moderation = 'off' where event_id = $1`, [fx.eventId])),
      /violates check constraint/,
    );
  });

  it('cannot be created, deleted or pointed at another event by users', async () => {
    const fx = await newFixture();
    const other = await newFixture();
    await expectRejected(
      asUser(db, fx.owner, () => db.query('insert into a41_photo_settings (event_id) values ($1)', [other.eventId])),
      /permission denied/,
    );
    await expectRejected(
      asUser(db, fx.owner, () => db.query('delete from a41_photo_settings where event_id = $1', [fx.eventId])),
      /permission denied/,
    );
    await expectRejected(
      asUser(db, fx.owner, () =>
        db.query('update a41_photo_settings set event_id = $2 where event_id = $1', [fx.eventId, other.eventId]),
      ),
      /permission denied/,
    );
  });

  it('keep the wall key out of reach of a direct update', async () => {
    const fx = await newFixture();
    await expectRejected(
      asUser(db, fx.owner, () =>
        db.query(`update a41_photo_settings set wall_key = 'my-own-guessable-key-0123456789abcdef' where event_id = $1`, [fx.eventId]),
      ),
      /permission denied/,
    );
  });
});

describe('regenerating the wall key', () => {
  const wallKey = async (eventId: string) =>
    (await asService(db, () => db.query<{ wall_key: string }>('select wall_key from a41_photo_settings where event_id = $1', [eventId])))
      .rows[0].wall_key;

  it('gives owners a new key and ends the old wall link', async () => {
    const fx = await newFixture();
    const before = await wallKey(fx.eventId);
    const { rows } = await asUser(db, fx.owner, () =>
      db.query<{ key: string }>('select a41_regenerate_wall_key($1) as key', [fx.eventId]),
    );
    expect(rows[0].key).toMatch(/^[0-9a-f]{32}$/);
    expect(rows[0].key).not.toBe(before);
    expect(await wallKey(fx.eventId)).toBe(rows[0].key);

    const feed = (key: string) =>
      asAnon(db, () => db.query<{ feed: unknown }>('select a41_wall_feed($1, $2) as feed', [fx.slug, key]));
    expect((await feed(before)).rows[0].feed).toBeNull();
    expect((await feed(rows[0].key)).rows[0].feed).not.toBeNull();
  });

  it('refuses staff, strangers and signed-out visitors', async () => {
    const fx = await newFixture();
    const before = await wallKey(fx.eventId);
    const stranger = await newUser();
    const regenerate = (run: <T>(fn: () => Promise<T>) => Promise<T>) =>
      run(() => db.query('select a41_regenerate_wall_key($1)', [fx.eventId]));

    await expectRejected(regenerate((fn) => asUser(db, fx.staff, fn)), 'forbidden');
    await expectRejected(regenerate((fn) => asUser(db, stranger, fn)), 'forbidden');
    await expectRejected(regenerate((fn) => asAnon(db, fn)), /permission denied/);
    expect(await wallKey(fx.eventId)).toBe(before);
  });
});

describe('access for signed-out visitors and strangers', () => {
  it.each(['a41_photo_settings', 'a41_photo_consents', 'a41_photo_tickets', 'a41_photos'])(
    'anon cannot read %s',
    async (table) => {
      await expectRejected(asAnon(db, () => db.query(`select * from ${table}`)), /permission denied/);
    },
  );

  it.each(['a41_photo_settings', 'a41_photo_consents', 'a41_photo_tickets', 'a41_photos'])(
    'anon cannot write %s',
    async (table) => {
      await expectRejected(asAnon(db, () => db.query(`delete from ${table}`)), /permission denied/);
    },
  );

  it('keeps upload tickets from every signed-in user, owners included', async () => {
    const fx = await newFixture();
    await requestUpload(fx.token);
    await expectRejected(asUser(db, fx.owner, () => db.query('select path from a41_photo_tickets')), /permission denied/);
  });

  it('lets nobody insert photos directly, only a41_commit_photo does', async () => {
    const fx = await newFixture();
    await expectRejected(
      asUser(db, fx.owner, () =>
        db.query(
          `insert into a41_photos (event_id, guest_id, storage_path, bytes, content_type)
           values ($1, $2, $3, 1000, 'image/webp')`,
          [fx.eventId, fx.guestId, newPath(fx.eventId)],
        ),
      ),
      /permission denied/,
    );
  });

  it('lets the team read consents and nobody else', async () => {
    const fx = await newFixture();
    await requestUpload(fx.token);
    const stranger = await newUser();
    const read = (user: string) => asUser(db, user, () => db.query('select guest_id from a41_photo_consents'));
    expect((await read(fx.staff)).rows).toHaveLength(1);
    expect((await read(stranger)).rows).toHaveLength(0);
    await expectRejected(
      asUser(db, fx.owner, () => db.query(`update a41_photo_consents set consented_at = now() - interval '1 year'`)),
      /permission denied/,
    );
  });
});

describe('a41_request_photo_upload', () => {
  it('gives a path of the event with a random name that does not hold the token', async () => {
    const fx = await newFixture();
    const ticket = await requestUpload(fx.token);
    expect(ticket.upload_path).toMatch(new RegExp(`^${fx.eventId}/[0-9a-f-]{36}\\.webp$`));
    expect(ticket.upload_path).not.toContain(fx.token);
    expect(new Date(ticket.ticket_expires_at).getTime()).toBeGreaterThan(Date.now());
    expect((await requestUpload(fx.token)).upload_path).not.toBe(ticket.upload_path);
  });

  it('also gives jpg paths, for browsers that cannot encode WebP, and nothing else', async () => {
    const fx = await newFixture();
    expect((await requestUpload(fx.token, 'jpg')).upload_path).toMatch(/\.jpg$/);
    for (const format of ['png', 'gif', 'WEBP', '', 'webp/../x']) {
      await expectRejected(requestUpload(fx.token, format), 'invalid_photo_format');
    }
  });

  it('answers the same to an unknown token, a draft event and an archived event', async () => {
    const draft = await newFixture({ status: 'draft' });
    const archived = await newFixture({ status: 'archived' });
    for (const token of ['0'.repeat(64), draft.token, archived.token]) {
      await expectRejected(requestUpload(token), 'invitation_not_found');
    }
  });

  it('is refused while the photo wall is off', async () => {
    const fx = await newFixture({ enabled: false });
    await expectRejected(requestUpload(fx.token), 'photos_disabled');
  });

  it('needs the guest to consent first, and remembers it with a timestamp', async () => {
    const fx = await newFixture();
    await expectRejected(requestUpload(fx.token, 'webp', false), 'consent_required');
    const before = Date.now();
    await requestUpload(fx.token, 'webp', true);

    const { rows } = await asService(db, () =>
      db.query<{ guest_id: string; event_id: string; consented_at: string }>(
        'select guest_id, event_id, consented_at from a41_photo_consents where guest_id = $1',
        [fx.guestId],
      ),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].event_id).toBe(fx.eventId);
    expect(Math.abs(new Date(rows[0].consented_at).getTime() - before)).toBeLessThan(60_000);

    // once given, later uploads do not ask again, and the first timestamp stays
    await requestUpload(fx.token, 'webp', false);
    await requestUpload(fx.token, 'webp', true);
    const again = await asService(db, () =>
      db.query<{ consented_at: string }>('select consented_at from a41_photo_consents where guest_id = $1', [fx.guestId]),
    );
    expect(again.rows).toEqual([{ consented_at: rows[0].consented_at }]);
  });

  it('does not take consent from another guest', async () => {
    const fx = await newFixture();
    const second = await addGuest(fx.owner, fx.eventId, 'Budi');
    await requestUpload(fx.token);
    await expectRejected(requestUpload(second.token, 'webp', false), 'consent_required');
  });

  it('stops after the last slot: photos and open tickets both count toward the limit of 10', async () => {
    const fx = await newFixture();
    const left: number[] = [];
    for (let i = 0; i < MAX_PHOTOS_PER_GUEST; i++) left.push((await requestUpload(fx.token)).photos_left);
    expect(left).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
    await expectRejected(requestUpload(fx.token), 'photo_limit_reached');
  });

  it('counts committed photos, so tickets do not have to stay open', async () => {
    const fx = await newFixture();
    for (let i = 0; i < MAX_PHOTOS_PER_GUEST - 2; i++) await uploadPhoto(fx);
    await requestUpload(fx.token);
    await requestUpload(fx.token);
    await expectRejected(requestUpload(fx.token), 'photo_limit_reached');
  });

  it('frees a slot when a guest takes a photo down', async () => {
    const fx = await newFixture();
    const photos: Committed[] = [];
    for (let i = 0; i < MAX_PHOTOS_PER_GUEST; i++) photos.push(await uploadPhoto(fx));
    await expectRejected(requestUpload(fx.token), 'photo_limit_reached');

    await asAnon(db, () => db.query('select a41_remove_my_photo($1, $2)', [fx.token, photos[0].photo_id]));
    expect((await requestUpload(fx.token)).photos_left).toBe(0);
  });

  it('gives every guest their own quota', async () => {
    const fx = await newFixture();
    const second = await addGuest(fx.owner, fx.eventId, 'Budi');
    for (let i = 0; i < MAX_PHOTOS_PER_GUEST; i++) await requestUpload(fx.token);
    await expectRejected(requestUpload(fx.token), 'photo_limit_reached');
    expect((await requestUpload(second.token)).photos_left).toBe(MAX_PHOTOS_PER_GUEST - 1);
  });

  it('does not count tickets that ran out', async () => {
    const fx = await newFixture();
    for (let i = 0; i < MAX_PHOTOS_PER_GUEST; i++) await requestUpload(fx.token);
    await asService(db, () =>
      db.query(`update a41_photo_tickets set expires_at = now() - interval '1 minute' where guest_id = $1`, [fx.guestId]),
    );
    expect((await requestUpload(fx.token)).photos_left).toBe(MAX_PHOTOS_PER_GUEST - 1);
    const { rows } = await asService(db, () =>
      db.query<{ n: number }>('select count(*)::int as n from a41_photo_tickets where guest_id = $1', [fx.guestId]),
    );
    expect(rows[0].n).toBe(1);
  });

  it('serializes simultaneous requests, so two phones cannot take the last slot', async () => {
    const fx = await newFixture();
    for (let i = 0; i < MAX_PHOTOS_PER_GUEST - 1; i++) await requestUpload(fx.token);
    const results = await Promise.allSettled([requestUpload(fx.token), requestUpload(fx.token)]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  });

  it('stays open for a while after the event and then closes', async () => {
    const justEnded = await newFixture({ endedHoursAgo: UPLOAD_GRACE_HOURS - 1 });
    expect((await requestUpload(justEnded.token)).upload_path).toBeTruthy();

    const longEnded = await newFixture({ endedHoursAgo: UPLOAD_GRACE_HOURS + 1 });
    await expectRejected(requestUpload(longEnded.token), 'photos_closed');
  });
});

describe('Storage policies on the a41_photos bucket', () => {
  it('has a public bucket with the size and type limits of the product', async () => {
    const { rows } = await asService(db, () =>
      db.query<{ public: boolean; file_size_limit: string; allowed_mime_types: string[] }>(
        'select public, file_size_limit, allowed_mime_types from storage.buckets where id = $1',
        [PHOTO_BUCKET],
      ),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].public).toBe(true);
    expect(Number(rows[0].file_size_limit)).toBe(MAX_PHOTO_BYTES);
    expect([...rows[0].allowed_mime_types].sort()).toEqual([...PHOTO_MIME_TYPES].sort());
  });

  it('lets a phone upload to the path it was given', async () => {
    const fx = await newFixture();
    const ticket = await requestUpload(fx.token);
    await putObject(ticket.upload_path);
    const { rows } = await asService(db, () =>
      db.query('select 1 from storage.objects where bucket_id = $1 and name = $2', [PHOTO_BUCKET, ticket.upload_path]),
    );
    expect(rows).toHaveLength(1);
  });

  it('refuses an upload without a ticket, to a made-up path or to someone else path', async () => {
    const fx = await newFixture();
    await requestUpload(fx.token);
    await expectRejected(putObject(newPath(fx.eventId)), /row-level security/);
    await expectRejected(putObject(`${fx.eventId}/${fx.token}.webp`), /row-level security/);
    await expectRejected(putObject('anything.webp'), /row-level security/);
  });

  it('refuses a ticket path in another bucket', async () => {
    const fx = await newFixture();
    const ticket = await requestUpload(fx.token);
    await asService(db, () => db.query(`insert into storage.buckets (id, name) values ('wos_invitations', 'wos_invitations')`));
    await expectRejected(
      asAnon(db, () =>
        db.query(`insert into storage.objects (bucket_id, name, metadata) values ('wos_invitations', $1, '{}'::jsonb)`, [ticket.upload_path]),
      ),
      /row-level security/,
    );
  });

  it('refuses an upload once the ticket has run out', async () => {
    const fx = await newFixture();
    const ticket = await requestUpload(fx.token);
    await asService(db, () =>
      db.query(`update a41_photo_tickets set expires_at = now() - interval '1 second' where path = $1`, [ticket.upload_path]),
    );
    await expectRejected(putObject(ticket.upload_path), /row-level security/);
  });

  it('refuses to put a second file on a path', async () => {
    const fx = await newFixture();
    const ticket = await requestUpload(fx.token);
    await putObject(ticket.upload_path);
    await expectRejected(putObject(ticket.upload_path), /duplicate key|unique/);
  });

  it('does not let anyone overwrite or read what is in the bucket', async () => {
    const fx = await newFixture();
    const photo = await uploadPhoto(fx);

    const overwrite = await asAnon(db, () =>
      db.query(`update storage.objects set metadata = '{"size": 1}'::jsonb where name = $1`, [photo.storage_path]),
    );
    expect(overwrite.affectedRows).toBe(0);

    const names = (run: <T>(fn: () => Promise<T>) => Promise<T>) =>
      run(() => db.query('select name from storage.objects where bucket_id = $1 and name like $2', [PHOTO_BUCKET, `${fx.eventId}/%`]));
    expect((await names((fn) => asAnon(db, fn))).rows).toEqual([]);
    const stranger = await newUser();
    expect((await names((fn) => asUser(db, stranger, fn))).rows).toEqual([]);
  });

  it('lets the owners of an event delete its files, and nobody else', async () => {
    const fx = await newFixture();
    const other = await newFixture();
    const photo = await uploadPhoto(fx);
    const del = (user: string | null) => {
      const run = () => db.query('delete from storage.objects where bucket_id = $1 and name = $2', [PHOTO_BUCKET, photo.storage_path]);
      return user ? asUser(db, user, run) : asAnon(db, run);
    };

    expect((await del(null)).affectedRows).toBe(0);
    expect((await del(fx.staff)).affectedRows).toBe(0);
    expect((await del(other.owner)).affectedRows).toBe(0);
    expect((await del(fx.owner)).affectedRows).toBe(1);
  });

  it('lets owners see the files of their event only', async () => {
    const fx = await newFixture();
    const other = await newFixture();
    await uploadPhoto(fx);
    const seen = (user: string) =>
      asUser(db, user, () =>
        db.query('select name from storage.objects where bucket_id = $1 and name like $2', [PHOTO_BUCKET, `${fx.eventId}/%`]),
      );
    expect((await seen(fx.owner)).rows).toHaveLength(1);
    expect((await seen(fx.staff)).rows).toHaveLength(0);
    const strangers = await asUser(db, other.owner, () =>
      db.query('select name from storage.objects where bucket_id = $1 and name like $2', [PHOTO_BUCKET, `${fx.eventId}/%`]),
    );
    expect(strangers.rows).toHaveLength(0);
  });

  it('lets a guest delete the file of a photo they took down, and only that one', async () => {
    const fx = await newFixture();
    const kept = await uploadPhoto(fx);
    const taken = await uploadPhoto(fx);
    const del = (path: string) =>
      asAnon(db, () => db.query('delete from storage.objects where bucket_id = $1 and name = $2', [PHOTO_BUCKET, path]));

    expect((await del(taken.storage_path)).affectedRows).toBe(0);
    await asAnon(db, () => db.query('select a41_remove_my_photo($1, $2)', [fx.token, taken.photo_id]));
    expect((await del(kept.storage_path)).affectedRows).toBe(0);
    expect((await del(taken.storage_path)).affectedRows).toBe(1);
  });

  it('does not touch the objects of other buckets', async () => {
    const stranger = await newUser();
    await asService(db, async () => {
      await db.query(`insert into storage.buckets (id, name) values ('wos_gallery', 'wos_gallery')`);
      await db.query(`insert into storage.objects (bucket_id, name, metadata) values ('wos_gallery', 'not-a-uuid/x.png', '{}'::jsonb)`);
    });
    // The policies run for every object, so they must cope with names that are no uuid.
    const seen = await asUser(db, stranger, () => db.query(`select name from storage.objects where bucket_id = 'wos_gallery'`));
    expect(seen.rows).toEqual([]);
    const removed = await asUser(db, stranger, () => db.query(`delete from storage.objects where bucket_id = 'wos_gallery'`));
    expect(removed.affectedRows).toBe(0);
  });
});

describe('a41_commit_photo', () => {
  it('turns an uploaded file into a pending photo and uses up the ticket', async () => {
    const fx = await newFixture();
    const ticket = await requestUpload(fx.token);
    await putObject(ticket.upload_path, { size: 345_678 });
    const photo = await commit(fx.token, ticket.upload_path);

    expect(photo.photo_status).toBe('pending');
    expect(photo.storage_path).toBe(ticket.upload_path);

    const { rows } = await asService(db, () =>
      db.query<{ event_id: string; guest_id: string; bytes: number; content_type: string; approved_at: string | null }>(
        'select event_id, guest_id, bytes, content_type, approved_at from a41_photos where id = $1',
        [photo.photo_id],
      ),
    );
    expect(rows).toEqual([
      { event_id: fx.eventId, guest_id: fx.guestId, bytes: 345_678, content_type: 'image/webp', approved_at: null },
    ]);
    const tickets = await asService(db, () => db.query('select 1 from a41_photo_tickets where path = $1', [ticket.upload_path]));
    expect(tickets.rows).toHaveLength(0);
  });

  it('shows photos right away when the host chose automatic moderation', async () => {
    const fx = await newFixture({ moderation: 'auto' });
    const photo = await uploadPhoto(fx);
    expect(photo.photo_status).toBe('approved');
    const { rows } = await asService(db, () =>
      db.query<{ approved_at: string | null }>('select approved_at from a41_photos where id = $1', [photo.photo_id]),
    );
    expect(rows[0].approved_at).not.toBeNull();
  });

  it('keeps jpeg uploads as jpeg', async () => {
    const fx = await newFixture();
    const ticket = await requestUpload(fx.token, 'jpg');
    await putObject(ticket.upload_path, { mimetype: 'image/jpeg' });
    await commit(fx.token, ticket.upload_path);
    const { rows } = await asService(db, () =>
      db.query<{ content_type: string }>('select content_type from a41_photos where storage_path = $1', [ticket.upload_path]),
    );
    expect(rows).toEqual([{ content_type: 'image/jpeg' }]);
  });

  it('returns the same photo when the response was lost and the phone asks again', async () => {
    const fx = await newFixture();
    const ticket = await requestUpload(fx.token);
    await putObject(ticket.upload_path);
    const first = await commit(fx.token, ticket.upload_path);
    const second = await commit(fx.token, ticket.upload_path);
    expect(second.photo_id).toBe(first.photo_id);
    const { rows } = await asService(db, () =>
      db.query<{ n: number }>('select count(*)::int as n from a41_photos where guest_id = $1', [fx.guestId]),
    );
    expect(rows[0].n).toBe(1);
  });

  it('commits one photo when two phones commit the same path at once', async () => {
    const fx = await newFixture();
    const ticket = await requestUpload(fx.token);
    await putObject(ticket.upload_path);
    const [a, b] = await Promise.all([commit(fx.token, ticket.upload_path), commit(fx.token, ticket.upload_path)]);
    expect(a.photo_id).toBe(b.photo_id);
  });

  it('refuses a path nobody gave out', async () => {
    const fx = await newFixture();
    const path = newPath(fx.eventId);
    await putObject(path, {}, 'service');
    await expectRejected(commit(fx.token, path), 'upload_ticket_invalid');
  });

  it('refuses the ticket of another guest, even in the same event', async () => {
    const fx = await newFixture();
    const second = await addGuest(fx.owner, fx.eventId, 'Budi');
    const ticket = await requestUpload(second.token);
    await putObject(ticket.upload_path);
    await expectRejected(commit(fx.token, ticket.upload_path), 'upload_ticket_invalid');
    expect((await commit(second.token, ticket.upload_path)).photo_status).toBe('pending');
  });

  it('refuses a ticket that ran out', async () => {
    const fx = await newFixture();
    const ticket = await requestUpload(fx.token);
    await putObject(ticket.upload_path);
    await asService(db, () =>
      db.query(`update a41_photo_tickets set expires_at = now() - interval '1 second' where path = $1`, [ticket.upload_path]),
    );
    await expectRejected(commit(fx.token, ticket.upload_path), 'upload_ticket_invalid');
  });

  it('refuses when the file never arrived', async () => {
    const fx = await newFixture();
    const ticket = await requestUpload(fx.token);
    await expectRejected(commit(fx.token, ticket.upload_path), 'upload_missing');
  });

  it('checks the size and the type of the file that arrived', async () => {
    const fx = await newFixture();
    const tooBig = await requestUpload(fx.token);
    await putObject(tooBig.upload_path, { size: MAX_PHOTO_BYTES + 1 }, 'service');
    await expectRejected(commit(fx.token, tooBig.upload_path), 'photo_too_large');

    const empty = await requestUpload(fx.token);
    await putObject(empty.upload_path, { size: 0 }, 'service');
    await expectRejected(commit(fx.token, empty.upload_path), 'photo_too_large');

    const exact = await requestUpload(fx.token);
    await putObject(exact.upload_path, { size: MAX_PHOTO_BYTES }, 'service');
    expect((await commit(fx.token, exact.upload_path)).photo_status).toBe('pending');

    const wrongType = await requestUpload(fx.token, 'webp');
    await putObject(wrongType.upload_path, { mimetype: 'image/jpeg' }, 'service');
    await expectRejected(commit(fx.token, wrongType.upload_path), 'invalid_photo_type');

    const html = await requestUpload(fx.token, 'jpg');
    await putObject(html.upload_path, { mimetype: 'text/html' }, 'service');
    await expectRejected(commit(fx.token, html.upload_path), 'invalid_photo_type');
  });

  it('answers the same to an unknown token as to a draft event', async () => {
    const fx = await newFixture();
    const draft = await newFixture({ status: 'draft' });
    const path = newPath(fx.eventId);
    await expectRejected(commit('0'.repeat(64), path), 'invitation_not_found');
    await expectRejected(commit(draft.token, path), 'invitation_not_found');
  });

  it('refuses when the host switched the photo wall off in the meantime', async () => {
    const fx = await newFixture();
    const ticket = await requestUpload(fx.token);
    await putObject(ticket.upload_path);
    await asService(db, () => db.query('update a41_photo_settings set enabled = false where event_id = $1', [fx.eventId]));
    await expectRejected(commit(fx.token, ticket.upload_path), 'photos_disabled');
  });

  it('keeps the photo rows to the limits of the product', async () => {
    const fx = await newFixture();
    const insert = (size: number, type = 'image/webp', path = newPath(fx.eventId)) =>
      asService(db, () =>
        db.query(
          `insert into a41_photos (event_id, guest_id, storage_path, bytes, content_type) values ($1, $2, $3, $4, $5)`,
          [fx.eventId, fx.guestId, path, size, type],
        ),
      );
    await expectRejected(insert(MAX_PHOTO_BYTES + 1), /violates check constraint/);
    await expectRejected(insert(0), /violates check constraint/);
    await expectRejected(insert(1000, 'image/png'), /violates check constraint/);
    await expectRejected(insert(1000, 'image/jpeg'), /violates check constraint/); // a .webp path
    await expectRejected(insert(1000, 'image/webp', `${randomUUID()}/${randomUUID()}.webp`), /violates check constraint/); // another event's folder
    await expectRejected(insert(1000, 'image/webp', `${fx.eventId}/${fx.token}.webp`), /violates check constraint/);
  });

  it('expires a photo 30 days after it was taken', async () => {
    const fx = await newFixture();
    const photo = await uploadPhoto(fx);
    const { rows } = await asService(db, () =>
      db.query<{ days: number }>(
        `select extract(epoch from (expires_at - created_at)) / 86400 as days from a41_photos where id = $1`,
        [photo.photo_id],
      ),
    );
    expect(Number(rows[0].days)).toBe(PHOTO_RETENTION_DAYS);
  });
});

describe('what a guest sees', () => {
  it('gives the camera page the event, the consent and how many photos are used', async () => {
    const fx = await newFixture({ moderation: 'manual' });
    const overview = () =>
      asAnon(db, () =>
        db.query<{
          guest_name: string;
          event_name: string;
          event_slug: string;
          photos_enabled: boolean;
          uploads_open: boolean;
          moderation: string;
          consented_at: string | null;
          photos_used: number;
          photo_quota: number;
        }>('select * from a41_photo_overview($1)', [fx.token]),
      );

    const before = (await overview()).rows[0];
    expect(before).toMatchObject({
      guest_name: 'Dewi',
      event_name: 'Annual Gala',
      event_slug: fx.slug,
      photos_enabled: true,
      uploads_open: true,
      moderation: 'manual',
      consented_at: null,
      photos_used: 0,
      photo_quota: MAX_PHOTOS_PER_GUEST,
    });

    await uploadPhoto(fx);
    const after = (await overview()).rows[0];
    expect(after.photos_used).toBe(1);
    expect(after.consented_at).not.toBeNull();
  });

  it('says uploads are closed when the wall is off or the event is long over', async () => {
    const off = await newFixture({ enabled: false });
    const over = await newFixture({ endedHoursAgo: UPLOAD_GRACE_HOURS + 1 });
    const read = (token: string) =>
      asAnon(db, () => db.query<{ photos_enabled: boolean; uploads_open: boolean }>('select photos_enabled, uploads_open from a41_photo_overview($1)', [token]));
    expect((await read(off.token)).rows).toEqual([{ photos_enabled: false, uploads_open: false }]);
    expect((await read(over.token)).rows).toEqual([{ photos_enabled: true, uploads_open: false }]);
  });

  it('shows nothing to an unknown token or an unpublished event', async () => {
    const draft = await newFixture({ status: 'draft' });
    for (const token of ['0'.repeat(64), draft.token]) {
      const overview = await asAnon(db, () => db.query('select * from a41_photo_overview($1)', [token]));
      const mine = await asAnon(db, () => db.query('select * from a41_my_photos($1)', [token]));
      const album = await asAnon(db, () => db.query('select * from a41_album($1)', [token]));
      expect([overview.rows, mine.rows, album.rows]).toEqual([[], [], []]);
    }
  });

  it('lists only the guest own photos, with their status, newest first', async () => {
    const fx = await newFixture();
    const second = await addGuest(fx.owner, fx.eventId, 'Budi');
    const older = await seedPhoto(fx, 'pending');
    const newer = await seedPhoto(fx, 'rejected');
    await seedPhoto(fx, 'removed');
    await seedPhoto(second, 'approved');
    await asService(db, () => db.query(`update a41_photos set created_at = now() - interval '1 hour' where id = $1`, [older.id]));

    const { rows } = await asAnon(db, () =>
      db.query<{ photo_id: string; photo_status: string }>('select photo_id, photo_status from a41_my_photos($1)', [fx.token]),
    );
    expect(rows).toEqual([
      { photo_id: newer.id, photo_status: 'rejected' },
      { photo_id: older.id, photo_status: 'pending' },
    ]);
  });

  it('stops listing photos after their 30 days', async () => {
    const fx = await newFixture();
    const old = await seedPhoto(fx, 'approved');
    await asService(db, () => db.query(`update a41_photos set expires_at = now() - interval '1 second' where id = $1`, [old.id]));
    const mine = await asAnon(db, () => db.query('select * from a41_my_photos($1)', [fx.token]));
    const album = await asAnon(db, () => db.query('select * from a41_album($1)', [fx.token]));
    expect([mine.rows, album.rows]).toEqual([[], []]);
  });
});

describe('a41_album', () => {
  it('shows the approved photos of everyone at the event, marking the guest own', async () => {
    const fx = await newFixture();
    const second = await addGuest(fx.owner, fx.eventId, 'Budi');
    const mine = await seedPhoto(fx, 'approved');
    const theirs = await seedPhoto(second, 'approved');
    await seedPhoto(fx, 'pending');
    await seedPhoto(second, 'rejected');
    await seedPhoto(second, 'removed');

    const { rows } = await asAnon(db, () =>
      db.query<{ photo_id: string; is_mine: boolean }>('select photo_id, is_mine from a41_album($1)', [fx.token]),
    );
    expect(rows).toEqual([
      { photo_id: theirs.id, is_mine: false },
      { photo_id: mine.id, is_mine: true },
    ]);
  });

  it('never shows the photos of another event', async () => {
    const fx = await newFixture();
    const other = await newFixture();
    await seedPhoto(other, 'approved');
    const { rows } = await asAnon(db, () => db.query('select * from a41_album($1)', [fx.token]));
    expect(rows).toEqual([]);
  });

  it('shows nothing while the photo wall is off', async () => {
    const fx = await newFixture();
    await seedPhoto(fx, 'approved');
    await asService(db, () => db.query('update a41_photo_settings set enabled = false where event_id = $1', [fx.eventId]));
    const { rows } = await asAnon(db, () => db.query('select * from a41_album($1)', [fx.token]));
    expect(rows).toEqual([]);
  });

  it('pages through the photos newest first without skipping or repeating any', async () => {
    const fx = await newFixture({ moderation: 'auto' });
    const ids: string[] = [];
    for (let i = 0; i < 5; i++) ids.push((await uploadPhoto(fx)).photo_id);
    // one statement approves several photos at once
    const [first, second] = [await seedPhoto(fx, 'pending'), await seedPhoto(fx, 'pending')];
    await asUser(db, fx.owner, () => db.query(`update a41_photos set status = 'approved' where status = 'pending' and event_id = $1`, [fx.eventId]));
    const expected = [first.id, second.id, ...ids].length;

    const seen: string[] = [];
    let cursor: { at: string; id: string } | null = null;
    for (let page = 0; page < 10; page++) {
      const { rows }: { rows: { photo_id: string; approved_at: string }[] } = await asAnon(db, () =>
        cursor
          ? db.query('select photo_id, approved_at from a41_album($1, 3, $2, $3)', [fx.token, cursor.at, cursor.id])
          : db.query('select photo_id, approved_at from a41_album($1, 3)', [fx.token]),
      );
      if (rows.length === 0) break;
      seen.push(...rows.map((row) => row.photo_id));
      const last = rows[rows.length - 1];
      cursor = { at: new Date(last.approved_at).toISOString(), id: last.photo_id };
    }
    expect(seen).toHaveLength(expected);
    expect(new Set(seen).size).toBe(expected);
  });

  it('caps a page at 200 photos', async () => {
    const fx = await newFixture();
    await asService(db, () =>
      db.query(
        `insert into a41_photos (event_id, guest_id, storage_path, status, bytes, content_type)
         select $1::uuid, $2::uuid, $1::uuid::text || '/' || gen_random_uuid()::text || '.webp', 'approved', 1000, 'image/webp'
         from generate_series(1, 205)`,
        [fx.eventId, fx.guestId],
      ),
    );
    const { rows } = await asAnon(db, () => db.query('select * from a41_album($1, 5000)', [fx.token]));
    expect(rows).toHaveLength(200);
  });
});

describe('a41_remove_my_photo', () => {
  it('takes the guest own photo down everywhere and returns its path', async () => {
    const fx = await newFixture({ moderation: 'auto' });
    const photo = await uploadPhoto(fx);
    const { rows } = await asAnon(db, () => db.query<{ path: string | null }>('select a41_remove_my_photo($1, $2) as path', [fx.token, photo.photo_id]));
    expect(rows[0].path).toBe(photo.storage_path);

    const album = await asAnon(db, () => db.query('select * from a41_album($1)', [fx.token]));
    const mine = await asAnon(db, () => db.query('select * from a41_my_photos($1)', [fx.token]));
    expect([album.rows, mine.rows]).toEqual([[], []]);
  });

  it('does nothing the second time, or for a photo of someone else', async () => {
    const fx = await newFixture();
    const second = await addGuest(fx.owner, fx.eventId, 'Budi');
    const mine = await seedPhoto(fx, 'approved');
    const theirs = await seedPhoto(second, 'approved');
    const remove = (token: string, id: string) =>
      asAnon(db, () => db.query<{ path: string | null }>('select a41_remove_my_photo($1, $2) as path', [token, id]));

    expect((await remove(fx.token, theirs.id)).rows[0].path).toBeNull();
    expect((await remove(fx.token, mine.id)).rows[0].path).toBe(mine.path);
    expect((await remove(fx.token, mine.id)).rows[0].path).toBeNull();
    expect((await remove(fx.token, randomUUID())).rows[0].path).toBeNull();
    const { rows } = await asService(db, () => db.query('select status from a41_photos where id = $1', [theirs.id]));
    expect(rows).toEqual([{ status: 'approved' }]);
  });

  it('answers the same to an unknown token', async () => {
    const fx = await newFixture();
    const photo = await seedPhoto(fx, 'approved');
    await expectRejected(
      asAnon(db, () => db.query('select a41_remove_my_photo($1, $2)', ['0'.repeat(64), photo.id])),
      'invitation_not_found',
    );
  });
});

describe('moderation', () => {
  it('lets owners approve, reject and put a photo back to pending, stamping when it became visible', async () => {
    const fx = await newFixture();
    const photo = await seedPhoto(fx, 'pending');
    const setStatus = (status: string) =>
      asUser(db, fx.owner, () => db.query('update a41_photos set status = $2 where id = $1', [photo.id, status]));
    const read = () =>
      asService(db, () => db.query<{ status: string; approved_at: string | null }>('select status, approved_at from a41_photos where id = $1', [photo.id]));

    await setStatus('approved');
    const approved = (await read()).rows[0];
    expect(approved.status).toBe('approved');
    expect(approved.approved_at).not.toBeNull();

    await sleep(5);
    await setStatus('approved'); // approving twice keeps the first time
    expect(new Date((await read()).rows[0].approved_at ?? 0).getTime()).toBe(new Date(approved.approved_at ?? 0).getTime());

    await setStatus('rejected');
    expect((await read()).rows[0]).toEqual({ status: 'rejected', approved_at: null });

    await sleep(5);
    await setStatus('pending');
    await setStatus('approved');
    expect(new Date((await read()).rows[0].approved_at ?? 0).getTime()).toBeGreaterThan(new Date(approved.approved_at ?? 0).getTime());
  });

  it('is not allowed for staff or strangers', async () => {
    const fx = await newFixture();
    const stranger = await newUser();
    const photo = await seedPhoto(fx, 'pending');
    const approve = (user: string) =>
      asUser(db, user, () => db.query(`update a41_photos set status = 'approved' where id = $1`, [photo.id]));
    expect((await approve(fx.staff)).affectedRows).toBe(0);
    expect((await approve(stranger)).affectedRows).toBe(0);
    const { rows } = await asService(db, () => db.query('select status from a41_photos where id = $1', [photo.id]));
    expect(rows).toEqual([{ status: 'pending' }]);
  });

  it('cannot approve the photos of another organization', async () => {
    const fx = await newFixture();
    const other = await newFixture();
    const photo = await seedPhoto(fx, 'pending');
    const result = await asUser(db, other.owner, () =>
      db.query(`update a41_photos set status = 'approved' where id = $1`, [photo.id]),
    );
    expect(result.affectedRows).toBe(0);
  });

  it('only changes the status: not the file, the owner of the photo, or the clock', async () => {
    const fx = await newFixture();
    const other = await newFixture();
    const photo = await seedPhoto(fx, 'pending');
    for (const assignment of [
      `storage_path = '${fx.eventId}/${randomUUID()}.webp'`,
      `event_id = '${other.eventId}'`,
      `guest_id = '${other.guestId}'`,
      `approved_at = now()`,
      `expires_at = now() + interval '1 year'`,
      `bytes = 1`,
      `created_at = now()`,
    ]) {
      await expectRejected(
        asUser(db, fx.owner, () => db.query(`update a41_photos set ${assignment} where id = $1`, [photo.id])),
        /permission denied/,
      );
    }
  });

  it('cannot mark a photo removed, and cannot bring a removed one back', async () => {
    const fx = await newFixture();
    const live = await seedPhoto(fx, 'approved');
    const taken = await seedPhoto(fx, 'removed');
    await expectRejected(
      asUser(db, fx.owner, () => db.query(`update a41_photos set status = 'removed' where id = $1`, [live.id])),
      /row-level security|violates check constraint/,
    );
    const revive = await asUser(db, fx.owner, () => db.query(`update a41_photos set status = 'approved' where id = $1`, [taken.id]));
    expect(revive.affectedRows).toBe(0);
  });

  it('lets owners approve all waiting photos at once', async () => {
    const fx = await newFixture();
    for (let i = 0; i < 4; i++) await seedPhoto(fx, 'pending');
    const rejected = await seedPhoto(fx, 'rejected');
    const result = await asUser(db, fx.owner, () =>
      db.query(`update a41_photos set status = 'approved' where event_id = $1 and status = 'pending'`, [fx.eventId]),
    );
    expect(result.affectedRows).toBe(4);
    const { rows } = await asService(db, () => db.query('select status from a41_photos where id = $1', [rejected.id]));
    expect(rows).toEqual([{ status: 'rejected' }]);
  });

  it('lets the team see the photos of their event and nobody else', async () => {
    const fx = await newFixture();
    const stranger = await newUser();
    await seedPhoto(fx, 'pending');
    const read = (user: string) => asUser(db, user, () => db.query('select id from a41_photos'));
    expect((await read(fx.owner)).rows).toHaveLength(1);
    expect((await read(fx.staff)).rows).toHaveLength(1);
    expect((await read(stranger)).rows).toHaveLength(0);
  });

  it('lets owners delete a photo row, staff and strangers not', async () => {
    const fx = await newFixture();
    const stranger = await newUser();
    const photo = await seedPhoto(fx, 'approved');
    const del = (user: string) => asUser(db, user, () => db.query('delete from a41_photos where id = $1', [photo.id]));
    expect((await del(fx.staff)).affectedRows).toBe(0);
    expect((await del(stranger)).affectedRows).toBe(0);
    expect((await del(fx.owner)).affectedRows).toBe(1);
  });

  it('shows a moderated photo on the wall only while it is approved', async () => {
    const fx = await newFixture();
    const photo = await seedPhoto(fx, 'pending');
    const key = (await asService(db, () => db.query<{ wall_key: string }>('select wall_key from a41_photo_settings where event_id = $1', [fx.eventId]))).rows[0].wall_key;
    const onWall = async () => {
      const { rows } = await asAnon(db, () => db.query<{ feed: { photos: { id: string }[] } }>('select a41_wall_feed($1, $2) as feed', [fx.slug, key]));
      return rows[0].feed.photos.map((p) => p.id);
    };

    expect(await onWall()).toEqual([]);
    await asUser(db, fx.owner, () => db.query(`update a41_photos set status = 'approved' where id = $1`, [photo.id]));
    expect(await onWall()).toEqual([photo.id]);
    await asUser(db, fx.owner, () => db.query(`update a41_photos set status = 'rejected' where id = $1`, [photo.id]));
    expect(await onWall()).toEqual([]);
  });
});

describe('a41_wall_feed', () => {
  const keyOf = async (eventId: string) =>
    (await asService(db, () => db.query<{ wall_key: string }>('select wall_key from a41_photo_settings where event_id = $1', [eventId])))
      .rows[0].wall_key;
  const feedOf = async (slug: string, key: string, limit?: number) => {
    const { rows } = await asAnon(db, () =>
      limit === undefined
        ? db.query<{ feed: any }>('select a41_wall_feed($1, $2) as feed', [slug, key]) // eslint-disable-line @typescript-eslint/no-explicit-any
        : db.query<{ feed: any }>('select a41_wall_feed($1, $2, $3) as feed', [slug, key, limit]), // eslint-disable-line @typescript-eslint/no-explicit-any
    );
    return rows[0].feed;
  };

  it('needs the right slug and the right key', async () => {
    const fx = await newFixture();
    const other = await newFixture();
    expect(await feedOf(fx.slug, await keyOf(fx.eventId))).not.toBeNull();
    expect(await feedOf(fx.slug, await keyOf(other.eventId))).toBeNull();
    expect(await feedOf(fx.slug, '')).toBeNull();
    expect(await feedOf(fx.slug, 'x')).toBeNull();
    expect(await feedOf('no-such-event', await keyOf(fx.eventId))).toBeNull();
  });

  it('is closed for draft and archived events, even with the right key', async () => {
    const draft = await newFixture({ status: 'draft' });
    const archived = await newFixture({ status: 'archived' });
    expect(await feedOf(draft.slug, await keyOf(draft.eventId))).toBeNull();
    expect(await feedOf(archived.slug, await keyOf(archived.eventId))).toBeNull();
  });

  it('gives the event look and the newest approved photos first, with a total', async () => {
    const fx = await newFixture();
    const first = await seedPhoto(fx, 'approved');
    await sleep(5);
    const second = await seedPhoto(fx, 'approved');
    await seedPhoto(fx, 'pending');
    await seedPhoto(fx, 'rejected');
    await seedPhoto(fx, 'removed');
    const expired = await seedPhoto(fx, 'approved');
    await asService(db, () => db.query(`update a41_photos set expires_at = now() - interval '1 second' where id = $1`, [expired.id]));
    const other = await newFixture();
    await seedPhoto(other, 'approved');

    const feed = await feedOf(fx.slug, await keyOf(fx.eventId));
    expect(feed.enabled).toBe(true);
    expect(feed.event).toMatchObject({ name: 'Annual Gala', slug: fx.slug, timezone: 'Asia/Jakarta' });
    expect(feed.total).toBe(2);
    expect(feed.photos.map((photo: { id: string }) => photo.id)).toEqual([second.id, first.id]);
    expect(Object.keys(feed.photos[0]).sort()).toEqual(['approved_at', 'id', 'storage_path']);
  });

  it('limits the photos it returns', async () => {
    const fx = await newFixture();
    for (let i = 0; i < 6; i++) await seedPhoto(fx, 'approved');
    const key = await keyOf(fx.eventId);
    expect((await feedOf(fx.slug, key, 4)).photos).toHaveLength(4);
    expect((await feedOf(fx.slug, key, 4)).total).toBe(6);
    expect((await feedOf(fx.slug, key, 0)).photos).toHaveLength(1);
    expect((await feedOf(fx.slug, key)).photos).toHaveLength(6);
  });

  it('shows no photos while the wall is off', async () => {
    const fx = await newFixture({ enabled: false });
    await seedPhoto(fx, 'approved');
    const feed = await feedOf(fx.slug, await keyOf(fx.eventId));
    expect(feed.enabled).toBe(false);
    expect(feed.photos).toEqual([]);
    expect(feed.total).toBe(0);
  });

  it('does not hand out the guest list, the key or the token', async () => {
    const fx = await newFixture({ moderation: 'auto' });
    await uploadPhoto(fx);
    const key = await keyOf(fx.eventId);
    const text = JSON.stringify(await feedOf(fx.slug, key));
    for (const secret of [fx.token, key, fx.guestId, fx.orgId, 'Dewi']) expect(text).not.toContain(secret);
  });
});

describe('retention', () => {
  const pathsToDelete = async () =>
    (await asService(db, () => db.query<{ storage_path: string; reason: string }>('select * from a41_expired_photo_paths()'))).rows;

  it('lists expired photos, photos guests took down and uploads that never became a photo', async () => {
    const fx = await newFixture();
    const live = await seedPhoto(fx, 'approved');
    const expired = await seedPhoto(fx, 'approved');
    const taken = await seedPhoto(fx, 'removed');
    await asService(db, () => db.query(`update a41_photos set expires_at = now() - interval '1 second' where id = $1`, [expired.id]));

    // an upload nobody committed: old enough to be dropped
    const stale = newPath(fx.eventId);
    await putObject(stale, {}, 'service');
    await asService(db, () => db.query(`update storage.objects set created_at = now() - interval '2 days' where name = $1`, [stale]));
    // one that is recent, one with an open ticket, one that became a photo: all stay
    const recent = newPath(fx.eventId);
    await putObject(recent, {}, 'service');
    const ticket = await requestUpload(fx.token);
    await putObject(ticket.upload_path, {}, 'service');
    await asService(db, () => db.query(`update storage.objects set created_at = now() - interval '2 days' where name = $1`, [ticket.upload_path]));
    await putObject(live.path, {}, 'service');
    await asService(db, () => db.query(`update storage.objects set created_at = now() - interval '2 days' where name = $1`, [live.path]));

    const listed = (await pathsToDelete()).filter((row) => row.storage_path.startsWith(fx.eventId));
    expect(listed.sort((a, b) => a.storage_path.localeCompare(b.storage_path))).toEqual(
      [
        { storage_path: expired.path, reason: 'expired' },
        { storage_path: taken.path, reason: 'removed' },
        { storage_path: stale, reason: 'orphan' },
      ].sort((a, b) => a.storage_path.localeCompare(b.storage_path)),
    );
  });

  it('is for the retention job only', async () => {
    const stranger = await newUser();
    await expectRejected(asAnon(db, () => db.query('select * from a41_expired_photo_paths()')), /permission denied/);
    await expectRejected(asUser(db, stranger, () => db.query('select * from a41_expired_photo_paths()')), /permission denied/);
    expect(await pathsToDelete()).toBeInstanceOf(Array);
  });

  it('removes photo rows with their event, guest and nothing else', async () => {
    const fx = await newFixture();
    const other = await newFixture();
    await uploadPhoto(fx);
    await uploadPhoto(other);
    await requestUpload(fx.token);
    await requestUpload(other.token);

    await asService(db, () => db.query('delete from a41_guests where id = $1', [fx.guestId]));
    const count = async (table: string, eventId: string) =>
      (await asService(db, () => db.query<{ n: number }>(`select count(*)::int as n from ${table} where event_id = $1`, [eventId]))).rows[0].n;
    for (const table of ['a41_photos', 'a41_photo_consents', 'a41_photo_tickets']) {
      expect(await count(table, fx.eventId)).toBe(0);
      expect(await count(table, other.eventId)).toBeGreaterThan(0);
    }

    await asService(db, () => db.query('delete from a41_events where id = $1', [other.eventId]));
    expect(await count('a41_photos', other.eventId)).toBe(0);
    expect(await count('a41_photo_settings', other.eventId)).toBe(0);
  });
});

describe('the app and the database agree', () => {
  it('on the quota, the limits and the retention period', async () => {
    const fx = await newFixture();
    const overview = await asAnon(db, () =>
      db.query<{ photo_quota: number }>('select photo_quota from a41_photo_overview($1)', [fx.token]),
    );
    expect(overview.rows[0].photo_quota).toBe(MAX_PHOTOS_PER_GUEST);
    // the grace period is written in the helper and used by every upload rule
    const { rows } = await db.query<{ hours: number }>(
      `select extract(epoch from (a41_private.photo_upload_deadline($1) - ends_at)) / 3600 as hours from a41_events where id = $1`,
      [fx.eventId],
    );
    expect(Number(rows[0].hours)).toBe(UPLOAD_GRACE_HOURS);
  });
});

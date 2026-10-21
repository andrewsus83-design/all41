import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { createDb } from './harness';

// What the public API role (anon) can reach, spelled out. Guests are not signed in, so everything they do goes
// through the functions below; a function or table that gains anon access by accident fails here. The list is
// the single place to add a new guest-facing function, after thinking about who may call it with what.
const GUEST_FUNCTIONS = [
  // guest pages
  'a41_open_invitation',
  'a41_public_event',
  'a41_submit_rsvp',
  // photo wall
  'a41_album',
  'a41_commit_photo',
  'a41_my_photos',
  'a41_photo_overview',
  'a41_remove_my_photo',
  'a41_request_photo_upload',
  'a41_wall_feed',
  // games
  'a41_game_guest',
  'a41_hunt_board',
  'a41_hunt_claim',
  'a41_hunt_public_leaderboard',
  'a41_quiz_answer',
  'a41_quiz_join',
  'a41_quiz_me',
  'a41_quiz_public_state',
];

// Storage evaluates its policies as the caller, so guests reach these three through the bucket's policies.
const STORAGE_POLICY_HELPERS = ['has_photo_ticket', 'is_removed_photo_object', 'owns_photo_object'];

let db: PGlite;

beforeAll(async () => {
  db = await createDb();
});

const names = (rows: { name: string }[]) => rows.map((row) => row.name).sort();

describe('what anon can reach', () => {
  it('runs only the guest functions in public', async () => {
    const { rows } = await db.query<{ name: string }>(
      `select p.proname as name
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname like 'a41\\_%' and has_function_privilege('anon', p.oid, 'execute')`,
    );
    expect(names(rows)).toEqual([...GUEST_FUNCTIONS].sort());
  });

  it('runs only the storage policy helpers in a41_private', async () => {
    const { rows } = await db.query<{ name: string }>(
      `select p.proname as name
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'a41_private' and p.prorettype <> 'trigger'::regtype
         and has_function_privilege('anon', p.oid, 'execute')`,
    );
    expect(names(rows)).toEqual([...STORAGE_POLICY_HELPERS].sort());
  });

  it('reads one table, the package catalog, and writes nothing', async () => {
    const { rows } = await db.query<{ name: string; privilege: string }>(
      `select table_name as name, privilege_type as privilege from information_schema.role_table_grants
       where grantee = 'anon' and table_schema = 'public' and table_name like 'a41\\_%'
       order by 1, 2`,
    );
    expect(rows).toEqual([{ name: 'a41_packages', privilege: 'SELECT' }]);
  });
});

describe('every a41_ table', () => {
  it('has row level security on', async () => {
    const { rows } = await db.query<{ name: string }>(
      `select c.relname as name from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relname like 'a41\\_%' and not c.relrowsecurity`,
    );
    expect(rows).toEqual([]);
  });
});

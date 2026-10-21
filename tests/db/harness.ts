import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const MIGRATIONS_DIR = join(import.meta.dirname, '../../supabase/migrations');

// What Supabase provides before our migrations run: the API roles, the auth
// schema and default table grants (which our migrations must narrow).
const SUPABASE_STUBS = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;

  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;

  grant usage on schema public, auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

  -- Supabase Storage keeps its files in the bucket service and their metadata
  -- in these two tables. Only the columns our policies and functions use matter.
  create schema storage;
  create table storage.buckets (
    id text primary key,
    name text not null unique,
    public boolean default false,
    file_size_limit bigint,
    allowed_mime_types text[],
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets (id),
    name text,
    owner uuid,
    metadata jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    last_accessed_at timestamptz default now()
  );
  create unique index bucketid_objname on storage.objects (bucket_id, name);
  alter table storage.buckets enable row level security;
  alter table storage.objects enable row level security;
  grant usage on schema storage to anon, authenticated, service_role;
  grant all on storage.buckets, storage.objects to anon, authenticated, service_role;
`;

export async function createDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();
  for (const file of files) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'));
  }
  return db;
}

async function withRole<T>(db: PGlite, role: string, userId: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role ${role}`);
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId ?? '']);
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
  }
}

/** Runs `fn` as a signed-in user, like a request with that user's JWT. */
export const asUser = <T>(db: PGlite, userId: string, fn: () => Promise<T>) =>
  withRole(db, 'authenticated', userId, fn);

export const asAnon = <T>(db: PGlite, fn: () => Promise<T>) => withRole(db, 'anon', null, fn);

/** The server-side service role: bypasses row level security. */
export const asService = <T>(db: PGlite, fn: () => Promise<T>) => withRole(db, 'service_role', null, fn);

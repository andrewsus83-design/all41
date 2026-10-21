# Local stack

A stand-in for the Supabase project on a machine without Docker, such as a cloud
sandbox. It gives you the real database rules and a fake sign-in:

- your own **Postgres** (any 14 or newer), with the Supabase roles stubbed in `stubs.sql`
- the real **PostgREST**, so the app talks to the database the way it does in production
- a small **fake auth server** with `owner@example.test` and `staff@example.test`
  (password `password1234`); sign-up works and needs no email

Row level security, grants and triggers all come from `supabase/migrations`, so a
rule that breaks here breaks in production too. Nothing here touches the shared
Supabase project.

## Run it

1. Have a Postgres server running and reachable by `STACK_PG_URL` (default
   `postgres://postgres@127.0.0.1:54322/postgres`). On the Linux sandbox:

   ```sh
   mkdir -p /var/tmp/a41stack && chown postgres /var/tmp/a41stack
   su postgres -s /bin/bash -c "/usr/lib/postgresql/16/bin/initdb -D /var/tmp/a41stack/pgdata -A trust -U postgres -E UTF8 --locale=C.UTF-8"
   su postgres -s /bin/bash -c "/usr/lib/postgresql/16/bin/pg_ctl -D /var/tmp/a41stack/pgdata -o '-p 54322 -k /var/tmp/a41stack -c listen_addresses=127.0.0.1' -l /var/tmp/a41stack/pg.log -w start"
   ```

2. Get a [PostgREST](https://github.com/PostgREST/postgrest/releases) binary and put it on
   the path, or point `POSTGREST_BIN` at it.

3. Start the stack (`--reset` rebuilds the database from the migrations):

   ```sh
   node tools/local-stack/stack.mjs --reset
   ```

4. Run the app against it, for example in `.env.local`:

   ```sh
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_local
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

Seed data with `psql postgres://postgres@127.0.0.1:54322/a41_local`. Use the
service role to bypass row level security, for example `set role service_role`
for billing columns.

## What it does not do

It is not GoTrue: there is no email, no PKCE callback and no password reset, and
tokens are signed with a fixed local secret. It is not for anything but local
development and tests.

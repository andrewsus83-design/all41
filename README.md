# all41

The all-in-one event platform for corporate events and weddings, live at [all41.app](https://all41.app).
Today it covers the event landing page, RSVP, guest list and QR check-in; games, raffle and the photo wall come next.

## Stack

- Next.js 16 (App Router, Cache Components) with React 19 and Tailwind CSS 4
- Supabase for Postgres, Row Level Security and Auth
- Vercel for hosting, Resend for email, Xendit for payments, Fonnte for the WhatsApp add-on
- Vitest, with PGlite (Postgres in WebAssembly) to test the database

## Getting started

You need Node 22 or newer.

```sh
npm ci
cp .env.example .env.local   # then fill in the Supabase values
npm run dev                  # http://localhost:3000
```

| Script              | What it does                                              |
| ------------------- | --------------------------------------------------------- |
| `npm run dev`       | Starts the dev server                                     |
| `npm run build`     | Production build                                          |
| `npm run lint`      | ESLint                                                    |
| `npm run typecheck` | Generates Next.js route types, then runs `tsc`            |
| `npm test`          | Pricing, auth helper and database tests (no network)      |

CI runs lint, typecheck, tests and the build on Node 22 and 24.

## Environment

| Variable                               | Purpose                                                         |
| -------------------------------------- | --------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | API URL of the Supabase project                                 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key of that project. Safe to expose, never the secret key |
| `NEXT_PUBLIC_SITE_URL`                 | Public address of the deployment. Defaults to `https://all41.app` |

## Layout

```
src/app/                 Routes: landing page, (auth) login and signup, auth/callback, dashboard
src/components/          ui/ building blocks and marketing/ sections of the landing page
src/lib/pricing/         Package catalog, quotes, cashback. Pure TypeScript, integer IDR
src/lib/auth/            Redirect safety, credential rules, session helpers
src/lib/supabase/        Server client and the proxy session refresh
src/proxy.ts             Refreshes the session and does the optimistic auth redirects
supabase/migrations/     The database schema
tests/db/                Row Level Security and trigger tests against PGlite
```

## Database

The database is the Supabase project `dayoneproject`, shared with other apps. Everything all41 owns is prefixed
`a41_`, and its helper functions live in the `a41_private` schema, which the Data API does not expose. Never change
tables without that prefix.

To change the schema, write the SQL, apply it to Supabase, then save the file in `supabase/migrations/` named
`<applied version>_<name>.sql`, so the repo and the project's migration history match. `npm test` applies every
migration to an in-memory Postgres with Supabase's roles and `auth.uid()` stubbed, so policy and trigger changes
are tested before they reach a real database.

## Auth

Sign-in uses Supabase Auth with email and password and the PKCE flow. Accounts live in the shared `auth.users`
table. The sign-up email links back to `/auth/callback`, so every origin that serves the app (production, previews,
localhost) must be listed under Authentication > URL Configuration > Redirect URLs in Supabase.

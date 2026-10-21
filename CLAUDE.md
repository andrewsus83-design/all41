# all41

Read `AGENTS.md` first. This is a recent Next.js with breaking changes, and its docs are bundled in
`node_modules/next/dist/docs`.

## Rules for this repo

- The database is shared (Supabase project `dayoneproject`, also used by WeddingOS). Everything all41 owns is
  prefixed `a41_`, and helper functions live in `a41_private`. Never alter or drop `cf_*`, `wos_*` or anything
  else without the prefix.
- Money is integer IDR. Prices live in `src/lib/pricing/catalog.ts` and the `a41_packages` seed; a test keeps them equal.
- Schema changes are SQL files in `supabase/migrations`, named with the version they were applied under. Every table
  gets Row Level Security, and every rule gets a test in `tests/db`.
- Cache Components is on. Anything that reads cookies or `searchParams` goes inside `<Suspense>`. Server Actions
  check the user themselves; the proxy is only an optimistic redirect.
- Product language is English. Brand: dark base, neon accents, dark gold (tokens in `src/app/globals.css`).
- Before finishing: `npm run lint && npm run typecheck && npm test && npm run build`.

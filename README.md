# f!nd

University marketplace and campus community PWA. Next.js (App Router) + Supabase.

## Status: redesign release candidate (not production verified)

The product has been redesigned end to end on the existing stack (Next.js App Router, Supabase). See `docs/REDESIGN_REPORT.md` for what changed, the feature-preservation map and the verification evidence, and `docs/RELEASE.md` for deployment, migration and rollback.

What has been verified, and what has not, is stated in the report. In short: typecheck, lint, unit tests, all 12 migrations with pgTAP on PostgreSQL 16, the production build, and browser tests against a **mock** backend pass. Nothing has been run against a real Supabase project, and no migration has been applied to production.

## Setup
1. `npm install`
2. Create a Supabase project, copy `.env.example` to `.env.local`, fill in values.
3. Apply `supabase/migrations/*.sql` (Supabase CLI: `supabase db push`).
4. `npm run dev`

## Testing
| Command | What it checks |
|---|---|
| `npm run typecheck` / `npm run lint` | TypeScript and ESLint |
| `npm test` | Unit tests of the real modules in `src/lib` |
| `npm run test:db` | Applies every migration to a throwaway local PostgreSQL and runs the pgTAP suites (`supabase/tests`) |
| `npm run build:e2e`, then `cd e2e && npm install && npm test` | Browser render, accessibility and interaction tests against a mock Supabase, including uploads, drag reorder and the push webhook (see `e2e/README.md`) |

## Known gaps before launch
See "Known limitations" in `docs/RELEASE.md`. The main ones: no test has run against a real Supabase project, push delivery needs a real-device check after you configure it (see `docs/RELEASE.md`, step 6), and Next.js 15 carries advisories whose fix is a major upgrade.

The earlier audit is kept in `docs/PRODUCTION_READINESS_AUDIT.md` for history.

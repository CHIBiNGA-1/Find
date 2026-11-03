# f!nd

University marketplace and campus community PWA. Next.js (App Router) + Supabase.

## Status (pre-release; not approved for production)

The repository contains the initial marketplace, university membership and moderation flows, listing management, saved listings, search, two-party messaging, requests, lost-and-found, exchange-linked reviews, account settings, account deletion, PWA shell, and deployment/operations documentation.

A prior engineering handoff records a successful production build and 54 passing unit tests on its original machine. Those results have **not** been independently reproduced in the current delivery environment. The current package has no installed `node_modules`; dependency installation timed out during this review, so this delivery has not been build- or test-verified here.

The latest hardening change is migration `0010_account_deletion_exchange_cleanup.sql`, which removes exchange rows belonging to the account before profile deletion so the `ON DELETE RESTRICT` conversation reference does not block account deletion. Storage cleanup now fails closed, checks listing/removal errors, paginates storage listings, and traverses nested folders before the database deletion is attempted.

**Do not deploy this repository to the public as a production service yet.** See `docs/PRODUCTION_READINESS_AUDIT.md` for verified findings, release blockers, and the exact checks still required.

## Setup
1. `npm install`
2. Create a Supabase project, copy `.env.example` to `.env.local`, fill in values.
3. Apply `supabase/migrations/*.sql` (Supabase CLI: `supabase db push`).
4. `npm run dev`

## Known gaps to close before launch
- Reproduce dependency installation, typecheck, unit tests and production build on a clean release environment.
- Apply all migrations and run pgTAP against a disposable Supabase project.
- Complete end-to-end, accessibility, responsive and security testing.
- Configure and verify real production Auth, email, storage, monitoring, backups and deployment.
- Implement or explicitly defer push notifications; the settings screen currently labels them unavailable.

See `docs/PRODUCTION_READINESS_AUDIT.md` for the release decision and evidence.

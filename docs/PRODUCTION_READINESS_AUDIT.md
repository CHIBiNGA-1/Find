# f!nd — Production Readiness Audit

**Disposition: NOT READY FOR PUBLIC RELEASE.**

Review date: 3 November 2026
Review scope: supplied `Find2-redesign(2).zip` source tree, configuration, SQL migrations, server actions, and operational documentation.

## What is present

- Next.js App Router application with Supabase SSR/auth integration.
- University memberships and row-level security policies.
- Marketplace listings, image metadata, search, saved listings and seller management.
- Two-party messaging, message image storage, block/report flows and unread counts.
- Requests and lost-and-found workflows.
- Exchange records, transaction-linked reviews and moderator actions.
- Settings, account deletion flow, PWA manifest/service worker, and operations/deployment documentation.
- Unit test sources and pgTAP database test sources.

## Changes made in this delivery

1. Added migration `0010_account_deletion_exchange_cleanup.sql`. The earlier account-deletion function could be blocked by `exchange_records.conversation_id ON DELETE RESTRICT` when a user had an exchange. The replacement deletes that user's exchange records before deleting their auth account; transaction-linked reviews cascade with those records.
2. Changed account storage cleanup to fail closed. Storage list/removal failures now stop account deletion instead of silently leaving uploaded content behind.
3. Storage enumeration is paginated and recursively traverses nested folders; removals are batched.
4. Updated README status and deployment/operations documentation so they no longer imply that this delivery has independently verified production readiness.

## Release blockers and required verification

### P0 — Must resolve before public launch

- **Reproduce a clean install and production build.** `npm ci --no-audit --no-fund` timed out in this environment. No `node_modules` directory was available, so `npm run typecheck`, `npm test`, `npm run build`, and browser-level tests could not be executed here. The prior handoff reports earlier success, but that is not a substitute for a clean reproducible run on the release commit.
- **Apply and test all migrations on a disposable Supabase project.** The new account-deletion migration has not been applied to PostgreSQL in this environment. Exercise deletion for accounts with each combination of listing images, lost-and-found images, message images, conversations, exchange records, reviews, reports and moderator audit records. Verify both successful deletion and rollback/error behaviour.
- **Run the pgTAP suite against the actual schema.** The two SQL test files exist, but no local Supabase CLI/runtime was available. Do not infer database isolation from static policy inspection alone.
- **End-to-end test all critical user journeys** with at least two test accounts in separate universities: registration, email confirmation, membership request/approval, listing create/edit/publish/sold, search, saved items, messaging, image upload, blocking/reporting, requests, lost-and-found, exchange confirmation, reviews, moderation, sign-out and account deletion.
- **Provision and verify production configuration.** A real Supabase project, private storage buckets, Auth redirect URLs, SMTP/email deliverability, production domain, backups, monitoring and a deployment target must be configured and checked. These cannot be proven from this source archive.

### P1 — Required before broad public availability

- **Rate-limit account creation and sign-in.** The code relies on Supabase Auth behaviour and does not include a separately configured application-level abuse-control layer. Configure provider limits or a trusted edge rate limiter and test it.
- **Resolve verification strategy scope.** The schema permits `email_domain` and `institutional_sso`, but the current product flow described in the repository is moderator/manual verification. Do not configure a university for an unimplemented strategy. Either implement and test each strategy or constrain operational setup to manual review.
- **Generate and use Supabase database types.** The handoff itself notes manually asserted RPC result types. Generate `Database` types from the applied schema and use typed Supabase clients to reduce schema drift.
- **Finish notification settings.** The settings page explicitly labels push notifications as unavailable. Either implement subscription, delivery, permission, unsubscribe and failure flows or remove the unfinished setting from the public release scope and clearly document the limitation.
- **Validate the account-deletion storage path with large datasets.** The current code recursively enumerates storage using paginated listings; validate provider pagination, folder semantics, per-user access policies, partial failure recovery and rate limits against real buckets.

### P2 — Quality improvements

- Add automated browser tests and accessibility checks for desktop and mobile breakpoints.
- Run a WCAG 2.2 AA review using keyboard-only navigation and screen readers, not just CSS inspection.
- Add dependency vulnerability scanning, secret scanning and a documented patch cadence.
- Confirm backup/restore and point-in-time recovery procedures for the production database and storage.
- Add operational alerting for Auth failures, database errors, storage failures, message delivery/realtime issues and moderation queue growth.
- Verify the service worker's cache behaviour across authenticated navigation, logout, account switching and offline recovery.

## Verification evidence from this environment

| Check | Result | Evidence / limitation |
|---|---|---|
| Archive extraction and source inventory | Passed | 81 source files under `src`; migrations and docs inspected. |
| Dependency installation | Not verified | `npm ci --no-audit --no-fund` timed out twice. |
| TypeScript | Not run successfully | Project dependencies/types unavailable. |
| Unit tests | Not run | `tsx` dependency unavailable. |
| Production build | Not run | Next.js dependencies unavailable. |
| pgTAP / RLS tests | Not run | Supabase CLI and local PostgreSQL runtime unavailable. |
| Browser/device tests | Not run | Application could not be started. |
| Production credentials/integrations | Not verified | No production environment or credentials were supplied. |

## Release decision

**NO-GO.** The codebase has substantial product functionality, but this review cannot certify it as safe or reliable for public launch. The blockers above must be completed and evidenced on a clean release candidate. A successful static review or visually complete interface is not sufficient to declare the product ready for the masses.

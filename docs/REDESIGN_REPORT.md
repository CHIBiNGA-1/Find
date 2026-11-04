# Redesign report

State: **release candidate, not production verified.** See "Verification" for exactly what ran.

## A. Change report
**Redesigned:** design system, application shell and navigation, Home, Explore, Sell and Edit, Listing detail, Messages (inbox and thread), You, the welcome page.
**Lightly updated (fixes, not redesign):** Requests, Lost and found, Admin, Profile, Settings, sign-in/sign-up/onboarding (CSS variable fix only).
**Fixed:**
- Choosing several photos at once did nothing when the input was reset before the upload read the file list (a live `FileList`); fixed and covered by a browser test.
- Multi-photo upload collided on position; removing the cover left no cover (now assigned atomically by the database).
- Publishing a live listing silently did nothing; edit and draft flows now have honest buttons.
- Several server actions swallowed errors and reported success.
- Open redirect through `next=/\host` on sign-in.
- Chat threw on network loss and could stick on "Sending"; failed messages now retry on reconnect, idempotently.
- A declined exchange left the listing permanently sold.
- Dates rendered in the server timezone; now the university's timezone.
- Request budget hard-coded ZMW; now the university currency.
- The font width axis was never loaded; headings now render as designed.
- Account-deletion copy misdescribed what is deleted.
**Added:** Stationery category, founding universities with probation/promotion/closure, time-of-day personalized home greeting, subcategories, relevance and price sorting, cursor "show more", drag-and-drop photo reordering (mouse, touch, keyboard), real byte-level upload progress, push notifications (content-free, opt-in per device), filter sheet with removable chips, "Seen", inbox previews and live unread, earlier-message paging, share, related listings, campus area, enquiry counts, verification status on You, confirmation before deleting a draft, ESLint.
**Removed:** fake push-notification setting, promotional sections on the welcome page, the site footer (its safety text moved into listing, message and settings screens), the desktop header navigation (replaced by the rail).

## C. Feature preservation
| Existing capability | Now |
|---|---|
| Sign up, sign in, email confirmation, university membership and verification | Unchanged (redirect hardened) |
| Listings: create, edit, draft, publish, archive, relist, delete draft, sold via exchange | Preserved; sold-without-exchange path removed from the status action (it bypassed the exchange rules); decline now relists |
| Photos: upload, compress to WebP, remove | Preserved; added reorder, retry, per-photo state |
| Search with typo tolerance, category, price, condition | Preserved; added subcategory, sort, cursor paging |
| Saved listings, trending | Preserved |
| Messaging: participants only, realtime, unread, images, report, block | Preserved; added Seen, previews, history paging, offline retry |
| Requests, lost and found (with moderation and reporting) | Preserved |
| Exchanges and reviews | Preserved; business rules untouched |
| Moderation and admin | Preserved |
| Settings, account deletion | Preserved; push notifications placeholder removed; deletion copy corrected |
| PWA shell, offline page, install prompt, pull to refresh | Preserved |

## D. Engineering
- **Architecture:** no new framework. New pure modules `lib/explore-params`, `lib/safe-redirect`, `lib/categories`, `lib/listings/images`, `lib/listings/explore` (single search path shared by the page and the load-more action).
- **Database:** migrations `0011`–`0014` (see `docs/RELEASE.md`), preserving `0013_stationery_category.sql`. RPCs are `SECURITY INVOKER` except the documented security-definer functions with explicit authorization checks and pgTAP coverage. No policy was weakened.
- **Security:** open redirect closed; UUID and bounds validation on new actions; errors no longer swallowed; no service-role key in the client.
- **Dependencies:** added `web-push` (+ types; the standard library for VAPID-signed delivery), `server-only`, and `eslint`, `eslint-config-next`, `@eslint/eslintrc` (dev).
- **Privileged key:** push is the first and only use of `SUPABASE_SERVICE_ROLE_KEY`, confined to `src/lib/supabase/admin.ts` (`server-only`) and the one webhook route, which authenticates with a constant-time bearer-secret check. A scan of `.next/static` found none of the server secrets in the client bundle. The e2e suite has its own `package.json`.
- **Tests:** the previous unit tests exercised copies of the code and the pgTAP fixtures could not run. Both were replaced or repaired.

## E. Verification (actual results)
| Check | Command | Result |
|---|---|---|
| Install | `npm ci` | Pass |
| Types | `npm run typecheck` | Pass |
| Lint | `npm run lint` | 0 errors, 1 warning (config file default export) |
| Unit | `npm test` | 69 of 69 pass |
| DB | PostgreSQL 16 disposable container | All 14 migrations apply; pgTAP 83 of 83 pass (19, 18, 23, 9, 1, 13) |
| Build | `npm run build` (Node 22) | Pass, 30 routes; warning about Supabase in Edge middleware |
| Browser, mock backend | `cd e2e && npm test` | 40 of 40 page renders clean (20 screens at 390px and 1280px); 0 axe-core violations; 35 of 35 interaction checks, including the personalized greeting and Stationery category |
| Dependency audit | `npm audit --omit=dev` | 3 advisories (1 moderate, 2 high); see release guide |
| **Not run** | Anything against a real Supabase project; real email, storage and realtime; **push delivery through a real push service to a real device**; touch drag on a physical screen; screen-reader testing; load testing; Render | Not run |
Automated axe checks cover only part of WCAG; manual assistive-technology testing is still required.

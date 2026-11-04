# Browser tests (mock backend)

Renders every screen at phone (390x844) and desktop (1280x800) sizes, fails on console errors, horizontal overflow,
not-found/error pages and axe-core WCAG 2.2 A/AA violations, then runs interaction checks (filters, sell form, chat, nav).

**These run against `mock-supabase.mjs`, not a real Supabase project.** They prove the UI renders and behaves; they do not
prove data integrity or RLS (that is `supabase/tests`). Run both before every release.

```bash
npm run build:e2e        # from the repo root: builds the app pointed at the mock (http://localhost:54321)
cd e2e && npm install && npm test
```
Screenshots and `results.json` are written to `$SHOTS` (default `/tmp/shots`). Needs Linux x64.

Set `SKIP_PAGES=1` to run only the interaction checks (faster). `npm run build:e2e` also bakes in a throwaway VAPID public key so the Notifications section renders; those keys are test-only.

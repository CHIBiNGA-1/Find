# f!nd — Deployment Guide

## Prerequisites

| Tool | Minimum version | Purpose |
|---|---|---|
| Node.js | 20 LTS | Runtime — use `nvm use` in the project root |
| npm | 10 | Package management |
| Supabase CLI | 1.200+ | Migrations, local dev, tests |
| Git | any | Source control |

---

## 1. Supabase Project Setup

### 1.1 Create a project

1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Choose a region close to your users (e.g. `eu-west-2` for Southern Africa).
3. Copy **Project URL** and **anon public** key from **Settings → API**.

### 1.2 Apply migrations

```bash
# Link the CLI to your project
supabase link --project-ref <your-project-ref>

# Apply all migrations in order
supabase db push
# or, for local dev:
supabase start
supabase db reset   # applies migrations + seed.sql from scratch
```

Migrations run in numeric order (`0001_foundation.sql` … `0010_account_deletion_exchange_cleanup.sql`). Apply all migrations with `supabase db push`; do not cherry-pick individual files.

### 1.3 Required extensions

`pg_trgm` is enabled in `0001_foundation.sql`. No manual steps needed.

### 1.4 Storage buckets

All three buckets (`listing-images`, `message-images`, `lostfound-images`) are created by migrations. Verify them in **Storage → Buckets**. All three must be **private**.

---

## 2. Environment Variables

Create `.env.local` (never commit this):

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon key>
```

> **Never add `SUPABASE_SERVICE_ROLE_KEY` to the Next.js app.** It is only needed for admin scripts run outside the app (e.g. bulk university imports). Store it in a separate secure location.

See `.env.example` in the repo for the full list of variables.

---

## 3. Vercel Deployment

### 3.1 Initial setup

```bash
npm install -g vercel
vercel link      # link to your Vercel project
vercel env pull  # pull production env vars locally to .env.local
```

### 3.2 Set environment variables on Vercel

In **Vercel Dashboard → Settings → Environment Variables**, add:

| Variable | Environment |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Development |

### 3.3 Deploy

```bash
git push origin main   # Vercel auto-deploys on push to main
# or
vercel --prod          # manual production deploy
```

### 3.4 Silence the workspace-root warning

Add to `next.config.ts`:

```ts
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../../"),  // adjust to your monorepo root
};
```

Or simply delete any stray `package-lock.json` files outside the project directory.

---

## 4. Custom Domain & SSL

1. **Vercel Dashboard → Domains → Add domain** — enter your domain.
2. Vercel provisions Let's Encrypt TLS automatically.
3. Update Supabase **Auth → URL Configuration → Site URL** to match (e.g. `https://campushive.example.com`).
4. Add your domain to **Auth → Redirect URLs**: `https://campushive.example.com/auth/callback`.

---

## 5. Node Version

The project requires **Node 20+**. A `.nvmrc` is committed to the repo.

```bash
nvm use        # picks up .nvmrc automatically
```

For Vercel, set the Node version under **Settings → General → Node.js Version** → `20.x`.

---

## 6. Running Tests

### Unit tests (node:test + tsx)

No build step or native binary required — uses Node's built-in test runner with `tsx` as a TypeScript transpiler.

```bash
npm test                # run all tests once
npm run test:watch      # watch mode
npm run test:coverage   # coverage (experimental)
```

> **Note on Vitest**: `vitest` and `@vitest/coverage-v8` are in `devDependencies` for CI environments that support AVX2. On machines without AVX2 (e.g. some VMs), use `npm test` which uses `tsx --test` instead.

### Database tests (pgTAP)

```bash
supabase start          # start local Supabase
supabase test db        # runs supabase/tests/*.sql via pgTAP
supabase stop
```

---

## 7. Post-Deploy Checklist

- [ ] Migrations applied: `supabase db push`
- [ ] All 3 storage buckets exist and are **private**
- [ ] Auth redirect URLs include production domain
- [ ] `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` set on Vercel
- [ ] At least one university row inserted (see `operations.md`)
- [ ] First moderator account promoted (see `operations.md`)
- [ ] PWA install prompt works in Chrome (HTTPS required)
- [ ] Offline page loads when network is disconnected

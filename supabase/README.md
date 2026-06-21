# Supabase setup (MIGRATION_PLAN.md Phase 1)

Storage backend for races/snapshots. The app auto-selects its store at runtime:

`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` set → **Supabase**
→ else `BLOB_READ_WRITE_TOKEN` set → **Vercel Blob**
→ else → **local files** (`app/data/races/*.json`)

So nothing breaks until you opt in by setting the Supabase env vars.

## 1. Create the project

1. Create a project at <https://supabase.com/dashboard> (free tier is fine).
2. SQL editor → paste & run [`schema.sql`](./schema.sql) (creates `races`, `snapshots`,
   `live_state` + RLS: public read, writes only via `service_role`).
3. Project settings → API → copy the **Project URL**, the **anon** key, and the
   **service_role** key.

## 2. Env vars

Add to `.env.local` (server-only — never expose the service_role key to the browser):

```bash
# Server only (Next.js API routes, seed script, Render ingest in Phase 2)
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role key>

# Client (Phase 3 — RLS-protected, read-only). Safe to expose.
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

On Vercel, set the same `SUPABASE_*` (server) vars in Project → Settings →
Environment Variables. See MIGRATION_PLAN.md §7 for the full matrix.

## 3. Seed the sample races

```bash
npm run seed:supabase
```

Imports `app/data/races/*.json` (idempotent upsert) and marks them `finished`.

## 4. Verify

```bash
npm run dev
```

- 📼 다시보기 tab lists the seeded races and replays them from Supabase.
- `GET /api/races` → index JSON, `GET /api/races/2026/1` → full race.

## Rollback

Unset the `SUPABASE_*` vars → the store falls back to Blob/local automatically.

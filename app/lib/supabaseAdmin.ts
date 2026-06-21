import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Server-only Supabase client using the SERVICE ROLE key (bypasses RLS).
 * NEVER import this from client components — the key must never reach the browser.
 *
 * Returns `null` when env is not configured, so callers can fall back to the
 * existing Blob/local store during the migration (MIGRATION_PLAN.md Phase 1).
 */
let cached: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null

  if (!cached) {
    cached = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return cached
}

export function hasSupabase(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

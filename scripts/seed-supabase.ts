/**
 * One-time import of the local sample races (app/data/races/*.json) into Supabase.
 *
 *   npm run seed:supabase
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local and the schema
 * from supabase/schema.sql already applied. Idempotent (upsert by id / race_id,idx).
 */
import { promises as fs } from 'fs'
import path from 'path'

import type { RaceData, RaceIndex } from '@/app/types/replay'
import { getSupabaseAdmin } from '@/app/lib/supabaseAdmin'
import { upsertRace }       from '@/app/lib/raceStore'

const LOCAL_DIR = path.join(process.cwd(), 'app', 'data', 'races')

async function readJson<T>(p: string): Promise<T> {
  return JSON.parse(await fs.readFile(p, 'utf-8')) as T
}

async function main() {
  const sb = getSupabaseAdmin()
  if (!sb) {
    throw new Error(
      'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set. Add them to .env.local before seeding.',
    )
  }

  const index = await readJson<RaceIndex>(path.join(LOCAL_DIR, 'index.json'))

  let ok = 0
  let missing = 0
  const seededIds: string[] = []

  for (const meta of index.races ?? []) {
    const localRacePath = path.join(LOCAL_DIR, String(meta.year), `r${meta.round}.json`)
    try {
      const race = await readJson<RaceData>(localRacePath)
      await upsertRace(race)             // backend() === 'supabase' here
      seededIds.push(race.meta.id)
      ok++
      // eslint-disable-next-line no-console
      console.log(`seeded: ${race.meta.id}  (${race.snapshots.length} snapshots)`)
    } catch (err) {
      missing++
      // eslint-disable-next-line no-console
      console.warn(`skip ${meta.id}: ${err instanceof Error ? err.message : err}`)
    }
  }

  // Seeded races are historical → mark finished (table default is 'live').
  if (seededIds.length > 0) {
    const { error } = await sb.from('races').update({ status: 'finished' }).in('id', seededIds)
    if (error) console.warn(`status update failed: ${error.message}`)
  }

  // eslint-disable-next-line no-console
  console.log(`DONE: seeded ${ok} races, skipped ${missing}`)
}

main().catch(err => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})

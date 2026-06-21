import { promises as fs } from 'fs'
import path               from 'path'
import type { RaceMeta, RaceIndex, RaceData, RaceSnapshot } from '@/app/types/replay'
import { getSupabaseAdmin } from '@/app/lib/supabaseAdmin'

const LOCAL_DIR  = path.join(process.cwd(), 'app', 'data', 'races')
const INDEX_PATH = 'wec-dashboard/races/index.json'

// ── 백엔드 선택 ───────────────────────────────────────────────────
// Supabase 가 설정되면 Supabase, 아니면 기존 Blob, 둘 다 없으면 로컬 파일.
// 마이그레이션 기간 동안 셋이 공존(MIGRATION_PLAN.md Phase 1).

type Backend = 'supabase' | 'blob' | 'local'

function backend(): Backend {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) return 'supabase'
  if (process.env.BLOB_READ_WRITE_TOKEN) return 'blob'
  return 'local'
}

// ── Supabase ↔ 타입 매핑 ─────────────────────────────────────────

interface RaceRow {
  id: string; year: number; round: number; name: string; circuit: string
  country_flag: string | null; duration: string | null; date: string | null
  status: string; snapshot_count: number; updated_at: string
}

function metaToRow(meta: RaceMeta, status?: string): Record<string, unknown> {
  const row: Record<string, unknown> = {
    id:             meta.id,
    year:           meta.year,
    round:          meta.round,
    name:           meta.name,
    circuit:        meta.circuit,
    country_flag:   meta.countryFlag,
    duration:       meta.duration,
    date:           meta.date,
    snapshot_count: meta.snapshots,
    updated_at:     new Date(meta.updatedAt).toISOString(),
  }
  if (status) row.status = status
  return row
}

function rowToMeta(row: RaceRow): RaceMeta {
  return {
    id:          row.id,
    year:        row.year,
    round:       row.round,
    name:        row.name,
    circuit:     row.circuit,
    countryFlag: row.country_flag ?? '',
    duration:    row.duration ?? '',
    date:        row.date ?? '',
    snapshots:   row.snapshot_count,
    updatedAt:   new Date(row.updated_at).getTime(),
  }
}

/** RaceSnapshot → DB row (idx/ts are columns, the rest is payload). */
function snapshotToRow(raceId: string, snap: RaceSnapshot) {
  const { idx, ts, ...payload } = snap
  return { race_id: raceId, idx, ts, payload }
}

/** DB row → RaceSnapshot (merge columns back into the payload object). */
function rowToSnapshot(row: { idx: number; ts: number | string; payload: unknown }): RaceSnapshot {
  return { idx: row.idx, ts: Number(row.ts), ...(row.payload as object) } as RaceSnapshot
}

// ── Blob 헬퍼 ────────────────────────────────────────────────────

async function blobReadJson<T>(pathname: string): Promise<T | null> {
  try {
    const { get } = await import('@vercel/blob')
    const res = await get(pathname, { access: 'private', useCache: false })
    if (!res || res.statusCode !== 200 || !res.stream) return null

    const reader = res.stream.getReader()
    const chunks: Uint8Array[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) chunks.push(value)
    }
    const text = Buffer.concat(chunks).toString('utf-8')
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

async function blobWriteJson(pathname: string, data: unknown): Promise<void> {
  const { put } = await import('@vercel/blob')
  await put(pathname, JSON.stringify(data), {
    access:          'private',
    contentType:     'application/json',
    addRandomSuffix: false,
    allowOverwrite:  true,
  })
}

// ── 로컬 파일 헬퍼 ────────────────────────────────────────────────

async function localReadJson<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

async function localWriteJson(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

// ── 공개 API ─────────────────────────────────────────────────────

export async function getIndex(): Promise<RaceIndex> {
  if (backend() === 'supabase') {
    const sb = getSupabaseAdmin()!
    const { data, error } = await sb
      .from('races')
      .select('*')
      .order('updated_at', { ascending: false })
    if (error) throw new Error(`getIndex: ${error.message}`)
    return { races: (data as RaceRow[]).map(rowToMeta) }
  }

  if (backend() === 'blob') {
    return (await blobReadJson<RaceIndex>(INDEX_PATH)) ?? { races: [] }
  }

  return (await localReadJson<RaceIndex>(path.join(LOCAL_DIR, 'index.json'))) ?? { races: [] }
}

export async function getRace(year: number, round: number): Promise<RaceData | null> {
  if (backend() === 'supabase') {
    const sb = getSupabaseAdmin()!
    const id = `${year}-r${round}`

    const { data: raceRow, error: raceErr } = await sb
      .from('races').select('*').eq('id', id).maybeSingle()
    if (raceErr) throw new Error(`getRace meta: ${raceErr.message}`)
    if (!raceRow) return null

    const { data: snapRows, error: snapErr } = await sb
      .from('snapshots').select('idx, ts, payload').eq('race_id', id).order('idx', { ascending: true })
    if (snapErr) throw new Error(`getRace snapshots: ${snapErr.message}`)

    return {
      meta:      rowToMeta(raceRow as RaceRow),
      snapshots: (snapRows ?? []).map(rowToSnapshot),
    }
  }

  if (backend() === 'blob') {
    return blobReadJson<RaceData>(`wec-dashboard/races/${year}/r${round}.json`)
  }

  return localReadJson<RaceData>(path.join(LOCAL_DIR, String(year), `r${round}.json`))
}

export async function upsertIndex(meta: RaceMeta): Promise<void> {
  if (backend() === 'supabase') {
    const sb = getSupabaseAdmin()!
    const { error } = await sb.from('races').upsert(metaToRow(meta), { onConflict: 'id' })
    if (error) throw new Error(`upsertIndex: ${error.message}`)
    return
  }

  // Blob/local: maintain a single index.json document.
  const index = await getIndex()
  const existing = index.races.findIndex(r => r.id === meta.id)
  if (existing >= 0) index.races[existing] = meta
  else index.races.unshift(meta)

  if (backend() === 'blob') {
    await blobWriteJson(INDEX_PATH, index)
  } else {
    await localWriteJson(path.join(LOCAL_DIR, 'index.json'), index)
  }
}

export async function upsertRace(data: RaceData): Promise<void> {
  if (backend() === 'supabase') {
    const sb = getSupabaseAdmin()!
    const { meta, snapshots } = data

    const { error: metaErr } = await sb
      .from('races')
      .upsert({ ...metaToRow(meta), snapshot_count: snapshots.length }, { onConflict: 'id' })
    if (metaErr) throw new Error(`upsertRace meta: ${metaErr.message}`)

    if (snapshots.length > 0) {
      const rows = snapshots.map(s => snapshotToRow(meta.id, s))
      const { error: snapErr } = await sb
        .from('snapshots').upsert(rows, { onConflict: 'race_id,idx' })
      if (snapErr) throw new Error(`upsertRace snapshots: ${snapErr.message}`)
    }
    return
  }

  const { year, round } = data.meta
  if (backend() === 'blob') {
    await blobWriteJson(`wec-dashboard/races/${year}/r${round}.json`, data)
  } else {
    await localWriteJson(path.join(LOCAL_DIR, String(year), `r${round}.json`), data)
  }
}

/**
 * Append (or replace) a single snapshot for one race and refresh its meta.
 *
 * On Supabase this is a per-row upsert — no whole-race read-modify-write
 * (addresses MIGRATION_PLAN.md problem B). Returns the new snapshot count.
 * On Blob/local it falls back to the legacy read-merge-write flow.
 */
export async function appendSnapshot(meta: RaceMeta, snapshot: RaceSnapshot): Promise<number> {
  if (backend() === 'supabase') {
    const sb = getSupabaseAdmin()!

    const { error: snapErr } = await sb
      .from('snapshots')
      .upsert(snapshotToRow(meta.id, snapshot), { onConflict: 'race_id,idx' })
    if (snapErr) throw new Error(`appendSnapshot: ${snapErr.message}`)

    const { count, error: countErr } = await sb
      .from('snapshots').select('*', { count: 'exact', head: true }).eq('race_id', meta.id)
    if (countErr) throw new Error(`appendSnapshot count: ${countErr.message}`)
    const snapshots = count ?? 0

    const { error: metaErr } = await sb
      .from('races')
      .upsert({ ...metaToRow({ ...meta, snapshots, updatedAt: Date.now() }) }, { onConflict: 'id' })
    if (metaErr) throw new Error(`appendSnapshot meta: ${metaErr.message}`)

    return snapshots
  }

  // Blob/local fallback: read existing race, merge the snapshot, rewrite.
  const existing = await getRace(meta.year, meta.round)
  const data: RaceData = existing ?? { meta, snapshots: [] }

  const at = data.snapshots.findIndex(s => s.idx === snapshot.idx)
  if (at >= 0) data.snapshots[at] = snapshot
  else data.snapshots.push(snapshot)
  data.snapshots.sort((a, b) => a.idx - b.idx)

  const nextMeta: RaceMeta = {
    ...data.meta,
    snapshots: data.snapshots.length,
    updatedAt: Date.now(),
  }
  data.meta = nextMeta

  await upsertRace(data)
  await upsertIndex(nextMeta)

  return data.snapshots.length
}

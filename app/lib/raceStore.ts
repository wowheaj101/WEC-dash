import { promises as fs } from 'fs'
import path               from 'path'
import type { RaceMeta, RaceIndex, RaceData } from '@/app/types/replay'

const LOCAL_DIR  = path.join(process.cwd(), 'app', 'data', 'races')
const INDEX_PATH = 'wec-dashboard/races/index.json'

function useBlob() {
  return !!process.env.BLOB_READ_WRITE_TOKEN
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
  if (!useBlob()) {
    return (await localReadJson<RaceIndex>(path.join(LOCAL_DIR, 'index.json'))) ?? { races: [] }
  }

  try {
    const { head } = await import('@vercel/blob')
    const blob = await head(INDEX_PATH).catch(() => null)
    if (!blob) return { races: [] }
    const res = await fetch(blob.url, { cache: 'no-store' })
    return (await res.json()) as RaceIndex
  } catch {
    return { races: [] }
  }
}

export async function getRace(year: number, round: number): Promise<RaceData | null> {
  if (!useBlob()) {
    return localReadJson<RaceData>(path.join(LOCAL_DIR, String(year), `r${round}.json`))
  }

  try {
    const { head } = await import('@vercel/blob')
    const blobPath = `wec-dashboard/races/${year}/r${round}.json`
    const blob = await head(blobPath).catch(() => null)
    if (!blob) return null
    const res = await fetch(blob.url, { cache: 'no-store' })
    return (await res.json()) as RaceData
  } catch {
    return null
  }
}

export async function upsertIndex(meta: RaceMeta): Promise<void> {
  if (!useBlob()) {
    const index = await getIndex()
    const existing = index.races.findIndex(r => r.id === meta.id)
    if (existing >= 0) index.races[existing] = meta
    else index.races.unshift(meta)
    await localWriteJson(path.join(LOCAL_DIR, 'index.json'), index)
    return
  }

  const { put } = await import('@vercel/blob')
  const index = await getIndex()
  const existing = index.races.findIndex(r => r.id === meta.id)
  if (existing >= 0) index.races[existing] = meta
  else index.races.unshift(meta)

  await put(INDEX_PATH, JSON.stringify(index), {
    access:          'public',
    contentType:     'application/json',
    addRandomSuffix: false,
  })
}

export async function upsertRace(data: RaceData): Promise<void> {
  if (!useBlob()) {
    const { year, round } = data.meta
    await localWriteJson(path.join(LOCAL_DIR, String(year), `r${round}.json`), data)
    return
  }

  const { put } = await import('@vercel/blob')
  const { year, round } = data.meta
  await put(`wec-dashboard/races/${year}/r${round}.json`, JSON.stringify(data), {
    access:          'public',
    contentType:     'application/json',
    addRandomSuffix: false,
  })
}

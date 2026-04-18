import { promises as fs } from 'fs'
import path               from 'path'
import type { RaceMeta, RaceIndex, RaceData } from '@/app/types/replay'

const LOCAL_DIR  = path.join(process.cwd(), 'app', 'data', 'races')
const INDEX_PATH = 'wec-dashboard/races/index.json'

function useBlob() {
  return !!process.env.BLOB_READ_WRITE_TOKEN
}

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

  return (await blobReadJson<RaceIndex>(INDEX_PATH)) ?? { races: [] }
}

export async function getRace(year: number, round: number): Promise<RaceData | null> {
  if (!useBlob()) {
    return localReadJson<RaceData>(path.join(LOCAL_DIR, String(year), `r${round}.json`))
  }

  return blobReadJson<RaceData>(`wec-dashboard/races/${year}/r${round}.json`)
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
    access:          'private',
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
    access:          'private',
    contentType:     'application/json',
    addRandomSuffix: false,
  })
}

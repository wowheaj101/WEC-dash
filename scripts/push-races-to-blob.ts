import { promises as fs } from 'fs'
import path from 'path'

import type { RaceData, RaceIndex } from '@/app/types/replay'

const LOCAL_DIR = path.join(process.cwd(), 'app', 'data', 'races')
const INDEX_BLOB_PATH = 'wec-dashboard/races/index.json'

async function readJson<T>(p: string): Promise<T> {
  const raw = await fs.readFile(p, 'utf-8')
  return JSON.parse(raw) as T
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not set. Set it in .env.local before running this script.')
  }

  const { put } = await import('@vercel/blob')

  // 1) Upload index.json
  const indexPath = path.join(LOCAL_DIR, 'index.json')
  const index = await readJson<RaceIndex>(indexPath)

  await put(INDEX_BLOB_PATH, JSON.stringify(index), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
  })

  // 2) Upload each race json referenced by index
  let ok = 0
  let missing = 0

  for (const meta of index.races ?? []) {
    const localRacePath = path.join(LOCAL_DIR, String(meta.year), `r${meta.round}.json`)
    const blobRacePath = `wec-dashboard/races/${meta.year}/r${meta.round}.json`

    try {
      const race = await readJson<RaceData>(localRacePath)
      await put(blobRacePath, JSON.stringify(race), {
        access: 'private',
        contentType: 'application/json',
        addRandomSuffix: false,
      })
      ok++
      // eslint-disable-next-line no-console
      console.log(`uploaded: ${blobRacePath}`)
    } catch {
      missing++
      // eslint-disable-next-line no-console
      console.warn(`missing local file: ${localRacePath}`)
    }
  }

  // eslint-disable-next-line no-console
  console.log(`DONE: uploaded ${ok} races, missing ${missing}`)
}

main().catch(err => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})


import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import type { T71Manifest } from '@/app/lib/parseManifest'
import { buildColMap } from '@/app/lib/parseManifest'
import type { T71RawState } from '@/app/lib/normalizeState'
import { computeStats, normalizeCars, normalizeSession } from '@/app/lib/normalizeState'
import type { RaceData, RaceIndex, RaceMeta, RaceSnapshot } from '@/app/types/replay'

type RecordingFrame = Partial<T71RawState> & {
  manifest?: T71Manifest
  lastUpdated?: number
}

type CliArgs = {
  src: string
  year: number
  round: number
  name: string
  circuit: string
  countryFlag: string
  duration: string
  outDir: string
  every: number
  limit: number
}

function parseArgs(argv: string[]): CliArgs {
  const a: Record<string, string> = {}
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i]
    if (!tok.startsWith('--')) continue
    const key = tok.slice(2)
    const val = argv[i + 1]
    if (!val || val.startsWith('--')) throw new Error(`Missing value for --${key}`)
    a[key] = val
    i++
  }

  const required = (k: string) => {
    const v = a[k]
    if (!v) throw new Error(`Missing required arg --${k}`)
    return v
  }

  return {
    src: required('src'),
    year: Number(required('year')),
    round: Number(required('round')),
    name: required('name'),
    circuit: required('circuit'),
    countryFlag: required('flag'),
    duration: required('duration'),
    outDir: a.outDir ?? path.join(process.cwd(), 'app', 'data', 'races'),
    every: Number(a.every ?? '10'),
    limit: Number(a.limit ?? '1200'),
  }
}

async function readJson<T>(p: string): Promise<T> {
  const raw = await fs.readFile(p, 'utf-8')
  return JSON.parse(raw) as T
}

async function writeJson(p: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(p), { recursive: true })
  await fs.writeFile(p, JSON.stringify(data, null, 2), 'utf-8')
}

function isFullFrameFilename(file: string): boolean {
  // Recorder convention in provided folder:
  // - incremental: <timestamp>i.json
  // - full frame:  <timestamp>.json
  return /^\d+\.json$/.test(file)
}

function basenameToTsMs(file: string): number {
  const base = path.basename(file, '.json')
  // filenames are Unix seconds, sometimes prefixed with a leading 0
  const sec = Number(base)
  return Number.isFinite(sec) ? sec * 1000 : Date.now()
}

function toReplayMessages(raw: unknown[] | undefined) {
  if (!raw?.length) return []
  // Match the same mapping style used in useTiming71.ts
  return raw.slice(-50).map((m, i) => ({
    id:        Date.now() + i,
    timestamp: Array.isArray(m) ? String(m[0] ?? '') : '',
    type:      'general' as const,
    text:      Array.isArray(m) ? String(m[2] ?? '') : String(m),
  }))
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  const manifestPath = path.join(args.src, 'manifest.json')
  const manifest = await readJson<T71Manifest>(manifestPath)
  const colMap = buildColMap((manifest as any).colSpec ?? (manifest as any).colSpec ?? manifest.colSpec)

  const entries = await fs.readdir(args.src)
  const fullFiles = entries
    .filter(isFullFrameFilename)
    .sort((a, b) => Number(path.basename(a, '.json')) - Number(path.basename(b, '.json')))

  const picked: string[] = []
  for (let i = 0; i < fullFiles.length; i += Math.max(1, args.every)) {
    picked.push(fullFiles[i])
    if (picked.length >= args.limit) break
  }

  if (!picked.length) {
    throw new Error(`No full snapshot files found in ${args.src}`)
  }

  const snapshots: RaceSnapshot[] = []
  let firstTs = 0

  for (let i = 0; i < picked.length; i++) {
    const file = picked[i]
    const p = path.join(args.src, file)
    const frame = await readJson<RecordingFrame>(p)

    const ts = frame.lastUpdated ?? basenameToTsMs(file)
    if (!firstTs) firstTs = ts

    const carsRaw = (frame as any).cars as any[][]
    const sessionRaw = (frame as any).session ?? {}
    const msgRaw = (frame as any).messages as unknown[] | undefined

    if (!carsRaw?.length) continue

    const cars = normalizeCars(carsRaw, colMap)
    const raceInfo = normalizeSession(sessionRaw, manifest)
    const stats = computeStats(cars, sessionRaw)
    const messages = toReplayMessages(msgRaw)

    snapshots.push({
      idx: i,
      ts,
      cars,
      raceInfo: raceInfo as any,
      stats,
      messages: messages as any,
    })
  }

  const meta: RaceMeta = {
    id:          `${args.year}-r${args.round}`,
    year:        args.year,
    round:       args.round,
    name:        args.name,
    circuit:     args.circuit,
    countryFlag: args.countryFlag,
    duration:    args.duration,
    date:        new Date(firstTs || Date.now()).toISOString().slice(0, 10),
    snapshots:   snapshots.length,
    updatedAt:   Date.now(),
  }

  const data: RaceData = { meta, snapshots }

  const racePath = path.join(args.outDir, String(args.year), `r${args.round}.json`)
  await writeJson(racePath, data)

  const indexPath = path.join(args.outDir, 'index.json')
  const index = (await (async () => {
    try {
      return await readJson<RaceIndex>(indexPath)
    } catch {
      return { races: [] } as RaceIndex
    }
  })())

  const existing = index.races.findIndex(r => r.id === meta.id)
  if (existing >= 0) index.races[existing] = meta
  else index.races.unshift(meta)

  await writeJson(indexPath, index)

  // eslint-disable-next-line no-console
  console.log(`OK: wrote ${snapshots.length} snapshots to ${racePath}`)
}

main().catch(err => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})


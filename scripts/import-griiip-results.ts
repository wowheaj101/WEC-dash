/**
 * Import a past WEC race's final results from Griiip's REST API
 * and convert it into our RaceData format (single-snapshot leaderboard).
 *
 * Usage:
 *   npm run import:griiip -- --year 2026 --round 2
 *   npm run import:griiip -- --sid 18110 --year 2026 --round 2
 *
 * After running, push to Vercel Blob:
 *   npm run push:races
 */
import { promises as fs } from 'fs'
import path from 'path'

import type { Car, RaceInfo, Stats, CarClass, Status } from '@/app/types/race'
import type { RaceData, RaceIndex, RaceMeta, RaceSnapshot } from '@/app/types/replay'
import { CURRENT_SEASON } from '@/app/data/calendar'

const API_ROOT = 'https://insights.griiip.com'

// year → seasonId in Griiip's catalog
const SEASON_ID_BY_YEAR: Record<number, number> = {
  2026: 1034,
}

// ── CLI args ──────────────────────────────────────────────────────

interface CliArgs {
  year:   number
  round:  number
  sid?:   number
  outDir: string
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
  if (!a.year || !a.round) throw new Error('Required: --year <YYYY> --round <N>')
  return {
    year:   Number(a.year),
    round:  Number(a.round),
    sid:    a.sid ? Number(a.sid) : undefined,
    outDir: a.outDir ?? path.join(process.cwd(), 'app', 'data', 'races'),
  }
}

// ── Griiip response shapes (subset) ───────────────────────────────

interface GriiipDriver {
  displayName:      string
  threeLettersName: string
}

interface GriiipParticipant {
  id:         number
  classId:    string   // "HYPERCAR" | "LMP2" | "LMGT3"
  carNumber:  string
  teamName:   string
  drivers:    GriiipDriver[]
}

interface GriiipResultRow {
  sessionParticipantId:    number
  sessionClassId:          number
  startedAt:               number
  finishedAt:              number   // class position
  overallFinishedAt:       number   // overall position
  gapFromFirst:            number   // ms — to class leader
  gapFromFirstLaps:        number
  overallGapFromFirst:     number   // ms — to overall leader
  overallGapFromFirstLaps: number
  bestLapTime:             number   // ms
  numberOfLapsCompleted:   number
  totalLapTimes:           number   // ms
  lapsLed:                 number | null
  bestSectorsMillis1:      number | null
  bestSectorsMillis2:      number | null
  bestSectorsMillis3:      number | null
  optimalLapTime:          number
  finishStatus:            string
}

interface GriiipSession {
  id:        number
  name:      string
  startTime: string
  endTime:   string
  event:     { name: string }
}

interface GriiipEvent { id: number; name: string }
interface GriiipSessionMeta {
  id:          number
  name:        string
  sessionType: string
  startTime:   string
}

// ── Helpers ───────────────────────────────────────────────────────

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`)
  return res.json() as Promise<T>
}

function mapClass(classId: string): CarClass {
  if (classId === 'HYPERCAR') return 'HYPERCAR'
  if (classId === 'LMGT3')    return 'LMGT3'
  return 'LMP2'
}

function mapStatus(finishStatus: string): Status {
  switch (finishStatus) {
    case 'DNS':
    case 'DNF':
    case 'DSQ':
    case 'Retired':
      return 'OUT'
    default:
      return 'RUN'
  }
}

function formatMs(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return '--:--.---'
  const m   = Math.floor(ms / 60000)
  const s   = Math.floor((ms % 60000) / 1000)
  const rem = ms % 1000
  return `${m}:${String(s).padStart(2, '0')}.${String(rem).padStart(3, '0')}`
}

function formatGap(ms: number, laps: number): string {
  if (laps > 0) return `+${laps}L`
  if (ms <= 0)  return 'Leader'
  return `+${(ms / 1000).toFixed(3)}`
}

/** Interval to car ahead (delta from previous result row in same class).
 *  Unlike formatGap, 0/0 here means "no measurable delta", not "leader".
 */
function formatInterval(dMs: number, dLaps: number): string {
  if (dLaps > 0) return `+${dLaps}L`
  if (dMs   > 0) return `+${(dMs / 1000).toFixed(3)}`
  return '—'
}

function formatDuration(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ── Discover Race session ID for a given (year, round) ────────────

/** Extract the most distinctive keyword from a calendar round name.
 *  e.g. "6 Hours of Imola" → "Imola"; "1812km of Qatar" → "Qatar";
 *       "24 Hours of Le Mans" → "Le Mans".
 */
function calendarKeyword(roundName: string): string {
  const m = roundName.match(/of\s+(.+)$/i)
  return (m?.[1] ?? roundName).trim()
}

async function findRaceSessionId(year: number, round: number): Promise<number> {
  const seasonId = SEASON_ID_BY_YEAR[year]
  if (!seasonId) {
    throw new Error(`Unknown season: ${year}. Add ${year} → seasonId mapping to SEASON_ID_BY_YEAR.`)
  }

  const calRound = CURRENT_SEASON.find(r => r.round === round)
  if (!calRound) throw new Error(`Round ${round} not in CURRENT_SEASON calendar`)

  const keyword = calendarKeyword(calRound.name).toLowerCase()
  const events  = await fetchJson<GriiipEvent[]>(`${API_ROOT}/meta/seasons/${seasonId}/events`)

  // Match by keyword in event name. Skip prologue / non-race events.
  const matched = events.find(ev =>
    ev.name.toLowerCase().includes(keyword) && !/prologue/i.test(ev.name)
  )

  if (!matched) {
    const available = events.map(e => `  ${e.id}  ${e.name}`).join('\n')
    throw new Error(
      `No event matching keyword "${keyword}" for Round ${round}.\nAvailable events:\n${available}`,
    )
  }

  const sessions = await fetchJson<GriiipSessionMeta[]>(`${API_ROOT}/meta/events/${matched.id}/sessions`)
  const race = sessions.find(s => s.sessionType === 'Race')
  if (!race) throw new Error(`No Race session in event ${matched.id} (${matched.name})`)

  console.log(`Round ${round}: ${matched.name} → sid=${race.id}`)
  return race.id
}

// ── Main ──────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2))

  const sid = args.sid ?? await findRaceSessionId(args.year, args.round)

  const [session, participants, resultsRaw] = await Promise.all([
    fetchJson<GriiipSession>(`${API_ROOT}/meta/sessions/${sid}`),
    fetchJson<GriiipParticipant[]>(`${API_ROOT}/meta/sessions/${sid}/participants`),
    fetchJson<{ results: GriiipResultRow[] }>(`${API_ROOT}/meta/sessions/${sid}/results`),
  ])

  const results = resultsRaw.results
  if (!results?.length) throw new Error(`No results for sid=${sid}`)

  const partById = new Map(participants.map(p => [p.id, p]))

  const calRound = CURRENT_SEASON.find(r => r.round === args.round)
  if (!calRound) throw new Error(`Round ${args.round} not found in CURRENT_SEASON calendar`)

  // Overall fastest lap across all classes
  let overallBestMs = Infinity
  for (const r of results) {
    if (r.bestLapTime > 0 && r.bestLapTime < overallBestMs) overallBestMs = r.bestLapTime
  }

  const sortedResults = [...results].sort((a, b) => a.overallFinishedAt - b.overallFinishedAt)
  const cars: Car[] = sortedResults.map(r => {
    const p = partById.get(r.sessionParticipantId)
    if (!p) throw new Error(`No participant for sessionParticipantId=${r.sessionParticipantId}`)

    const isOverallBest = r.bestLapTime > 0 && r.bestLapTime === overallBestMs

    return {
      pos:          r.overallFinishedAt,
      clsPos:       r.finishedAt,
      carClass:     mapClass(p.classId),
      carNum:       parseInt(p.carNumber, 10) || 0,
      team:         p.teamName,
      drivers:      p.drivers.map(d => d.threeLettersName).join(' / '),
      tire:         'S',
      laps:         r.numberOfLapsCompleted,
      lastLap:      '--:--.---',
      bestLap:      formatMs(r.bestLapTime),
      gap:          formatGap(r.gapFromFirst, r.gapFromFirstLaps),  // class-relative
      interval:     '—',  // computed below
      pitstops:     0,
      status:       mapStatus(r.finishStatus),
      isFastestLap: isOverallBest,
      bestColor:    isOverallBest ? 'sb' : 'pb',
    } as Car
  })

  // Compute class-relative intervals (gap to car immediately ahead in same class)
  const byClass = new Map<CarClass, Array<{ car: Car; raw: GriiipResultRow }>>()
  sortedResults.forEach(r => {
    const car = cars.find(c => c.pos === r.overallFinishedAt)!
    const list = byClass.get(car.carClass) ?? []
    list.push({ car, raw: r })
    byClass.set(car.carClass, list)
  })
  for (const list of Array.from(byClass.values())) {
    list.sort((a, b) => a.raw.finishedAt - b.raw.finishedAt)
    for (let i = 0; i < list.length; i++) {
      if (i === 0) {
        list[i].car.interval = 'Leader'
      } else {
        const cur = list[i].raw
        const ahd = list[i - 1].raw
        const dLaps = cur.gapFromFirstLaps - ahd.gapFromFirstLaps
        const dMs   = cur.gapFromFirst    - ahd.gapFromFirst
        list[i].car.interval = formatInterval(dMs, dLaps)
      }
    }
  }

  // RaceInfo (final state)
  const startMs   = new Date(session.startTime).getTime()
  const endMs     = new Date(session.endTime).getTime()
  const elapsedMs = Math.max(0, endMs - startMs)

  const raceInfo: RaceInfo = {
    name:      session.event?.name ?? calRound.name,
    round:     args.round,
    elapsed:   formatDuration(elapsedMs),
    total:     calRound.duration,
    remaining: '0:00:00',
    flag:      'GREEN',
    weather:   { air: 0, track: 0, humidity: 0, condition: 'unknown' },
  }

  // Stats
  const leaderLap = Math.max(...results.map(r => r.numberOfLapsCompleted))
  const fastestCar = cars.find(c => c.isFastestLap)
  const stats: Stats = {
    leaderLap,
    totalPitstops: 0,
    fastestLap: {
      time:   fastestCar?.bestLap ?? '--:--.---',
      carNum: fastestCar?.carNum  ?? 0,
      team:   fastestCar?.team    ?? '',
    },
    safetyCars:   0,
    safetyCarlap: 0,
  }

  const snapshot: RaceSnapshot = {
    idx:      0,
    ts:       endMs || Date.now(),
    cars,
    raceInfo,
    stats,
    messages: [],
  }

  const meta: RaceMeta = {
    id:          `${args.year}-r${args.round}`,
    year:        args.year,
    round:       args.round,
    name:        calRound.name,
    circuit:     calRound.circuit,
    countryFlag: calRound.countryFlag,
    duration:    calRound.duration,
    date:        new Date(startMs).toISOString().slice(0, 10),
    snapshots:   1,
    updatedAt:   Date.now(),
  }

  const data: RaceData = { meta, snapshots: [snapshot] }

  // Write race file
  const racePath = path.join(args.outDir, String(args.year), `r${args.round}.json`)
  await fs.mkdir(path.dirname(racePath), { recursive: true })
  await fs.writeFile(racePath, JSON.stringify(data, null, 2), 'utf-8')

  // Update index
  const indexPath = path.join(args.outDir, 'index.json')
  let index: RaceIndex
  try {
    index = JSON.parse(await fs.readFile(indexPath, 'utf-8'))
  } catch {
    index = { races: [] }
  }
  const idx = index.races.findIndex(r => r.id === meta.id)
  if (idx >= 0) index.races[idx] = meta
  else          index.races.unshift(meta)
  await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8')

  console.log(`OK: imported ${cars.length} cars (sid=${sid}) → ${racePath}`)
  console.log(`Run \`npm run push:races\` to upload to Vercel Blob.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})

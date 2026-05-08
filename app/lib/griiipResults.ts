/**
 * Griiip completed/in-progress session results client
 *
 * Companion to `griiipClient.ts` (live SignalR). This module fetches
 * static session results via REST so the dashboard can display past
 * sessions (FP1/FP2/FP3/Q/HP/Race) for the current event without a
 * live SignalR connection.
 *
 * Endpoint reference (all under the /api/griiip rewrite):
 *  - /meta/series/${seriesId}/events            → all events for a series
 *  - /meta/events/${eventId}/sessions           → all sessions for an event
 *  - /meta/sessions/${sid}/results              → final/in-progress results
 *  - /meta/sessions/${sid}/participants         → pid → car/team/drivers
 */

import type { GriiipParticipant } from './griiipClient'
import type { Car, CarClass, Stats, Status, DriverStat } from '@/app/types/race'

const API_ROOT      = '/api/griiip'
const WEC_SERIES_ID = 10

// ── Types ─────────────────────────────────────────────────────────

export interface EventMeta {
  id:                    number
  name:                  string
  status:                string  // 'Live' | 'Ongoing' | 'Past' | 'Upcoming' (unreliable — use dates)
  firstSessionStartTime: string
  lastSessionEndTime:    string
}

export type SessionTypeStr = 'Practice' | 'Qualify' | 'Race' | string

export interface SessionMeta {
  id:          number
  name:        string         // e.g. 'Free Practice 3', 'Qualifying - LMGT3', 'Hyperpole - HYPERCAR', 'Race'
  sessionType: SessionTypeStr
  startTime:   string         // ISO
  endTime:     string         // ISO
  isRunning:   boolean
}

export interface ResultRow {
  sessionId:               number
  sessionClassId:          number
  sessionParticipantId:    number  // pid
  startedAt:               number | null
  finishedAt:              number  // class position (1-based)
  overallFinishedAt:       number  // overall position (1-based)
  gapFromFirst:            number  // ms — within class
  gapFromFirstLaps:        number  // laps down — within class
  overallGapFromFirst:     number
  overallGapFromFirstLaps: number
  bestLapTime:             number  // ms
  numberOfLapsCompleted:   number
  totalLapTimes:           number
  bestSectorsMillis1:      number | null
  bestSectorsMillis2:      number | null
  bestSectorsMillis3:      number | null
  optimalLapTime:          number
  finishStatus:            string  // 'Finished' | 'Unknown'
  penaltyTime:             number
  penaltyPlaces:           number
}

export interface ResultsResponse {
  results:                  ResultRow[]
  bestLapTime:              number
  numberOfLaps:             number
  raceDurationMiilliseconds: number  // (sic — Griiip's own typo)
}

// ── Fetchers ──────────────────────────────────────────────────────

export async function fetchSeriesEvents(seriesId: number = WEC_SERIES_ID): Promise<EventMeta[]> {
  const res = await fetch(`${API_ROOT}/meta/series/${seriesId}/events`)
  if (!res.ok) throw new Error(`fetchSeriesEvents: ${res.status}`)
  return res.json()
}

export async function fetchEventSessions(eventId: number): Promise<SessionMeta[]> {
  const res = await fetch(`${API_ROOT}/meta/events/${eventId}/sessions`)
  if (!res.ok) throw new Error(`fetchEventSessions: ${res.status}`)
  return res.json()
}

export async function fetchSessionResults(sid: number): Promise<ResultsResponse> {
  const res = await fetch(`${API_ROOT}/meta/sessions/${sid}/results`)
  if (!res.ok) throw new Error(`fetchSessionResults: ${res.status}`)
  return res.json()
}

export async function fetchSessionParticipants(sid: number): Promise<GriiipParticipant[]> {
  const res = await fetch(`${API_ROOT}/meta/sessions/${sid}/participants`)
  if (!res.ok) throw new Error(`fetchSessionParticipants: ${res.status}`)
  return res.json()
}

// ── Event discovery ──────────────────────────────────────────────

/**
 * Pick the event that contains `now`, or fall back to the most recent past event.
 * Status field on the event is unreliable, so this uses date ranges.
 */
export function findCurrentEvent(events: EventMeta[], now: Date = new Date()): EventMeta | null {
  const ts = now.getTime()
  const ongoing = events.find(e => {
    const start = new Date(e.firstSessionStartTime).getTime()
    const end   = new Date(e.lastSessionEndTime).getTime()
    return ts >= start && ts <= end
  })
  if (ongoing) return ongoing

  const past = events
    .filter(e => new Date(e.lastSessionEndTime).getTime() < ts)
    .sort((a, b) => new Date(b.lastSessionEndTime).getTime() - new Date(a.lastSessionEndTime).getTime())
  return past[0] ?? null
}

// ── Session label helpers ────────────────────────────────────────

/** Short label for SessionSelector buttons. e.g. 'FP3', 'Q · GT3', 'HP · HC', 'RACE'. */
export function shortSessionLabel(s: SessionMeta): string {
  const fp = /Free Practice (\d)/.exec(s.name)
  if (fp) return `FP${fp[1]}`
  const q = /^Qualifying - (\w+)/.exec(s.name)
  if (q) return `Q · ${q[1] === 'LMGT3' ? 'GT3' : 'HC'}`
  const hp = /^Hyperpole - (\w+)/.exec(s.name)
  if (hp) return `HP · ${hp[1] === 'LMGT3' ? 'GT3' : 'HC'}`
  if (s.sessionType === 'Race') return 'RACE'
  return s.name.toUpperCase()
}

// ── Internal helpers ─────────────────────────────────────────────

function mapClass(classId: string): CarClass {
  if (classId === 'HYPERCAR') return 'HYPERCAR'
  if (classId === 'LMGT3')    return 'LMGT3'
  return 'LMP2'
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

function formatSector(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return '--'
  const s   = Math.floor(ms / 1000)
  const rem = ms % 1000
  return `${s}.${String(rem).padStart(3, '0')}`
}

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '--:--:--'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ── Build Cars from session results ──────────────────────────────

interface InternalRow {
  car:     Car
  gapMs:   number
  gapLaps: number
}

export function buildCarsFromResults(
  results: ResultRow[],
  participants: GriiipParticipant[],
): Car[] {
  const pmap = new Map(participants.map(p => [p.id, p]))

  let overallBest = Infinity
  for (const r of results) {
    if (r.bestLapTime > 0 && r.bestLapTime < overallBest) overallBest = r.bestLapTime
  }

  const rows: InternalRow[] = []
  for (const r of results) {
    const p = pmap.get(r.sessionParticipantId)
    if (!p) continue

    const isFastest = r.bestLapTime > 0 && r.bestLapTime === overallBest

    const car: Car = {
      pos:          r.overallFinishedAt ?? 999,
      clsPos:       r.finishedAt        ?? 999,
      carClass:     mapClass(p.classId),
      carNum:       parseInt(p.carNumber) || 0,
      carNumStr:    p.carNumber,
      team:         p.teamName,
      drivers:      p.drivers.map(d => d.threeLettersName).join(' / '),
      tire:         '?',
      laps:         r.numberOfLapsCompleted,
      lastLap:      '--:--.---',  // not exposed in /results
      bestLap:      formatMs(r.bestLapTime),
      gap:          formatGap(r.gapFromFirst, r.gapFromFirstLaps),
      interval:     '--',         // computed below
      pitstops:     0,             // not exposed in /results
      status:       'RUN' as Status,
      isFastestLap: isFastest,
      bestColor:    isFastest ? 'sb' : undefined,
    }

    rows.push({ car, gapMs: r.gapFromFirst, gapLaps: r.gapFromFirstLaps })
  }

  // Compute class-relative interval (gap to car ahead in same class).
  const byClass = new Map<CarClass, InternalRow[]>()
  for (const row of rows) {
    const list = byClass.get(row.car.carClass) ?? []
    list.push(row)
    byClass.set(row.car.carClass, list)
  }

  Array.from(byClass.values()).forEach(list => {
    list.sort((a, b) => a.car.clsPos - b.car.clsPos)
    list.forEach((row, i) => {
      if (i === 0) {
        row.car.interval = 'Leader'
      } else {
        const ahead = list[i - 1]
        row.car.interval = formatGap(
          row.gapMs   - ahead.gapMs,
          row.gapLaps - ahead.gapLaps,
        )
      }
    })
  })

  return rows.map(r => r.car).sort((a, b) => a.pos - b.pos)
}

export function buildDriverStatsFromResults(
  results: ResultRow[],
  participants: GriiipParticipant[],
): DriverStat[] {
  const pmap = new Map(participants.map(p => [p.id, p]))

  // Find session-best lap time across all cars
  let overallBest = Infinity
  for (const r of results) {
    if (r.bestLapTime > 0 && r.bestLapTime < overallBest) overallBest = r.bestLapTime
  }

  const stats: DriverStat[] = []
  for (const r of results) {
    const p = pmap.get(r.sessionParticipantId)
    if (!p) continue

    const primary = p.drivers[0]
    const bestMs    = r.bestLapTime > 0 ? r.bestLapTime    : null
    const optimalMs = r.optimalLapTime > 0 ? r.optimalLapTime : null
    const gap       = (bestMs && optimalMs && bestMs >= optimalMs) ? bestMs - optimalMs : null
    stats.push({
      carNum:         parseInt(p.carNumber) || 0,
      carNumStr:      p.carNumber,
      carClass:       mapClass(p.classId),
      team:           p.teamName,
      driver:         primary?.displayName || primary?.threeLettersName || p.threeLettersName,
      bestLap:        formatMs(bestMs),
      bestLapMs:      bestMs,
      s1:             formatSector(r.bestSectorsMillis1),
      s2:             formatSector(r.bestSectorsMillis2),
      s3:             formatSector(r.bestSectorsMillis3),
      optimalLap:     formatMs(optimalMs),
      optimalLapMs:   optimalMs,
      gapToOptimalMs: gap,
      totalTime:      formatDuration(r.totalLapTimes),
      isSessionBest:  r.bestLapTime > 0 && r.bestLapTime === overallBest,
    })
  }
  return stats
    .filter(d => d.carNum > 0 || d.carNumStr.length > 0)
    .sort((a, b) => a.carNum - b.carNum)
}

export function buildStatsFromResults(
  results: ResultRow[],
  participants: GriiipParticipant[],
): Stats {
  const pmap = new Map(participants.map(p => [p.id, p]))

  let leaderLap   = 0
  let fastestMs   = Infinity
  let fastestPid  = 0

  for (const r of results) {
    if (r.numberOfLapsCompleted > leaderLap) leaderLap = r.numberOfLapsCompleted
    if (r.bestLapTime > 0 && r.bestLapTime < fastestMs) {
      fastestMs  = r.bestLapTime
      fastestPid = r.sessionParticipantId
    }
  }

  const fastestParticipant = pmap.get(fastestPid)

  return {
    leaderLap,
    totalPitstops: 0,  // not exposed in /results
    fastestLap: {
      time:   formatMs(fastestMs === Infinity ? null : fastestMs),
      carNum: fastestParticipant ? parseInt(fastestParticipant.carNumber) || 0 : 0,
      team:   fastestParticipant?.teamName ?? '',
    },
    safetyCars:   0,
    safetyCarlap: 0,
  }
}

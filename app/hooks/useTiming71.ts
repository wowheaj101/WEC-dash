'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { Car, RaceInfo, Stats, Message, FlagStatus, CarClass, Status, CarStint, StintEntry, DriverStat, LapHistoryEntry } from '@/app/types/race'
import { GriiipClient }      from '@/app/lib/griiipClient'
import type {
  GriiipParticipant,
  RankItem,
  GapItem,
  LapItem,
  ClockItem,
  FlagItem,
  RaceLogItem,
  PitItem,
  LiveScheduleSession,
} from '@/app/lib/griiipClient'
import { CURRENT_SEASON }     from '@/app/data/calendar'
import { getRoundStatus }     from '@/app/lib/getRoundStatus'
import { fetchSessionResults, buildCarsFromResults } from '@/app/lib/griiipResults'
import type { SnapshotPayload } from '@/app/api/races/snapshot/route'
import type { RaceData }        from '@/app/types/replay'

import {
  raceInfo   as dummyRaceInfo,
  stats      as dummyStats,
  cars       as dummyCars,
  messages   as dummyMessages,
  carStints  as dummyCarStints,
  driverStats as dummyDriverStats,
} from '@/app/data/dummyData'

// ── Connection status ─────────────────────────────────────────────

export type ConnStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'discovering'
  | 'live'
  | 'no_service'
  | 'showing_previous'   // 라이브 세션 없음 — 직전 완료 라운드의 마지막 snapshot 표시 중
  | 'disconnected'
  | 'error'

export interface UseTiming71Result {
  status:      ConnStatus
  serviceName: string | null
  liveSid:     number | null   // sid of the currently-streamed WEC session (null if no live)
  cars:        Car[]
  raceInfo:    RaceInfo
  stats:       Stats
  messages:    Message[]
  carStints:   CarStint[]
  driverStats: DriverStat[]
  /** Per-car lap-time history for the Drivers chart. Keyed by carNumStr. */
  lapHistory:  Record<string, LapHistoryEntry[]>
  isLive:      boolean
  reconnect:   () => void
}

// ── Helpers ───────────────────────────────────────────────────────

function formatMs(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return '--:--.---'
  const m   = Math.floor(ms / 60000)
  const s   = Math.floor((ms % 60000) / 1000)
  const rem = ms % 1000
  return `${m}:${String(s).padStart(2, '0')}.${String(rem).padStart(3, '0')}`
}

function formatElapsed(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`
}

function formatGap(ms: number, laps: number): string {
  if (laps > 0) return `+${laps}L`
  if (ms <= 0)  return 'Leader'
  return `+${(ms / 1000).toFixed(3)}`
}

function mapFlag(flag: string): FlagStatus {
  switch (flag) {
    case 'Yellow':          return 'YELLOW'
    case 'SafetyCar':
    case 'VirtualSafetyCar':return 'SC'
    case 'Red':             return 'RED'
    default:                return 'GREEN'
  }
}

function mapClass(classId: string): CarClass {
  if (classId === 'HYPERCAR') return 'HYPERCAR'
  if (classId === 'LMGT3')    return 'LMGT3'
  return 'LMP2'
}

function formatDuration(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatSectorMs(ms: number | null): string {
  if (ms === null || ms <= 0) return '--'
  return (ms / 1000).toFixed(3)
}

/** True when restored cars[] looks like real standings data.
 *  Discards datasets where every car has the same clsPos or gap (which
 *  happens when REST /results returns finishedAt=1 for in-progress sessions). */
function isCarsRestoreValid(cars: Car[]): boolean {
  if (cars.length === 0) return false
  if (cars.length === 1) return true
  const uniqueClsPos = new Set(cars.map(c => c.clsPos))
  const uniqueGap    = new Set(cars.map(c => c.gap))
  return uniqueClsPos.size > 1 || uniqueGap.size > 1
}

// ── Internal state types ──────────────────────────────────────────

interface LapState {
  lastLapMs:   number | null
  bestLapMs:   number | null
  lastColor:   'sb' | 'pb' | null
  bestColor:   'sb' | 'pb' | null
  inPit:       boolean
}

// ── Hook ──────────────────────────────────────────────────────────

const SNAPSHOT_INTERVAL_MS = 120_000
/** Cap lap-history entries per car so a 24 h race doesn't blow memory. */
const MAX_LAP_HISTORY = 1000

const EMPTY_RACE_INFO: RaceInfo = {
  name: '', round: 0,
  elapsed: '--:--', total: '--', remaining: '--',
  flag: 'GREEN',
  weather: { air: 0, track: 0, humidity: 0, condition: 'unknown' },
}
const EMPTY_STATS: Stats = {
  leaderLap: 0, totalPitstops: 0,
  fastestLap: { time: '--:--.---', carNum: 0, team: '' },
  safetyCars: 0, safetyCarlap: 0,
}

export function useTiming71(): UseTiming71Result {
  const [status,      setStatus]      = useState<ConnStatus>('idle')
  const [serviceName, setServiceName] = useState<string | null>(null)
  const [liveSid,     setLiveSid]     = useState<number | null>(null)
  const [cars,        setCars]        = useState<Car[]>([])
  const [raceInfo,    setRaceInfo]    = useState<RaceInfo>(EMPTY_RACE_INFO)
  const [stats,       setStats]       = useState<Stats>(EMPTY_STATS)
  const [messages,    setMessages]    = useState<Message[]>([])
  const [carStints,   setCarStints]   = useState<CarStint[]>([])
  const [driverStats, setDriverStats] = useState<DriverStat[]>([])
  const [lapHistory,  setLapHistory]  = useState<Record<string, LapHistoryEntry[]>>({})

  // Internal live state (refs — no re-render on every tick)
  const participantsRef = useRef<Map<number, GriiipParticipant>>(new Map())
  const rankRef         = useRef<Map<number, RankItem>>(new Map())
  const gapRef          = useRef<Map<number, GapItem>>(new Map())
  const lapRef          = useRef<Map<number, LapState>>(new Map())
  const pitCountRef     = useRef<Map<number, number>>(new Map())
  const clockRef        = useRef<ClockItem | null>(null)
  const scheduleRef     = useRef<LiveScheduleSession | null>(null)
  const flagRef         = useRef<FlagStatus>('GREEN')
  const sessionNameRef  = useRef<string>('')
  const scCountRef      = useRef(0)
  const scLapRef        = useRef(0)

  const stintRef        = useRef<Map<number, StintEntry[]>>(new Map())

  // pid → pit-in ts (ms) for the current open pit. Cleared on pit-out.
  const pitInTsRef      = useRef<Map<number, number>>(new Map())
  // pid → list of last-lap times (ms) for the current stint. Reset on pit-out.
  const stintLapsRef    = useRef<Map<number, number[]>>(new Map())

  // Per-car sector timing (for TrackMap linear interpolation)
  //   sectorEnterTsRef: ts (ms) when the car last entered its current sector
  //   sectorDurationRef: rolling-average duration of each sector (s1/s2/s3)
  const sectorEnterTsRef  = useRef<Map<number, { sector: number; ts: number }>>(new Map())
  const sectorDurationRef = useRef<Map<number, [number, number, number]>>(new Map())
  // Best sector time (ms) per car, used to derive optimal lap. null until first measurement.
  const sectorBestRef     = useRef<Map<number, [number | null, number | null, number | null]>>(new Map())

  // Per-car lap time history (for the lap-time evolution chart on Drivers page).
  // Bounded to MAX_LAP_HISTORY entries per car so memory stays in check during 24 h races.
  const lapHistoryRef     = useRef<Map<number, LapHistoryEntry[]>>(new Map())

  const clientRef       = useRef<GriiipClient | null>(null)
  const latestRef       = useRef({ cars, raceInfo, stats, messages, carStints, driverStats, lapHistory })
  const snapshotIdxRef  = useRef(0)
  // Monotonic message id — Date.now() collisions when multiple race-control
  // events arrive in the same tick produce unstable sort order in MessageFeed.
  const msgIdRef        = useRef(0)
  const nextMsgId = () => {
    const now = Date.now()
    msgIdRef.current = Math.max(msgIdRef.current + 1, now * 1000)
    return msgIdRef.current
  }
  // True once we've received at least one rank update — until then, don't
  // overwrite restored snapshot data with empty live state.
  const hasLiveDataRef  = useRef(false)
  // Restored cars[] from snapshot or REST /results — used by buildCars
  // as fallback for participants whose live rank/lap/gap hasn't arrived yet.
  // This keeps the leaderboard accurate from the moment of refresh,
  // even before SignalR delivers per-car incremental updates.
  const restoredCarsRef = useRef<Car[]>([])
  // Cached REST /results — re-mapped to Car[] whenever participants arrive
  // (REST results carry pid only, so they need participant metadata).
  const restResultsRef  = useRef<Awaited<ReturnType<typeof fetchSessionResults>> | null>(null)

  useEffect(() => {
    latestRef.current = { cars, raceInfo, stats, messages, carStints, driverStats, lapHistory }
  }, [cars, raceInfo, stats, messages, carStints, driverStats, lapHistory])

  const isLive = status === 'live'

  // ── Build normalized Car[] from current refs ──────────────────

  const buildCars = useCallback((): Car[] => {
    const participants = Array.from(participantsRef.current.values())
    if (participants.length === 0) return []

    // Find overall best lap for isFastestLap
    let overallBest = Infinity
    Array.from(lapRef.current.values()).forEach(ls => {
      if (ls.bestLapMs && ls.bestLapMs < overallBest) overallBest = ls.bestLapMs
    })

    // Build a lookup of restored cars (snapshot or REST results) by car number.
    // Validity is enforced upstream in isCarsRestoreValid, but re-check here as
    // a safety net against stale or partial data sneaking in.
    const restoredCars = restoredCarsRef.current
    const restoredByCarNum = isCarsRestoreValid(restoredCars)
      ? new Map(restoredCars.map(c => [c.carNumStr, c]))
      : new Map<string, Car>()

    const mapped = participants.map((p): Car => {
      const rank = rankRef.current.get(p.id)
      const gap  = gapRef.current.get(p.id)
      const laps = lapRef.current.get(p.id)
      const pits = pitCountRef.current.get(p.id) ?? 0
      const sectorBests = sectorBestRef.current.get(p.id)
      const restored = restoredByCarNum.get(p.carNumber)

      const hasLiveStatus = !!(rank || laps)
      const status: Status = rank?.isDeleted ? 'OUT'
        : (laps?.inPit ? 'PIT' : (hasLiveStatus ? 'RUN' : (restored?.status ?? 'RUN')))

      const sectorEnter = sectorEnterTsRef.current.get(p.id)
      const sectorDurs  = sectorDurationRef.current.get(p.id)
      const sectorNum   = rank?.sectorNumber
      const sectorEnterTs = sectorEnter && sectorEnter.sector === sectorNum
        ? sectorEnter.ts
        : undefined
      const sectorDurationMs = sectorDurs && sectorNum
        ? sectorDurs[Math.max(0, Math.min(2, sectorNum - 1))] || undefined
        : undefined

      return {
        // Live data takes priority; fallback to restored when missing
        pos:          rank?.overallPosition ?? restored?.pos    ?? 1,
        clsPos:       rank?.position        ?? restored?.clsPos ?? 1,
        carClass:     mapClass(p.classId),
        carNum:       parseInt(p.carNumber) || 0,
        carNumStr:    p.carNumber,
        team:         p.teamName,
        drivers:      p.drivers.map(d => d.threeLettersName).join(' / '),
        manufacturer: p.manufacturer || restored?.manufacturer,
        tire:         restored?.tire ?? '?',
        laps:         rank?.lapNumber ?? restored?.laps ?? 0,
        lastLap:      laps?.lastLapMs ? formatMs(laps.lastLapMs) : (restored?.lastLap ?? '--:--.---'),
        bestLap:      laps?.bestLapMs ? formatMs(laps.bestLapMs) : (restored?.bestLap ?? '--:--.---'),
        gap:          gap ? formatGap(gap.gapToFirstMillis, gap.gapToFirstLaps) : (restored?.gap ?? 'Leader'),
        interval:     gap ? formatGap(gap.gapToAheadMillis, gap.gapToAheadLaps) : (restored?.interval ?? '--'),
        pitstops:     pits || (restored?.pitstops ?? 0),
        status,
        isFastestLap: !!(laps?.bestLapMs && laps.bestLapMs === overallBest) || (!laps && (restored?.isFastestLap ?? false)),
        lastColor:    laps?.lastColor ?? restored?.lastColor,
        bestColor:    laps?.bestColor ?? restored?.bestColor,
        sectorNum:    rank?.sectorNumber ?? restored?.sectorNum,
        s1Ms:         sectorBests?.[0] ?? restored?.s1Ms ?? null,
        s2Ms:         sectorBests?.[1] ?? restored?.s2Ms ?? null,
        s3Ms:         sectorBests?.[2] ?? restored?.s3Ms ?? null,
        sectorEnterTs,
        sectorDurationMs,
      } as Car
    })

    return mapped
      .filter(c => c.carNum > 0)
      .sort((a, b) => a.pos - b.pos)
  }, [])

  // ── Build RaceInfo ────────────────────────────────────────────

  const buildRaceInfo = useCallback((): RaceInfo => {
    const clock    = clockRef.current
    const schedule = scheduleRef.current
    const elapsed  = clock?.elapsedTimeMillisNow ?? 0
    const total    = schedule?.lengthLimit?.timeLimitSeconds ?? 21600
    const totalMs  = total * 1000
    const remaining = Math.max(0, totalMs - elapsed)

    return {
      name:      sessionNameRef.current || dummyRaceInfo.name,
      round:     getRoundStatus(CURRENT_SEASON).current?.round ?? dummyRaceInfo.round,
      elapsed:   formatElapsed(elapsed),
      total:     `${Math.round(total / 3600)}h`,
      remaining: formatElapsed(remaining),
      flag:      flagRef.current,
      weather:   dummyRaceInfo.weather,  // Griiip doesn't provide weather; useWeather hook handles it
    }
  }, [])

  // ── Build CarStints ───────────────────────────────────────────

  const buildCarStints = useCallback((): CarStint[] => {
    return Array.from(participantsRef.current.values())
      .map((p): CarStint => ({
        carNum:    parseInt(p.carNumber) || 0,
        carNumStr: p.carNumber,
        carClass:  mapClass(p.classId),
        team:      p.teamName,
        stints:    stintRef.current.get(p.id) ?? [{ startLap: 1, endLap: null, tire: '?' }],
      }))
      .filter(c => c.carNum > 0)
      .sort((a, b) => a.carNum - b.carNum)
  }, [])

  // ── Build DriverStats ─────────────────────────────────────────

  const buildDriverStats = useCallback((): DriverStat[] => {
    const participants = Array.from(participantsRef.current.values())
    if (participants.length === 0) return []

    let globalBestMs = Infinity
    Array.from(lapRef.current.values()).forEach(ls => {
      if (ls.bestLapMs && ls.bestLapMs < globalBestMs) globalBestMs = ls.bestLapMs
    })

    return participants
      .map((p): DriverStat => {
        const lapState = lapRef.current.get(p.id)
        const rankItem = rankRef.current.get(p.id)
        const bestMs   = lapState?.bestLapMs ?? null
        const isSessionBest = !!(bestMs && bestMs === globalBestMs)
        const totalMs  = rankItem?.elapsedTimeMillis ?? 0
        const primaryDriver = p.drivers[0]

        // Optimal lap = sum of best sectors (only if all 3 sectors have been measured)
        const sb = sectorBestRef.current.get(p.id)
        const allSectorsKnown = sb && sb[0] !== null && sb[1] !== null && sb[2] !== null
        const optimalMs = allSectorsKnown ? (sb![0]! + sb![1]! + sb![2]!) : null
        const gap = (bestMs && optimalMs && bestMs >= optimalMs) ? bestMs - optimalMs : null

        return {
          carNum:         parseInt(p.carNumber) || 0,
          carNumStr:      p.carNumber,
          carClass:       mapClass(p.classId),
          team:           p.teamName,
          driver:         primaryDriver?.displayName || primaryDriver?.threeLettersName || p.threeLettersName,
          bestLap:        formatMs(bestMs),
          bestLapMs:      bestMs,
          s1:             formatSectorMs(sb?.[0] ?? null),
          s2:             formatSectorMs(sb?.[1] ?? null),
          s3:             formatSectorMs(sb?.[2] ?? null),
          optimalLap:     formatMs(optimalMs),
          optimalLapMs:   optimalMs,
          gapToOptimalMs: gap,
          totalTime:      formatDuration(totalMs),
          isSessionBest,
        }
      })
      .filter(d => d.carNum > 0)
      .sort((a, b) => a.carNum - b.carNum)
  }, [])

  // ── Build Stats ───────────────────────────────────────────────

  const buildStats = useCallback((): Stats => {
    const schedule = scheduleRef.current
    const leaderLap = schedule?.leaderLap ?? 0

    let totalPitstops = 0
    Array.from(pitCountRef.current.values()).forEach(n => { totalPitstops += n })

    let fastestMs   = Infinity
    let fastestCar: Car | undefined
    const currentCars = buildCars()
    const participantList = Array.from(participantsRef.current.values())
    currentCars.forEach(car => {
      const pid = participantList.find(p => p.carNumber === car.carNumStr)?.id ?? 0
      const ls  = lapRef.current.get(pid)
      if (ls?.bestLapMs && ls.bestLapMs < fastestMs) {
        fastestMs  = ls.bestLapMs
        fastestCar = car
      }
    })

    return {
      leaderLap,
      totalPitstops,
      fastestLap: {
        time:   formatMs(fastestMs === Infinity ? null : fastestMs),
        carNum: fastestCar?.carNum ?? 0,
        team:   fastestCar?.team  ?? '',
      },
      safetyCars:   scCountRef.current,
      safetyCarlap: scLapRef.current,
    }
  }, [buildCars])

  // ── Flush all state to React ──────────────────────────────────

  const buildLapHistory = useCallback((): Record<string, LapHistoryEntry[]> => {
    const out: Record<string, LapHistoryEntry[]> = {}
    Array.from(lapHistoryRef.current.entries()).forEach(([pid, hist]) => {
      const p = participantsRef.current.get(pid)
      if (!p || hist.length === 0) return
      out[p.carNumber] = hist
    })
    return out
  }, [])

  const flush = useCallback(() => {
    // Don't overwrite restored snapshot until we've received real live data
    if (!hasLiveDataRef.current) return

    const newCars        = buildCars()
    const newRaceInfo    = buildRaceInfo()
    const newStats       = buildStats()
    const newCarStints   = buildCarStints()
    const newDriverStats = buildDriverStats()
    const newLapHistory  = buildLapHistory()
    if (newCars.length > 0) setCars(newCars)
    setRaceInfo(newRaceInfo)
    setStats(newStats)
    if (newCarStints.length > 0)   setCarStints(newCarStints)
    if (newDriverStats.length > 0) setDriverStats(newDriverStats)
    if (Object.keys(newLapHistory).length > 0) setLapHistory(newLapHistory)
    setStatus('live')
  }, [buildCars, buildRaceInfo, buildStats, buildCarStints, buildDriverStats, buildLapHistory])

  // ── Snapshot auto-save ────────────────────────────────────────

  const saveSnapshot = useCallback(async () => {
    const roundStatus  = getRoundStatus(CURRENT_SEASON)
    const activeRound  = roundStatus.current ?? roundStatus.next
    if (!activeRound) return

    const { cars: c, raceInfo: r, stats: s, messages: m, carStints: cs, driverStats: ds, lapHistory: lh } = latestRef.current
    if (!c.length) return

    const payload: SnapshotPayload = {
      year:        new Date(activeRound.raceStart).getFullYear(),
      round:       activeRound.round,
      name:        activeRound.name,
      circuit:     activeRound.circuit,
      countryFlag: activeRound.countryFlag,
      duration:    activeRound.duration,
      snapshot: {
        idx:         snapshotIdxRef.current++,
        ts:          Date.now(),
        cars:        c,
        raceInfo:    r,
        stats:       s,
        messages:    m.slice(-30),
        carStints:   cs,
        driverStats: ds,
        lapHistory:  lh,
      },
    }
    try {
      await fetch('/api/races/snapshot', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch (err) { console.warn('[snapshot] save failed:', err) }
  }, [])

  useEffect(() => {
    if (status !== 'live') return

    // Save immediately when status changes to live
    saveSnapshot()

    // Then auto-save every interval
    const timer = setInterval(() => saveSnapshot(), SNAPSHOT_INTERVAL_MS)
    return () => { clearInterval(timer); snapshotIdxRef.current = 0 }
  }, [status, saveSnapshot])

  // ── Connect ───────────────────────────────────────────────────

  const startConnection = useCallback(() => {
    clientRef.current?.disconnect()
    clientRef.current = null

    // Reset refs
    hasLiveDataRef.current  = false
    participantsRef.current = new Map()
    rankRef.current         = new Map()
    gapRef.current          = new Map()
    lapRef.current          = new Map()
    pitCountRef.current     = new Map()
    stintRef.current        = new Map()
    pitInTsRef.current      = new Map()
    stintLapsRef.current    = new Map()
    sectorEnterTsRef.current  = new Map()
    sectorDurationRef.current = new Map()
    sectorBestRef.current     = new Map()
    lapHistoryRef.current     = new Map()
    restoredCarsRef.current   = []
    restResultsRef.current    = null
    clockRef.current        = null
    scheduleRef.current     = null
    flagRef.current         = 'GREEN'
    scCountRef.current      = 0
    scLapRef.current        = 0

    setStatus('connecting')
    setServiceName(null)
    setLiveSid(null)
    setCars([])
    setMessages([])
    setCarStints([])
    setDriverStats([])
    setRaceInfo(EMPTY_RACE_INFO)
    setStats(EMPTY_STATS)

    // ── Restore last snapshot from Blob before connecting ────────
    // Runs async but doesn't block SignalR connection below.
    // Populates UI with last known state while waiting for live data,
    // and ensures snapshotIdxRef continues from the correct index.
    const roundStatus = getRoundStatus(CURRENT_SEASON)
    const activeRound = roundStatus.current ?? roundStatus.next
    if (activeRound) {
      const year = new Date(activeRound.raceStart).getFullYear()
      fetch(`/api/races/${year}/${activeRound.round}`)
        .then(r => r.ok ? r.json() as Promise<RaceData> : null)
        .then(data => {
          if (!data || data.snapshots.length === 0) return
          const latest = data.snapshots[data.snapshots.length - 1]
          snapshotIdxRef.current = latest.idx + 1
          // Cache restored cars[] as fallback for buildCars (Phase C).
          restoredCarsRef.current = latest.cars
          setCars(latest.cars)
          setRaceInfo(latest.raceInfo)
          setStats(latest.stats)
          setMessages(latest.messages)
          if (latest.carStints?.length)   setCarStints(latest.carStints)
          if (latest.driverStats?.length) setDriverStats(latest.driverStats)
          if (latest.lapHistory && Object.keys(latest.lapHistory).length > 0) setLapHistory(latest.lapHistory)
        })
        .catch(() => { /* no saved data, start fresh */ })
    }

    const client = new GriiipClient({
      onConnected:    () => setStatus(prev => prev === 'live' ? 'live' : 'discovering'),
      onDisconnected: () => setStatus('disconnected'),

      onServiceFound: (sid, name) => {
        setServiceName(name)
        setLiveSid(sid)
        sessionNameRef.current = name
        setStatus('connected')

        // Phase A: fetch REST /results in parallel for an immediate, accurate
        // snapshot of the current standings. All clients refreshing within
        // the same few seconds get the same data. Mapping to Car[] needs
        // participants, which may not have arrived yet — cache results and
        // re-attempt mapping in onParticipants.
        fetchSessionResults(sid)
          .then(results => {
            restResultsRef.current = results
            const ps = Array.from(participantsRef.current.values())
            if (ps.length > 0 && results.results?.length > 0) {
              const restCars = buildCarsFromResults(results.results, ps)
              if (restCars.length > 0 && isCarsRestoreValid(restCars)) {
                restoredCarsRef.current = restCars
              }
            }
          })
          .catch(() => { /* non-fatal */ })
      },

      onNoService: () => {
        // 일단 dummy 로 채우고, 직전 완료 라운드 데이터가 있으면 비동기로 교체
        setStatus('no_service')
        setLiveSid(null)
        setCars(dummyCars)
        setRaceInfo(dummyRaceInfo)
        setStats(dummyStats)
        setMessages(dummyMessages)
        setCarStints(dummyCarStints)
        setDriverStats(dummyDriverStats)

        const previous = getRoundStatus(CURRENT_SEASON).previous
        if (!previous) return
        const year = new Date(previous.raceStart).getFullYear()
        fetch(`/api/races/${year}/${previous.round}`)
          .then(r => r.ok ? r.json() as Promise<RaceData> : null)
          .then(data => {
            if (!data || data.snapshots.length === 0) return
            const latest = data.snapshots[data.snapshots.length - 1]
            setCars(latest.cars)
            setRaceInfo(latest.raceInfo)
            setStats(latest.stats)
            setMessages(latest.messages)
            if (latest.carStints?.length)   setCarStints(latest.carStints)
            if (latest.driverStats?.length) setDriverStats(latest.driverStats)
          if (latest.lapHistory && Object.keys(latest.lapHistory).length > 0) setLapHistory(latest.lapHistory)
            setStatus('showing_previous')
          })
          .catch(() => { /* keep dummy */ })
      },

      onSchedule: (schedule) => {
        scheduleRef.current = schedule
        flagRef.current     = mapFlag(schedule.currentFlag)
      },

      onParticipants: (participants) => {
        participantsRef.current = new Map(participants.map(p => [p.id, p]))
        for (const p of participants) {
          stintRef.current.set(p.id, [{ startLap: 1, endLap: null, tire: '?' }])
        }
        // If REST /results arrived first, map it to Car[] now that we have
        // participant metadata (pid → carNumber/team/etc).
        const cached = restResultsRef.current
        if (cached?.results?.length) {
          const restCars = buildCarsFromResults(cached.results, participants)
          if (restCars.length > 0 && isCarsRestoreValid(restCars)) {
            restoredCarsRef.current = restCars
          }
        }
      },

      onRanks: (items) => {
        hasLiveDataRef.current = true
        const now = Date.now()
        for (const item of items) {
          const prev = rankRef.current.get(item.pid)
          rankRef.current.set(item.pid, item)

          // Detect sector transition (new sectorNumber or new lap)
          const prevEnter = sectorEnterTsRef.current.get(item.pid)
          const sectorChanged = !prevEnter
            || prevEnter.sector !== item.sectorNumber
            || (prev && prev.lapNumber !== item.lapNumber)
          if (sectorChanged && item.sectorNumber) {
            // Update rolling-average duration + per-car sector best for the sector just exited
            if (prevEnter && prevEnter.sector >= 1 && prevEnter.sector <= 3) {
              const elapsed = now - prevEnter.ts
              if (elapsed > 3_000 && elapsed < 600_000) {
                const idx = prevEnter.sector - 1
                const durs = sectorDurationRef.current.get(item.pid) ?? [0, 0, 0] as [number, number, number]
                durs[idx]  = durs[idx] === 0 ? elapsed : Math.round(durs[idx] * 0.7 + elapsed * 0.3)
                sectorDurationRef.current.set(item.pid, durs)

                if (item.isDeleted !== true) {
                  const bests = sectorBestRef.current.get(item.pid) ?? [null, null, null] as [number | null, number | null, number | null]
                  if (bests[idx] === null || elapsed < (bests[idx] as number)) {
                    bests[idx] = elapsed
                    sectorBestRef.current.set(item.pid, bests)
                  }
                }
              }
            }
            sectorEnterTsRef.current.set(item.pid, { sector: item.sectorNumber, ts: now })
          }
        }
        flush()
      },

      onGaps: (items) => {
        for (const item of items) gapRef.current.set(item.pid, item)
        flush()
      },

      onLap: (item) => {
        const prev = lapRef.current.get(item.pid) ?? {
          lastLapMs: null, bestLapMs: null,
          lastColor: null, bestColor: null, inPit: false,
        }

        const lastColor = item.color === 'Purple' ? 'sb'
          : item.color === 'Green'  ? 'pb' : null

        // Check if this is the session-best lap across all cars
        let overallBest = Infinity
        Array.from(lapRef.current.values()).forEach(ls => {
          if (ls.bestLapMs && ls.bestLapMs < overallBest) overallBest = ls.bestLapMs
        })
        const isSB = item.lapTimeMillis < overallBest

        const bestLapMs = (!prev.bestLapMs || item.lapTimeMillis < prev.bestLapMs)
          ? item.lapTimeMillis : prev.bestLapMs

        lapRef.current.set(item.pid, {
          lastLapMs:  item.lapTimeMillis,
          bestLapMs,
          lastColor,
          bestColor:  isSB ? 'sb' : (bestLapMs === item.lapTimeMillis ? 'pb' : prev.bestColor),
          inPit:      prev.inPit,
        })

        // Track lap times for the current stint (drops invalid/in-pit laps).
        // Used by onPitIn to compute avgLap when the stint closes.
        const isCleanLap = item.isValid !== false && !item.isStartedInPit && !item.isEndedInPit && item.lapTimeMillis > 0
        if (isCleanLap) {
          const buf = stintLapsRef.current.get(item.pid) ?? []
          buf.push(item.lapTimeMillis)
          stintLapsRef.current.set(item.pid, buf)
        }

        // Append to lap history for the chart on Drivers page.
        if (item.lapTimeMillis > 0 && item.lapNumber > 0) {
          const hist = lapHistoryRef.current.get(item.pid) ?? []
          hist.push({ lap: item.lapNumber, ms: item.lapTimeMillis, valid: isCleanLap })
          if (hist.length > MAX_LAP_HISTORY) hist.shift()
          lapHistoryRef.current.set(item.pid, hist)
        }
        flush()
      },

      onClock: (item) => {
        clockRef.current = item
        // Update schedule leaderLap from clock if needed
        flush()
      },

      onFlag: (item) => {
        const newFlag = mapFlag(item.flag)
        if ((item.flag === 'SafetyCar' || item.flag === 'VirtualSafetyCar') &&
            flagRef.current !== 'SC') {
          scCountRef.current++
          scLapRef.current = item.lapNumber
        }
        flagRef.current = newFlag
        flush()
      },

      onRaceLog: (item) => {
        const text = item.message ?? item.text ?? ''
        if (!text) return
        // Only attach carNum/carClass when the upstream event explicitly
        // references a participant. Generic race-control messages (safety
        // car, flag changes) come without carNumber/classId and shouldn't
        // be tagged with an arbitrary car badge.
        const carNum   = item.carNumber ? parseInt(item.carNumber) : NaN
        const hasCar   = Number.isFinite(carNum) && carNum > 0
        const carClass = hasCar && item.classId ? mapClass(item.classId) : undefined
        setMessages(prev => {
          const msg: Message = {
            id:        nextMsgId(),
            timestamp: new Date(item.ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            type:      'general',
            carNum:    hasCar ? carNum : undefined,
            carClass,
            text,
          }
          return [...prev.slice(-49), msg]
        })
      },

      onPitIn: (item) => {
        const ls = lapRef.current.get(item.pid)
        if (ls) lapRef.current.set(item.pid, { ...ls, inPit: true })
        pitCountRef.current.set(item.pid, (pitCountRef.current.get(item.pid) ?? 0) + 1)

        // Close out the current stint: stamp endLap and compute avgLap from
        // the laps accumulated during this stint, then reset the buffer.
        const stints = stintRef.current.get(item.pid) ?? []
        if (stints.length > 0 && stints[stints.length - 1].endLap === null) {
          const open = stints[stints.length - 1]
          open.endLap = item.lapNumber
          const buf = stintLapsRef.current.get(item.pid) ?? []
          if (buf.length > 0) {
            const avgMs = buf.reduce((a, b) => a + b, 0) / buf.length
            open.avgLap = formatMs(avgMs)
          }
          stintLapsRef.current.set(item.pid, [])
        }
        stintRef.current.set(item.pid, stints)
        pitInTsRef.current.set(item.pid, item.ts ? new Date(item.ts).getTime() : Date.now())
        flush()

        const participant = participantsRef.current.get(item.pid)
        if (participant) {
          const carNum = parseInt(item.carNumber)
          setMessages(prev => {
            const msg: Message = {
              id:        nextMsgId(),
              timestamp: new Date(item.ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              type:      'pit',
              carNum:    Number.isFinite(carNum) && carNum > 0 ? carNum : undefined,
              carClass:  mapClass(item.classId),
              text:      `#${item.carNumber} ${participant.teamName} 피트 인`,
            }
            return [...prev.slice(-49), msg]
          })
        }
      },

      onPitOut: (item) => {
        const ls = lapRef.current.get(item.pid)
        if (ls) lapRef.current.set(item.pid, { ...ls, inPit: false })

        // Compute pit duration from the matching pit-in ts and stamp it on
        // the just-closed stint (the last stint with endLap !== null).
        const stints = stintRef.current.get(item.pid) ?? []
        const inTs   = pitInTsRef.current.get(item.pid)
        const outTs  = item.ts ? new Date(item.ts).getTime() : Date.now()
        if (inTs && stints.length > 0) {
          const closed = stints[stints.length - 1]
          if (closed.endLap !== null) {
            closed.pitDuration = ((outTs - inTs) / 1000).toFixed(1)
          }
          pitInTsRef.current.delete(item.pid)
        }
        stints.push({ startLap: item.lapNumber + 1, endLap: null, tire: '?' })
        stintRef.current.set(item.pid, stints)
        flush()

        const participant = participantsRef.current.get(item.pid)
        if (participant) {
          const carNum = parseInt(item.carNumber)
          setMessages(prev => {
            const msg: Message = {
              id:        nextMsgId(),
              timestamp: new Date(item.ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              type:      'pit',
              carNum:    Number.isFinite(carNum) && carNum > 0 ? carNum : undefined,
              carClass:  mapClass(item.classId),
              text:      `#${item.carNumber} ${participant.teamName} 피트 아웃`,
            }
            return [...prev.slice(-49), msg]
          })
        }
      },
    })

    clientRef.current = client
    client.connect().catch(() => setStatus('error'))
  }, [flush])

  useEffect(() => {
    startConnection()
    return () => { clientRef.current?.disconnect() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-reconnect after 30s on disconnect
  useEffect(() => {
    if (status !== 'disconnected') return
    const t = setTimeout(() => startConnection(), 30_000)
    return () => clearTimeout(t)
  }, [status, startConnection])

  return { status, serviceName, liveSid, cars, raceInfo, stats, messages, carStints, driverStats, lapHistory, isLive, reconnect: startConnection }
}

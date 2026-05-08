'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { Car, RaceInfo, Stats, Message, FlagStatus, CarClass, Status, CarStint, StintEntry, DriverStat } from '@/app/types/race'
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
  cars:        Car[]
  raceInfo:    RaceInfo
  stats:       Stats
  messages:    Message[]
  carStints:   CarStint[]
  driverStats: DriverStat[]
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
  const [cars,        setCars]        = useState<Car[]>([])
  const [raceInfo,    setRaceInfo]    = useState<RaceInfo>(EMPTY_RACE_INFO)
  const [stats,       setStats]       = useState<Stats>(EMPTY_STATS)
  const [messages,    setMessages]    = useState<Message[]>([])
  const [carStints,   setCarStints]   = useState<CarStint[]>([])
  const [driverStats, setDriverStats] = useState<DriverStat[]>([])

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

  // Per-car sector timing (for TrackMap linear interpolation)
  //   sectorEnterTsRef: ts (ms) when the car last entered its current sector
  //   sectorDurationRef: rolling-average duration of each sector (s1/s2/s3)
  const sectorEnterTsRef  = useRef<Map<number, { sector: number; ts: number }>>(new Map())
  const sectorDurationRef = useRef<Map<number, [number, number, number]>>(new Map())

  const clientRef       = useRef<GriiipClient | null>(null)
  const latestRef       = useRef({ cars, raceInfo, stats, messages })
  const snapshotIdxRef  = useRef(0)

  useEffect(() => { latestRef.current = { cars, raceInfo, stats, messages } }, [cars, raceInfo, stats, messages])

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

    return participants
      .map((p): Car => {
        const rank = rankRef.current.get(p.id)
        const gap  = gapRef.current.get(p.id)
        const laps = lapRef.current.get(p.id)
        const pits = pitCountRef.current.get(p.id) ?? 0

        const status: Status = rank?.isDeleted ? 'OUT'
          : (laps?.inPit ? 'PIT' : 'RUN')

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
          pos:          rank?.overallPosition ?? 999,
          clsPos:       rank?.position        ?? 999,
          carClass:     mapClass(p.classId),
          carNum:       parseInt(p.carNumber) || 0,
          team:         p.teamName,
          drivers:      p.drivers.map(d => d.threeLettersName).join(' / '),
          tire:         'S',
          laps:         rank?.lapNumber ?? 0,
          lastLap:      formatMs(laps?.lastLapMs),
          bestLap:      formatMs(laps?.bestLapMs),
          gap:          gap ? formatGap(gap.gapToFirstMillis, gap.gapToFirstLaps) : 'Leader',
          interval:     gap ? formatGap(gap.gapToAheadMillis, gap.gapToAheadLaps) : '--',
          pitstops:     pits,
          status,
          isFastestLap: !!(laps?.bestLapMs && laps.bestLapMs === overallBest),
          lastColor:    laps?.lastColor ?? undefined,
          bestColor:    laps?.bestColor ?? undefined,
          sectorNum:    rank?.sectorNumber,
          sectorEnterTs,
          sectorDurationMs,
        } as Car
      })
      .filter(c => c.pos !== 999)
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
        carNum:   parseInt(p.carNumber) || 0,
        carClass: mapClass(p.classId),
        team:     p.teamName,
        stints:   stintRef.current.get(p.id) ?? [{ startLap: 1, endLap: null, tire: 'S' }],
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
        const bestLap  = formatMs(lapState?.bestLapMs)
        const isSessionBest = !!(lapState?.bestLapMs && lapState.bestLapMs === globalBestMs)
        const totalMs  = rankItem?.elapsedTimeMillis ?? 0
        const primaryDriver = p.drivers[0]
        return {
          carNum:        parseInt(p.carNumber) || 0,
          carClass:      mapClass(p.classId),
          team:          p.teamName,
          driver:        primaryDriver?.displayName || primaryDriver?.threeLettersName || p.threeLettersName,
          bestLap,
          s1:            '--',
          s2:            '--',
          s3:            '--',
          totalTime:     formatDuration(totalMs),
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
      const pid = participantList.find(p => p.carNumber === String(car.carNum))?.id ?? 0
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

  const flush = useCallback(() => {
    const newCars        = buildCars()
    const newRaceInfo    = buildRaceInfo()
    const newStats       = buildStats()
    const newCarStints   = buildCarStints()
    const newDriverStats = buildDriverStats()
    if (newCars.length > 0) setCars(newCars)
    setRaceInfo(newRaceInfo)
    setStats(newStats)
    if (newCarStints.length > 0)   setCarStints(newCarStints)
    if (newDriverStats.length > 0) setDriverStats(newDriverStats)
    setStatus('live')
  }, [buildCars, buildRaceInfo, buildStats, buildCarStints, buildDriverStats])

  // ── Snapshot auto-save ────────────────────────────────────────

  useEffect(() => {
    if (status !== 'live') return
    const roundStatus  = getRoundStatus(CURRENT_SEASON)
    const activeRound  = roundStatus.current ?? roundStatus.next
    if (!activeRound) return

    const saveSnapshot = async () => {
      const { cars: c, raceInfo: r, stats: s, messages: m } = latestRef.current
      if (!c.length) return
      const payload: SnapshotPayload = {
        year:        new Date(activeRound.raceStart).getFullYear(),
        round:       activeRound.round,
        name:        activeRound.name,
        circuit:     activeRound.circuit,
        countryFlag: activeRound.countryFlag,
        duration:    activeRound.duration,
        snapshot: {
          idx:      snapshotIdxRef.current++,
          ts:       Date.now(),
          cars:     c,
          raceInfo: r,
          stats:    s,
          messages: m.slice(-30),
        },
      }
      try {
        await fetch('/api/races/snapshot', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } catch (err) { console.warn('[snapshot] save failed:', err) }
    }

    saveSnapshot()
    const timer = setInterval(saveSnapshot, SNAPSHOT_INTERVAL_MS)
    return () => { clearInterval(timer); snapshotIdxRef.current = 0 }
  }, [status])

  // ── Connect ───────────────────────────────────────────────────

  const startConnection = useCallback(() => {
    clientRef.current?.disconnect()
    clientRef.current = null

    // Reset refs
    participantsRef.current = new Map()
    rankRef.current         = new Map()
    gapRef.current          = new Map()
    lapRef.current          = new Map()
    pitCountRef.current     = new Map()
    stintRef.current        = new Map()
    sectorEnterTsRef.current  = new Map()
    sectorDurationRef.current = new Map()
    clockRef.current        = null
    scheduleRef.current     = null
    flagRef.current         = 'GREEN'
    scCountRef.current      = 0
    scLapRef.current        = 0

    setStatus('connecting')
    setServiceName(null)
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
          setCars(latest.cars)
          setRaceInfo(latest.raceInfo)
          setStats(latest.stats)
          setMessages(latest.messages)
        })
        .catch(() => { /* no saved data, start fresh */ })
    }

    const client = new GriiipClient({
      onConnected:    () => setStatus(prev => prev === 'live' ? 'live' : 'discovering'),
      onDisconnected: () => setStatus('disconnected'),

      onServiceFound: (sid, name) => {
        setServiceName(name)
        sessionNameRef.current = name
        setStatus('connected')
      },

      onNoService: () => {
        // 일단 dummy 로 채우고, 직전 완료 라운드 데이터가 있으면 비동기로 교체
        setStatus('no_service')
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
          stintRef.current.set(p.id, [{ startLap: 1, endLap: null, tire: 'S' }])
        }
      },

      onRanks: (items) => {
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
            // Update rolling-average duration for the sector just exited
            if (prevEnter && prevEnter.sector >= 1 && prevEnter.sector <= 3) {
              const elapsed = now - prevEnter.ts
              if (elapsed > 3_000 && elapsed < 600_000) {
                const durs = sectorDurationRef.current.get(item.pid) ?? [0, 0, 0] as [number, number, number]
                const idx  = prevEnter.sector - 1
                durs[idx]  = durs[idx] === 0 ? elapsed : Math.round(durs[idx] * 0.7 + elapsed * 0.3)
                sectorDurationRef.current.set(item.pid, durs)
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
        setMessages(prev => {
          const msg: Message = {
            id:        Date.now(),
            timestamp: new Date(item.ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            type:      'general',
            carNum:    item.carNumber ? parseInt(item.carNumber) : undefined,
            carClass:  item.classId  ? mapClass(item.classId)   : undefined,
            text,
          }
          return [...prev.slice(-49), msg]
        })
      },

      onPitIn: (item) => {
        const ls = lapRef.current.get(item.pid)
        if (ls) lapRef.current.set(item.pid, { ...ls, inPit: true })
        pitCountRef.current.set(item.pid, (pitCountRef.current.get(item.pid) ?? 0) + 1)
        const stints = stintRef.current.get(item.pid) ?? []
        if (stints.length > 0 && stints[stints.length - 1].endLap === null) {
          stints[stints.length - 1].endLap = item.lapNumber
        }
        stintRef.current.set(item.pid, stints)
        flush()

        const participant = participantsRef.current.get(item.pid)
        if (participant) {
          setMessages(prev => {
            const msg: Message = {
              id:        Date.now(),
              timestamp: new Date(item.ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              type:      'pit',
              carNum:    parseInt(item.carNumber),
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
        const stints = stintRef.current.get(item.pid) ?? []
        stints.push({ startLap: item.lapNumber + 1, endLap: null, tire: 'S' })
        stintRef.current.set(item.pid, stints)
        flush()

        const participant = participantsRef.current.get(item.pid)
        if (participant) {
          setMessages(prev => {
            const msg: Message = {
              id:        Date.now() + 1,
              timestamp: new Date(item.ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              type:      'pit',
              carNum:    parseInt(item.carNumber),
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

  return { status, serviceName, cars, raceInfo, stats, messages, carStints, driverStats, isLive, reconnect: startConnection }
}

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { Car, RaceInfo, Stats, Message, FlagStatus, CarClass, Status } from '@/app/types/race'
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

import {
  raceInfo  as dummyRaceInfo,
  stats     as dummyStats,
  cars      as dummyCars,
  messages  as dummyMessages,
} from '@/app/data/dummyData'

// ── Connection status ─────────────────────────────────────────────

export type ConnStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'discovering'
  | 'live'
  | 'no_service'
  | 'disconnected'
  | 'error'

export interface UseTiming71Result {
  status:      ConnStatus
  serviceName: string | null
  cars:        Car[]
  raceInfo:    RaceInfo
  stats:       Stats
  messages:    Message[]
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

export function useTiming71(): UseTiming71Result {
  const [status,      setStatus]      = useState<ConnStatus>('idle')
  const [serviceName, setServiceName] = useState<string | null>(null)
  const [cars,        setCars]        = useState<Car[]>(dummyCars)
  const [raceInfo,    setRaceInfo]    = useState<RaceInfo>(dummyRaceInfo)
  const [stats,       setStats]       = useState<Stats>(dummyStats)
  const [messages,    setMessages]    = useState<Message[]>(dummyMessages)

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
    const newCars     = buildCars()
    const newRaceInfo = buildRaceInfo()
    const newStats    = buildStats()
    if (newCars.length > 0) setCars(newCars)
    setRaceInfo(newRaceInfo)
    setStats(newStats)
    setStatus('live')
  }, [buildCars, buildRaceInfo, buildStats])

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

    // Reset state
    participantsRef.current = new Map()
    rankRef.current         = new Map()
    gapRef.current          = new Map()
    lapRef.current          = new Map()
    pitCountRef.current     = new Map()
    clockRef.current        = null
    scheduleRef.current     = null
    flagRef.current         = 'GREEN'
    scCountRef.current      = 0
    scLapRef.current        = 0

    setStatus('connecting')
    setServiceName(null)

    const client = new GriiipClient({
      onConnected:    () => setStatus(prev => prev === 'live' ? 'live' : 'discovering'),
      onDisconnected: () => setStatus('disconnected'),

      onServiceFound: (sid, name) => {
        setServiceName(name)
        sessionNameRef.current = name
        setStatus('connected')
      },

      onNoService: () => setStatus('no_service'),

      onSchedule: (schedule) => {
        scheduleRef.current = schedule
        flagRef.current     = mapFlag(schedule.currentFlag)
      },

      onParticipants: (participants) => {
        participantsRef.current = new Map(participants.map(p => [p.id, p]))
      },

      onRanks: (items) => {
        for (const item of items) rankRef.current.set(item.pid, item)
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

  return { status, serviceName, cars, raceInfo, stats, messages, isLive, reconnect: startConnection }
}

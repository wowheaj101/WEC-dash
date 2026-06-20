'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { Car, RaceInfo, Stats, Message, CarStint, DriverStat, LapHistoryEntry } from '@/app/types/race'
import { GriiipClient }      from '@/app/lib/griiipClient'
import { RaceEngine, isCarsRestoreValid } from '@wec/core'
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

// ── Hook ──────────────────────────────────────────────────────────

const SNAPSHOT_INTERVAL_MS = 120_000
/** Coalesce live-event bursts into one snapshot()/setState pass. Griiip sends
 *  one rank message per car (~1 Hz burst); batching avoids N re-renders/sec. */
const FLUSH_INTERVAL_MS = 250

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

  // ── Normalization engine (all timing state + build* logic lives here) ──
  const engineRef = useRef<RaceEngine | null>(null)
  if (!engineRef.current) {
    engineRef.current = new RaceEngine({
      sessionName:     dummyRaceInfo.name,   // fallback until onServiceFound
      weatherFallback: dummyRaceInfo.weather,
    })
  }

  const clientRef       = useRef<GriiipClient | null>(null)
  const latestRef       = useRef({ cars, raceInfo, stats, messages, carStints, driverStats, lapHistory })
  const snapshotIdxRef  = useRef(0)
  // Coalescing timer for batched flushes.
  const flushTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Cached REST /results — re-mapped to Car[] whenever participants arrive
  // (REST results carry pid only, so they need participant metadata).
  const restResultsRef  = useRef<Awaited<ReturnType<typeof fetchSessionResults>> | null>(null)

  useEffect(() => {
    latestRef.current = { cars, raceInfo, stats, messages, carStints, driverStats, lapHistory }
  }, [cars, raceInfo, stats, messages, carStints, driverStats, lapHistory])

  const isLive = status === 'live'

  // ── Flush engine snapshot → React state (coalesced) ────────────

  const flush = useCallback(() => {
    const engine = engineRef.current!
    const snap = engine.snapshot()
    // Messages can surface before live standings (engine is seeded with the
    // restored feed, then live race-control/pit events append).
    if (snap.messages.length > 0) setMessages(snap.messages)
    // Until real live data arrives, don't overwrite restored standings.
    if (!engine.receivedLiveData) return
    if (snap.cars.length > 0) setCars(snap.cars)
    setRaceInfo(snap.raceInfo)
    setStats(snap.stats)
    if (snap.carStints.length > 0)   setCarStints(snap.carStints)
    if (snap.driverStats.length > 0) setDriverStats(snap.driverStats)
    if (Object.keys(snap.lapHistory).length > 0) setLapHistory(snap.lapHistory)
    setStatus('live')
  }, [])

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) return
    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null
      flush()
    }, FLUSH_INTERVAL_MS)
  }, [flush])

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
    if (flushTimerRef.current) { clearTimeout(flushTimerRef.current); flushTimerRef.current = null }

    const engine = engineRef.current!
    engine.reset()
    engine.setRound(getRoundStatus(CURRENT_SEASON).current?.round ?? dummyRaceInfo.round)
    restResultsRef.current = null

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
    // Runs async but doesn't block SignalR connection below. Populates UI with
    // last known state while waiting for live data, seeds the engine's restored
    // cars + message feed, and continues snapshotIdxRef from the correct index.
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
          engine.setRestoredCars(latest.cars)
          engine.setMessages(latest.messages)
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
        engine.setSessionName(name)
        setStatus('connected')

        // Phase A: fetch REST /results in parallel for an immediate, accurate
        // snapshot of the current standings. Mapping to Car[] needs participants,
        // which may not have arrived yet — cache results and re-attempt in
        // onParticipants.
        fetchSessionResults(sid)
          .then(results => {
            restResultsRef.current = results
            const ps = engine.getParticipants()
            if (ps.length > 0 && results.results?.length > 0) {
              const restCars = buildCarsFromResults(results.results, ps)
              if (restCars.length > 0 && isCarsRestoreValid(restCars)) {
                engine.setRestoredCars(restCars)
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

      onSchedule:     (schedule)     => { engine.applySchedule(schedule) },

      onParticipants: (participants) => {
        engine.applyParticipants(participants)
        // If REST /results arrived first, map it now that we have participant
        // metadata (pid → carNumber/team/etc).
        const cached = restResultsRef.current
        if (cached?.results?.length) {
          const restCars = buildCarsFromResults(cached.results, participants)
          if (restCars.length > 0 && isCarsRestoreValid(restCars)) {
            engine.setRestoredCars(restCars)
          }
        }
      },

      onRanks:   (items) => { engine.applyRanks(items); scheduleFlush() },
      onGaps:    (items) => { engine.applyGaps(items);  scheduleFlush() },
      onLap:     (item)  => { engine.applyLap(item);    scheduleFlush() },
      onClock:   (item)  => { engine.applyClock(item);  scheduleFlush() },
      onFlag:    (item)  => { engine.applyFlag(item);   scheduleFlush() },
      onRaceLog: (item)  => { engine.applyRaceLog(item); scheduleFlush() },
      onPitIn:   (item)  => { engine.applyPitIn(item);  scheduleFlush() },
      onPitOut:  (item)  => { engine.applyPitOut(item); scheduleFlush() },
    })

    clientRef.current = client
    client.connect().catch(() => setStatus('error'))
  }, [flush, scheduleFlush])

  useEffect(() => {
    startConnection()
    return () => {
      clientRef.current?.disconnect()
      if (flushTimerRef.current) { clearTimeout(flushTimerRef.current); flushTimerRef.current = null }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-reconnect after 30s on disconnect
  useEffect(() => {
    if (status !== 'disconnected') return
    const t = setTimeout(() => startConnection(), 30_000)
    return () => clearTimeout(t)
  }, [status, startConnection])

  // 1Hz tick to refresh raceInfo.elapsed/remaining even when SignalR clock
  // events stop arriving (e.g. session-clock channel join failed).
  // RaceEngine.buildRaceInfo() falls back to startTime-based computation.
  useEffect(() => {
    if (status !== 'live' && status !== 'showing_previous') return
    const tick = setInterval(() => {
      setRaceInfo(engineRef.current!.buildRaceInfo())
    }, 1000)
    return () => clearInterval(tick)
  }, [status])

  return { status, serviceName, liveSid, cars, raceInfo, stats, messages, carStints, driverStats, lapHistory, isLive, reconnect: startConnection }
}

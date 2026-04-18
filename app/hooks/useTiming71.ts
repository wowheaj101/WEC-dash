'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { Car, RaceInfo, Stats, Message } from '@/app/types/race'
import type { T71Manifest }  from '@/app/lib/parseManifest'
import type { T71RawState }  from '@/app/lib/normalizeState'
import { buildColMap }       from '@/app/lib/parseManifest'
import {
  normalizeCars,
  normalizeSession,
  computeStats,
  mergeState,
} from '@/app/lib/normalizeState'
import { Timing71Client }    from '@/app/lib/timing71'
import { CURRENT_SEASON }    from '@/app/data/calendar'
import { getRoundStatus }    from '@/app/lib/getRoundStatus'
import type { SnapshotPayload } from '@/app/api/races/snapshot/route'

// 더미 데이터 — 연결 전 또는 WEC 서비스 없을 때 폴백
import {
  raceInfo  as dummyRaceInfo,
  stats     as dummyStats,
  cars      as dummyCars,
  messages  as dummyMessages,
} from '@/app/data/dummyData'

// ── 상태 타입 ──────────────────────────────────────────────────────

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

const SNAPSHOT_INTERVAL_MS = 120_000  // 2분마다 스냅샷 저장

// ── Hook ──────────────────────────────────────────────────────────

export function useTiming71(): UseTiming71Result {
  const [status,      setStatus]      = useState<ConnStatus>('idle')
  const [serviceName, setServiceName] = useState<string | null>(null)
  const [cars,        setCars]        = useState<Car[]>(dummyCars)
  const [raceInfo,    setRaceInfo]    = useState<RaceInfo>(dummyRaceInfo)
  const [stats,       setStats]       = useState<Stats>(dummyStats)
  const [messages,    setMessages]    = useState<Message[]>(dummyMessages)

  const clientRef   = useRef<Timing71Client | null>(null)
  const manifestRef = useRef<T71Manifest | null>(null)
  const rawStateRef = useRef<T71RawState | null>(null)

  // 최신 상태를 interval 콜백에서 접근하기 위한 ref
  const latestRef = useRef({ cars, raceInfo, stats, messages })
  useEffect(() => {
    latestRef.current = { cars, raceInfo, stats, messages }
  }, [cars, raceInfo, stats, messages])

  const snapshotIdxRef  = useRef(0)

  const isLive = status === 'live'

  // ── 스냅샷 자동 저장 (라이브 중) ──────────────────────────────────

  useEffect(() => {
    if (status !== 'live') return

    const roundStatus  = getRoundStatus(CURRENT_SEASON)
    const activeRound  = roundStatus.current ?? roundStatus.next
    if (!activeRound) return

    const saveSnapshot = async () => {
      const { cars: c, raceInfo: r, stats: s, messages: m } = latestRef.current
      if (!c.length) return

      const payload: SnapshotPayload = {
        year:        activeRound.round === 1 ? new Date(activeRound.raceStart).getFullYear()
                       : new Date(activeRound.raceStart).getFullYear(),
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
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        })
      } catch (err) {
        console.warn('[snapshot] save failed:', err)
      }
    }

    saveSnapshot()  // 라이브 전환 즉시 첫 스냅샷
    const timer = setInterval(saveSnapshot, SNAPSHOT_INTERVAL_MS)
    return () => {
      clearInterval(timer)
      snapshotIdxRef.current = 0
    }
  }, [status])

  // ── Timing71 연결 ─────────────────────────────────────────────────

  const startConnection = useCallback(() => {
    clientRef.current?.disconnect()
    clientRef.current  = null
    manifestRef.current  = null
    rawStateRef.current  = null

    setStatus('connecting')
    setServiceName(null)

    const client = new Timing71Client({
      onConnected:    () => setStatus('discovering'),
      onDisconnected: (reason) => setStatus(reason === 'closed' ? 'idle' : 'disconnected'),
      onServiceFound: (_, name) => { setServiceName(name); setStatus('connected') },
      onNoService:    () => setStatus('no_service'),
      onManifest:     (manifest) => { manifestRef.current = manifest },

      onState: (update, isInitial) => {
        const manifest = manifestRef.current
        if (!manifest) return

        const colMap = buildColMap(manifest.colSpec)
        const prev   = rawStateRef.current
        const merged = prev && !isInitial
          ? mergeState(prev, update)
          : (update as T71RawState)
        rawStateRef.current = merged

        if (!merged.cars?.length) return

        try {
          const normalizedCars    = normalizeCars(merged.cars, colMap)
          const normalizedSession = normalizeSession(merged.session ?? {}, manifest)
          const computedStats     = computeStats(normalizedCars, merged.session ?? {})

          setCars(normalizedCars)
          setRaceInfo(normalizedSession as RaceInfo)
          setStats(computedStats)
          setStatus('live')

          if (merged.messages?.length) {
            const normalized = merged.messages.slice(-50).map((raw, i) => ({
              id:        Date.now() + i,
              timestamp: Array.isArray(raw) ? String(raw[0] ?? '') : '',
              type:      'general' as const,
              text:      Array.isArray(raw) ? String(raw[2] ?? '') : String(raw),
            }))
            setMessages(normalized)
          }
        } catch (err) {
          console.error('[useTiming71] normalize error:', err)
        }
      },
    })

    clientRef.current = client
    client.connect().catch(() => setStatus('error'))
  }, [])

  useEffect(() => {
    startConnection()
    return () => { clientRef.current?.disconnect() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (status !== 'disconnected') return
    const t = setTimeout(() => startConnection(), 30_000)
    return () => clearTimeout(t)
  }, [status, startConnection])

  return { status, serviceName, cars, raceInfo, stats, messages, isLive, reconnect: startConnection }
}

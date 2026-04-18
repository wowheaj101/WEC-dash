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

// 더미 데이터 — 연결 전 또는 WEC 서비스 없을 때 폴백
import {
  raceInfo  as dummyRaceInfo,
  stats     as dummyStats,
  cars      as dummyCars,
  messages  as dummyMessages,
} from '@/app/data/dummyData'

// ── 상태 타입 ──────────────────────────────────────────────────────

export type ConnStatus =
  | 'idle'          // 초기값
  | 'connecting'    // 릴레이 연결 중
  | 'connected'     // WAMP 세션 열림
  | 'discovering'   // WEC 서비스 탐색 중
  | 'live'          // 데이터 수신 중
  | 'no_service'    // WEC 오프시즌 등 서비스 없음
  | 'disconnected'  // 연결 끊김 (재연결 대기)
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

  const isLive = status === 'live'

  const startConnection = useCallback(() => {
    // 이전 클라이언트 정리
    clientRef.current?.disconnect()
    clientRef.current = null
    manifestRef.current  = null
    rawStateRef.current  = null

    setStatus('connecting')
    setServiceName(null)

    const client = new Timing71Client({
      onConnected: () => {
        setStatus('discovering')
      },

      onDisconnected: (reason) => {
        setStatus(reason === 'closed' ? 'idle' : 'disconnected')
      },

      onServiceFound: (uuid, name) => {
        setServiceName(name)
        setStatus('connected')
      },

      onNoService: () => {
        setStatus('no_service')
      },

      onManifest: (manifest) => {
        manifestRef.current = manifest
      },

      onState: (update, isInitial) => {
        const manifest = manifestRef.current
        if (!manifest) return

        const colMap = buildColMap(manifest.colSpec)

        // state 머지
        const prev    = rawStateRef.current
        const merged  = prev && !isInitial
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

          // 메시지 처리 (Timing71 raw messages → Message[])
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

  // 마운트 시 자동 연결
  useEffect(() => {
    startConnection()
    return () => {
      clientRef.current?.disconnect()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 연결 끊김 시 30초 후 자동 재연결
  useEffect(() => {
    if (status !== 'disconnected') return
    const t = setTimeout(() => startConnection(), 30_000)
    return () => clearTimeout(t)
  }, [status, startConnection])

  return {
    status,
    serviceName,
    cars,
    raceInfo,
    stats,
    messages,
    isLive,
    reconnect: startConnection,
  }
}

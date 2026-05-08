'use client'

import { useEffect, useState } from 'react'
import type { Car, Stats, DriverStat } from '@/app/types/race'
import {
  fetchSeriesEvents,
  fetchEventSessions,
  fetchSessionResults,
  fetchSessionParticipants,
  findCurrentEvent,
  buildCarsFromResults,
  buildStatsFromResults,
  buildDriverStatsFromResults,
  type EventMeta,
  type SessionMeta,
} from '@/app/lib/griiipResults'

const REFRESH_INTERVAL_MS = 30_000

// ── Discovery hook ────────────────────────────────────────────────

export interface UseCurrentEventResult {
  event:    EventMeta | null
  sessions: SessionMeta[]
  loading:  boolean
  error:    string | null
}

/**
 * Discovers the current (or most-recent past) WEC event and lists
 * its sessions. Runs once on mount.
 */
export function useCurrentEvent(): UseCurrentEventResult {
  const [event,    setEvent]    = useState<EventMeta | null>(null)
  const [sessions, setSessions] = useState<SessionMeta[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const events = await fetchSeriesEvents()
        if (cancelled) return
        const ev = findCurrentEvent(events)
        if (!ev) {
          setEvent(null); setSessions([])
          return
        }
        setEvent(ev)
        const list = await fetchEventSessions(ev.id)
        if (cancelled) return
        setSessions(list.sort((a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        ))
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  return { event, sessions, loading, error }
}

// ── Session-results hook ─────────────────────────────────────────

export interface UseSessionResultsResult {
  cars:        Car[]
  stats:       Stats | null
  driverStats: DriverStat[]
  loading:     boolean
  error:       string | null
}

/**
 * Fetches the leaderboard for a single session by sid. Pass `null`
 * to clear (e.g. when switching back to LIVE). Auto-refreshes every
 * 30s while sid is set, since /results returns current standings
 * even for in-progress sessions.
 */
export function useSessionResults(sid: number | null): UseSessionResultsResult {
  const [cars,        setCars]        = useState<Car[]>([])
  const [stats,       setStats]       = useState<Stats | null>(null)
  const [driverStats, setDriverStats] = useState<DriverStat[]>([])
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  useEffect(() => {
    if (sid == null) {
      setCars([]); setStats(null); setDriverStats([]); setLoading(false); setError(null)
      return
    }

    // Drop the previous session's rows immediately so they don't linger at the
    // top of the leaderboard while the new fetch is in flight.
    setCars([]); setStats(null); setDriverStats([]); setError(null)

    let cancelled = false

    const load = async () => {
      try {
        const [resp, participants] = await Promise.all([
          fetchSessionResults(sid),
          fetchSessionParticipants(sid),
        ])
        if (cancelled) return
        setCars(buildCarsFromResults(resp.results, participants))
        setStats(buildStatsFromResults(resp.results, participants))
        setDriverStats(buildDriverStatsFromResults(resp.results, participants))
        setError(null)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    setLoading(true)
    load()
    const t = setInterval(load, REFRESH_INTERVAL_MS)
    return () => { cancelled = true; clearInterval(t) }
  }, [sid])

  return { cars, stats, driverStats, loading, error }
}

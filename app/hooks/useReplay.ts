'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { RaceData, RaceMeta, RaceSnapshot } from '@/app/types/replay'

export interface UseReplayResult {
  // 레이스 목록
  raceList:     RaceMeta[]
  listLoading:  boolean

  // 선택된 레이스
  selectedMeta: RaceMeta | null
  snapshots:    RaceSnapshot[]
  dataLoading:  boolean

  // 재생 상태
  currentIdx:   number
  isPlaying:    boolean
  current:      RaceSnapshot | null

  // 액션
  selectRace:   (meta: RaceMeta) => void
  clearRace:    () => void
  seek:         (idx: number) => void
  play:         () => void
  pause:        () => void
}

export function useReplay(): UseReplayResult {
  const [raceList,     setRaceList]     = useState<RaceMeta[]>([])
  const [listLoading,  setListLoading]  = useState(true)
  const [selectedMeta, setSelectedMeta] = useState<RaceMeta | null>(null)
  const [snapshots,    setSnapshots]    = useState<RaceSnapshot[]>([])
  const [dataLoading,  setDataLoading]  = useState(false)
  const [currentIdx,   setCurrentIdx]   = useState(0)
  const [isPlaying,    setIsPlaying]    = useState(false)

  const playTimer  = useRef<ReturnType<typeof setInterval> | null>(null)
  const cache      = useRef<Map<string, RaceSnapshot[]>>(new Map())

  // 레이스 목록 로드
  useEffect(() => {
    setListLoading(true)
    fetch('/api/races')
      .then(r => r.json())
      .then(d => setRaceList(d.races ?? []))
      .catch(() => {})
      .finally(() => setListLoading(false))
  }, [])

  // 목록 로드 완료 후 전체 데이터 백그라운드 프리패치 (순차)
  useEffect(() => {
    if (!raceList.length) return
    let cancelled = false

    const prefetch = async () => {
      for (const meta of raceList) {
        if (cancelled || cache.current.has(meta.id)) continue
        try {
          const res  = await fetch(`/api/races/${meta.year}/${meta.round}`)
          const data = (await res.json()) as RaceData
          cache.current.set(meta.id, data.snapshots ?? [])
        } catch {}
      }
    }

    prefetch()
    return () => { cancelled = true }
  }, [raceList])

  // 특정 레이스 선택 — 캐시 히트 시 즉시 표시
  const selectRace = useCallback(async (meta: RaceMeta) => {
    setSelectedMeta(meta)
    setCurrentIdx(0)
    setIsPlaying(false)

    const cached = cache.current.get(meta.id)
    if (cached) {
      setSnapshots(cached)
      setDataLoading(false)
      return
    }

    setSnapshots([])
    setDataLoading(true)
    try {
      const res  = await fetch(`/api/races/${meta.year}/${meta.round}`)
      const data = (await res.json()) as RaceData
      const snaps = data.snapshots ?? []
      cache.current.set(meta.id, snaps)
      setSnapshots(snaps)
    } catch {
      setSnapshots([])
    } finally {
      setDataLoading(false)
    }
  }, [])

  const clearRace = useCallback(() => {
    setSelectedMeta(null)
    setSnapshots([])
    setCurrentIdx(0)
    setIsPlaying(false)
  }, [])

  const seek  = useCallback((idx: number) => setCurrentIdx(idx), [])

  const pause = useCallback(() => {
    setIsPlaying(false)
    if (playTimer.current) clearInterval(playTimer.current)
  }, [])

  const play = useCallback(() => {
    setIsPlaying(true)
  }, [])

  // 자동 재생: 3초마다 다음 스냅샷으로
  useEffect(() => {
    if (playTimer.current) clearInterval(playTimer.current)
    if (!isPlaying || !snapshots.length) return

    playTimer.current = setInterval(() => {
      setCurrentIdx(prev => {
        const next = prev + 1
        if (next >= snapshots.length) {
          setIsPlaying(false)
          return prev
        }
        return next
      })
    }, 3_000)

    return () => { if (playTimer.current) clearInterval(playTimer.current) }
  }, [isPlaying, snapshots.length])

  const current = snapshots[currentIdx] ?? null

  return {
    raceList, listLoading,
    selectedMeta, snapshots, dataLoading,
    currentIdx, isPlaying, current,
    selectRace, clearRace, seek, play, pause,
  }
}

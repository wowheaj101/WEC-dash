'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Car, CarClass } from '@/app/types/race'
import type { ConnStatus } from '@/app/hooks/useTiming71'
import LeaderboardRow from './LeaderboardRow'

const CLASS_ORDER: CarClass[] = ['HYPERCAR', 'LMP2', 'LMGT3']
const CLASS_LABELS: Record<CarClass, string> = {
  HYPERCAR: 'HYPERCAR',
  LMP2: 'LMP2',
  LMGT3: 'LM GT3',
}

// How long delta badges + flash effects stay visible after a position change
const DELTA_DISPLAY_MS = 5000

// Skeleton row count per class while waiting for first data
const SKELETON_ROWS_PER_CLASS = 4

const STATUS_TEXT: Record<ConnStatus, string> = {
  idle:             '초기화 중...',
  connecting:       'WEC 서버 검색 중...',
  discovering:      'SignalR 핸드셰이크 중...',
  connected:        '채널 가입 중...',
  live:             '데이터 수신 대기 중...',
  no_service:       '진행 중인 라이브 세션 없음',
  showing_previous: '이전 라운드 스냅샷 로딩...',
  disconnected:     '재연결 중...',
  error:            '연결 오류 — 재시도 중',
}

function LeaderboardSkeleton({ status }: { status: ConnStatus }) {
  const statusText = STATUS_TEXT[status] ?? '대기 중...'

  return (
    <div className="flex flex-col gap-3 px-2 pb-3">
      {(['HYPERCAR', 'LMP2', 'LMGT3'] as const).map(cls => (
        <div key={cls}>
          <div className="text-[10px] font-bold tracking-[2px] uppercase text-fg4 px-2 py-1.5 mb-1">
            {cls === 'LMGT3' ? 'LM GT3' : cls}
          </div>
          {Array.from({ length: SKELETON_ROWS_PER_CLASS }).map((_, i) => (
            <div
              key={i}
              className="h-[44px] mb-[3px] rounded-sm animate-pulse"
              style={{
                background: 'hsl(var(--bg-2))',
                border: '1px solid hsl(var(--line-1))',
                opacity: 0.6 - i * 0.1,
              }}
            />
          ))}
        </div>
      ))}
      <div className="text-center text-[10px] text-fg3 mono pt-1 flex items-center justify-center gap-2">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-warning dot-blink" />
        {statusText}
      </div>
    </div>
  )
}

interface PositionMemory {
  clsPos: number
  carClass: CarClass
}

interface LeaderboardProps {
  cars:    Car[]
  status?: ConnStatus
}

export default function Leaderboard({ cars, status = 'idle' }: LeaderboardProps) {
  const leaderLap = cars.length > 0 ? cars[0].laps : 0

  // Group cars by class, sorted by class position
  const carsByClass: Record<CarClass, Car[]> = {
    HYPERCAR: [],
    LMP2: [],
    LMGT3: [],
  }
  cars.forEach(car => carsByClass[car.carClass].push(car))
  Object.keys(carsByClass).forEach(key => {
    carsByClass[key as CarClass].sort((a, b) => a.clsPos - b.clsPos)
  })

  // ── Position change detection (delta + flash) ────────────────────
  // Compute delta from previous render's clsPos. delta>0 = position improved,
  // delta<0 = lost positions. Stays non-zero for DELTA_DISPLAY_MS.
  const prevPosRef = useRef<Map<string, PositionMemory>>(new Map())
  const deltaTimestampRef = useRef<Map<string, { delta: number; ts: number }>>(new Map())

  // Active delta map updated each render
  const now = Date.now()
  const activeDeltas = new Map<string, number>()

  cars.forEach(car => {
    const prev = prevPosRef.current.get(car.carNumStr)
    if (prev && prev.carClass === car.carClass && prev.clsPos !== car.clsPos) {
      // Position changed — record new delta. Lower number = better position,
      // so old - new > 0 means improvement.
      const delta = prev.clsPos - car.clsPos
      deltaTimestampRef.current.set(car.carNumStr, { delta, ts: now })
    }

    // Update memory for next render
    prevPosRef.current.set(car.carNumStr, { clsPos: car.clsPos, carClass: car.carClass })
  })

  // Resolve active deltas (still within display window)
  deltaTimestampRef.current.forEach((entry, carNumStr) => {
    if (now - entry.ts < DELTA_DISPLAY_MS) {
      activeDeltas.set(carNumStr, entry.delta)
    } else {
      deltaTimestampRef.current.delete(carNumStr)
    }
  })

  // Force a re-render after the delta window expires so badges/flashes clear
  const [, setTick] = useState(0)
  useEffect(() => {
    if (deltaTimestampRef.current.size === 0) return
    const timer = setTimeout(() => setTick(t => t + 1), DELTA_DISPLAY_MS + 100)
    return () => clearTimeout(timer)
  })

  // ── FLIP animation for smooth reorder ─────────────────────────────
  const rowsContainerRef = useRef<HTMLDivElement>(null)
  const lastRectsRef = useRef<Map<string, DOMRect>>(new Map())

  useLayoutEffect(() => {
    if (!rowsContainerRef.current) return

    const rows = rowsContainerRef.current.querySelectorAll<HTMLElement>('[data-car-num]')
    const newRects = new Map<string, DOMRect>()

    rows.forEach(el => {
      const key = el.dataset.carNum
      if (!key) return
      newRects.set(key, el.getBoundingClientRect())
    })

    // Apply FLIP: invert (move to old position) → play (transition to 0)
    rows.forEach(el => {
      const key = el.dataset.carNum
      if (!key) return
      const oldRect = lastRectsRef.current.get(key)
      const newRect = newRects.get(key)
      if (!oldRect || !newRect) return

      const dy = oldRect.top - newRect.top
      if (Math.abs(dy) < 1) return

      // Cancel any in-flight animation by jumping to start position with no transition
      el.style.transition = 'none'
      el.style.transform = `translateY(${dy}px)`

      requestAnimationFrame(() => {
        el.style.transition = 'transform 400ms cubic-bezier(0.22, 1, 0.36, 1)'
        el.style.transform = ''
      })
    })

    lastRectsRef.current = newRects
  }, [cars])

  return (
    <div className="panel flex flex-col min-h-0 overflow-hidden">
      <div className="panel-header">
        <span>
          CLASSIFICATION
          <span className="text-fg3 font-normal tracking-[1px] ml-1.5">· LAP {leaderLap}</span>
        </span>
      </div>

      <div className="overflow-x-auto flex-1 min-h-0">
        <div ref={rowsContainerRef} className="flex flex-col p-2 min-w-[820px]">
          {CLASS_ORDER.map(carClass => {
            const classJobs = carsByClass[carClass]
            if (classJobs.length === 0) return null

            return (
              <div key={carClass} className="mb-3">
                {/* Class section header */}
                <div className="text-[10px] font-bold tracking-[2px] uppercase text-fg3 px-2 py-1.5 mb-1">
                  {CLASS_LABELS[carClass]}
                </div>

                {/* Class rows */}
                {classJobs.map(car => (
                  <LeaderboardRow
                    key={car.carNumStr}
                    car={car}
                    deltaPos={activeDeltas.get(car.carNumStr) ?? 0}
                  />
                ))}
              </div>
            )
          })}

          {cars.length === 0 && <LeaderboardSkeleton status={status} />}
        </div>
      </div>
    </div>
  )
}

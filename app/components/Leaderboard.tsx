'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Car, CarClass } from '@/app/types/race'
import LeaderboardRow from './LeaderboardRow'

const CLASS_ORDER: CarClass[] = ['HYPERCAR', 'LMP2', 'LMGT3']
const CLASS_LABELS: Record<CarClass, string> = {
  HYPERCAR: 'HYPERCAR',
  LMP2: 'LMP2',
  LMGT3: 'LM GT3',
}

// How long delta badges + flash effects stay visible after a position change
const DELTA_DISPLAY_MS = 5000

interface PositionMemory {
  clsPos: number
  carClass: CarClass
}

export default function Leaderboard({ cars }: { cars: Car[] }) {
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

          {cars.length === 0 && (
            <div className="py-10 text-center text-[11px] text-fg3">
              데이터 대기 중...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

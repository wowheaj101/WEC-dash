'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/app/lib/utils'
import type { CarClass, LapHistoryEntry } from '@/app/types/race'

interface CarMeta {
  carNumStr: string
  carClass:  CarClass
  team:      string
}

interface Props {
  /** Per-car lap history. Keyed by carNumStr. */
  lapHistory: Record<string, LapHistoryEntry[]>
  /** Car metadata (class, team) for color + label. */
  cars:       CarMeta[]
}

const CLASS_COLOR: Record<CarClass, string> = {
  HYPERCAR: 'hsl(var(--hypercar))',
  LMP2:     'hsl(var(--lmp2))',
  LMGT3:    'hsl(var(--lmgt3))',
}

const CLASS_ORDER: CarClass[] = ['HYPERCAR', 'LMP2', 'LMGT3']

const W = 920
const H = 320
const PAD_L = 56
const PAD_R = 16
const PAD_T = 16
const PAD_B = 32

function fmtMs(ms: number): string {
  const m   = Math.floor(ms / 60000)
  const s   = Math.floor((ms % 60000) / 1000)
  const rem = ms % 1000
  return `${m}:${String(s).padStart(2, '0')}.${String(rem).padStart(3, '0')}`
}

export default function LapTimeChart({ lapHistory, cars }: Props) {
  const carMap = useMemo(() => new Map(cars.map(c => [c.carNumStr, c])), [cars])

  // class filter (default: all 3 on)
  const [classFilter, setClassFilter] = useState<Record<CarClass, boolean>>({
    HYPERCAR: true, LMP2: true, LMGT3: true,
  })
  // selected car (single hover/click for emphasis)
  const [activeCar, setActiveCar] = useState<string | null>(null)
  // outlier filter — drop laps slower than 1.5x class median (pit/SC laps muddy the view)
  const [hideOutliers, setHideOutliers] = useState(true)

  const carsWithData = useMemo(
    () => Object.keys(lapHistory).filter(carNum => {
      const meta = carMap.get(carNum)
      return meta && classFilter[meta.carClass] && (lapHistory[carNum]?.length ?? 0) > 0
    }),
    [lapHistory, carMap, classFilter],
  )

  const { points, xMin, xMax, yMin, yMax } = useMemo(() => {
    type Pt = { car: string; cls: CarClass; lap: number; ms: number; valid: boolean }
    const all: Pt[] = []
    for (const carNum of carsWithData) {
      const meta = carMap.get(carNum)!
      for (const e of lapHistory[carNum] ?? []) all.push({ car: carNum, cls: meta.carClass, lap: e.lap, ms: e.ms, valid: e.valid })
    }

    let filtered = all
    if (hideOutliers && all.length > 5) {
      // Per-class median for robust outlier rejection
      const byClass = new Map<CarClass, number[]>()
      for (const p of all) {
        if (!byClass.has(p.cls)) byClass.set(p.cls, [])
        byClass.get(p.cls)!.push(p.ms)
      }
      const cutoff = new Map<CarClass, number>()
      Array.from(byClass.entries()).forEach(([cls, arr]) => {
        const sorted = [...arr].sort((a, b) => a - b)
        const med = sorted[Math.floor(sorted.length / 2)]
        cutoff.set(cls, med * 1.4)
      })
      filtered = all.filter(p => p.ms <= (cutoff.get(p.cls) ?? Infinity))
    }

    if (filtered.length === 0) return { points: [], xMin: 0, xMax: 1, yMin: 0, yMax: 1 }

    const xs = filtered.map(p => p.lap)
    const ys = filtered.map(p => p.ms)
    return {
      points: filtered,
      xMin:   Math.min(...xs),
      xMax:   Math.max(...xs),
      yMin:   Math.min(...ys),
      yMax:   Math.max(...ys),
    }
  }, [lapHistory, carsWithData, carMap, hideOutliers])

  const xToPx = (lap: number) => {
    if (xMax === xMin) return PAD_L
    return PAD_L + ((lap - xMin) / (xMax - xMin)) * (W - PAD_L - PAD_R)
  }
  const yToPx = (ms: number) => {
    if (yMax === yMin) return PAD_T
    return PAD_T + ((ms - yMin) / (yMax - yMin)) * (H - PAD_T - PAD_B)
  }

  // Y-axis ticks (4)
  const yTicks = useMemo(() => {
    if (yMax === yMin) return []
    const step = (yMax - yMin) / 3
    return [0, 1, 2, 3].map(i => yMin + step * i)
  }, [yMin, yMax])

  if (points.length === 0) {
    return (
      <div className="panel">
        <div className="panel-header flex items-center justify-between">
          <span>LAP TIME EVOLUTION</span>
          <ClassToggles filter={classFilter} setFilter={setClassFilter} />
        </div>
        <div className="py-12 text-center text-[11px] text-fg3">
          랩 히스토리 데이터가 없습니다 — 라이브 또는 리플레이 세션에서만 표시됩니다.
        </div>
      </div>
    )
  }

  return (
    <div className="panel">
      <div className="panel-header flex items-center justify-between gap-2 flex-wrap">
        <span>LAP TIME EVOLUTION</span>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setHideOutliers(v => !v)}
            className={cn(
              'mono text-[10px] px-2 py-0.5 border',
              hideOutliers ? 'bg-bg3 border-line3 text-fg0' : 'bg-bg1 border-line2 text-fg3',
            )}
          >
            {hideOutliers ? 'OUTLIERS HIDDEN' : 'ALL LAPS'}
          </button>
          <ClassToggles filter={classFilter} setFilter={setClassFilter} />
        </div>
      </div>

      <div className="p-3">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet">
          {/* Grid */}
          {yTicks.map((t, i) => (
            <g key={i}>
              <line
                x1={PAD_L} x2={W - PAD_R} y1={yToPx(t)} y2={yToPx(t)}
                stroke="hsl(var(--line1))" strokeWidth={1}
              />
              <text x={PAD_L - 6} y={yToPx(t) + 3} textAnchor="end"
                style={{ fontSize: 9, fill: 'hsl(var(--fg3))', fontFamily: 'JetBrains Mono, monospace' }}>
                {fmtMs(t)}
              </text>
            </g>
          ))}
          {/* X-axis: lap markers (every Nth) */}
          {(() => {
            const range = xMax - xMin || 1
            const step  = range <= 20 ? 5 : range <= 60 ? 10 : 25
            const ticks: number[] = []
            for (let l = Math.ceil(xMin / step) * step; l <= xMax; l += step) ticks.push(l)
            return ticks.map(l => (
              <text key={l} x={xToPx(l)} y={H - PAD_B + 14} textAnchor="middle"
                style={{ fontSize: 9, fill: 'hsl(var(--fg3))', fontFamily: 'JetBrains Mono, monospace' }}>
                L{l}
              </text>
            ))
          })()}

          {/* Points */}
          {CLASS_ORDER.flatMap(cls => points
            .filter(p => p.cls === cls)
            .map((p, i) => {
              const isActive = activeCar === p.car
              const dim      = activeCar !== null && !isActive
              return (
                <circle
                  key={`${p.car}-${p.lap}-${i}`}
                  cx={xToPx(p.lap)}
                  cy={yToPx(p.ms)}
                  r={isActive ? 3 : 2}
                  fill={CLASS_COLOR[p.cls]}
                  opacity={dim ? 0.12 : (p.valid ? 0.78 : 0.32)}
                />
              )
            }),
          )}
        </svg>

        {/* Car legend (clickable for emphasis) */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {carsWithData.map(carNum => {
            const meta = carMap.get(carNum)!
            const isActive = activeCar === carNum
            return (
              <button
                key={carNum}
                onClick={() => setActiveCar(isActive ? null : carNum)}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-0.5 mono text-[10px] border',
                  isActive ? 'bg-bg3 border-line3 text-fg0' : 'bg-bg1 border-line1 text-fg2',
                )}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: CLASS_COLOR[meta.carClass] }} />
                #{carNum}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ClassToggles({
  filter, setFilter,
}: {
  filter:    Record<CarClass, boolean>
  setFilter: (next: Record<CarClass, boolean>) => void
}) {
  return (
    <div className="flex items-center gap-1">
      {CLASS_ORDER.map(cls => {
        const on = filter[cls]
        return (
          <button
            key={cls}
            onClick={() => setFilter({ ...filter, [cls]: !on })}
            className={cn('disp text-[10px] tracking-[1.5px] px-2 py-0.5 border', on ? 'text-fg0' : 'text-fg4')}
            style={{
              borderColor: on ? CLASS_COLOR[cls] : 'hsl(var(--line2))',
              background:  on ? `${CLASS_COLOR[cls].replace(')', ' / 0.12)')}` : 'transparent',
            }}
          >
            {cls === 'HYPERCAR' ? 'HC' : cls === 'LMGT3' ? 'GT3' : 'LMP2'}
          </button>
        )
      })}
    </div>
  )
}

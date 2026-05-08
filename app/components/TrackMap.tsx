'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Car } from '@/app/types/race'
import { CIRCUIT_SVG } from '@/app/data/trackPaths'
import type { CircuitSVG } from '@/app/data/trackPaths'
import { CURRENT_SEASON } from '@/app/data/calendar'
import { getRoundStatus } from '@/app/lib/getRoundStatus'
import { layoutCars } from '@/app/lib/trackGeometry'

const CLASS_COLOR: Record<string, string> = {
  HYPERCAR: 'hsl(0 100% 59%)',
  LMP2:     'hsl(214 100% 62%)',
  LMGT3:    'hsl(140 66% 49%)',
}

const SECTOR_GLOW: [string, string, string] = [
  'hsl(214 100% 62% / 0.14)',  // S1 — blue
  'hsl(140 66% 49% / 0.14)',   // S2 — green
  'hsl(0 100% 59% / 0.14)',    // S3 — red
]

interface Props {
  cars:        Car[]
  compact?:    boolean
  circuitKey?: string
  isLive?:     boolean
}

export default function TrackMap({ cars, compact, circuitKey, isLive }: Props) {
  const roundStatus = useMemo(() => getRoundStatus(CURRENT_SEASON), [])

  const resolvedKey = circuitKey
    ?? (isLive ? roundStatus.current?.circuit : roundStatus.next?.circuit)
    ?? roundStatus.current?.circuit

  const circuit: CircuitSVG | undefined = resolvedKey ? CIRCUIT_SVG[resolvedKey] : undefined
  const label = resolvedKey ?? '미정'

  if (!circuit) {
    return (
      <div className="bg-bg1 border border-line1 rounded-sm flex flex-col items-center justify-center gap-1 text-fg3 text-[11px] mono"
        style={{ padding: compact ? 8 : 12, minHeight: compact ? 170 : 320 }}>
        <span className="section-label">트랙맵</span>
        <span>레이아웃 미등록</span>
        {resolvedKey && (
          <span className="text-fg4 text-[9px]">{resolvedKey}</span>
        )}
      </div>
    )
  }

  // 16fps animation tick so dots advance between ranks updates (long-term: GPS)
  const [tick, setTick] = useState(0)
  const rafRef = useRef<number | null>(null)
  useEffect(() => {
    if (!isLive) return
    let last = 0
    const step = (t: number) => {
      if (t - last > 60) { last = t; setTick(n => (n + 1) % 1_000_000) }
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [isLive])

  const layout = useMemo(() => {
    const now = Date.now()
    const visibleCars = cars.filter(c => c.status !== 'OUT')
    return layoutCars(circuit, visibleCars.map(c => ({
      key:              c.carNum,
      classPos:         c.clsPos,
      sectorNum:        c.sectorNum,
      isPit:            c.status === 'PIT',
      sectorElapsedMs:  c.sectorEnterTs ? Math.max(0, now - c.sectorEnterTs) : undefined,
      sectorDurationMs: c.sectorDurationMs,
    })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cars, circuit, tick])

  const posByKey = useMemo(() => {
    const m = new Map<string | number, [number, number]>()
    for (const l of layout) m.set(l.key, l.pos)
    return m
  }, [layout])

  const dotRadius = compact ? 4 : 6

  return (
    <div className="bg-bg1 border border-line1 rounded-sm flex flex-col gap-2"
      style={{ padding: compact ? 8 : 12 }}>
      {!compact && (
        <div className="section-label">트랙맵 — {label}</div>
      )}

      <svg
        viewBox="0 0 480 380"
        style={{ width: '100%', height: compact ? 170 : 'auto' }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* 1. Background — sector glow halos */}
        {!compact && circuit.sectorPoints.map(([cx, cy], i) => (
          <circle key={`glow-${i}`} cx={cx} cy={cy} r={42}
            fill={SECTOR_GLOW[i]} />
        ))}

        {/* 2. Sector dividers (overlay lines, semi-transparent) */}
        {circuit.sectors.map(([x1, y1, x2, y2], i) => (
          <line key={`sec-${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="hsl(45 100% 48% / 0.55)" strokeWidth="1.5"
            strokeDasharray="2,2" />
        ))}

        {/* 3. Track — glow + surface */}
        <path d={circuit.path} stroke="hsl(222 14% 13%)"
          strokeWidth={compact ? 10 : 14}
          fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d={circuit.path} stroke="hsl(222 14% 22%)"
          strokeWidth={compact ? 7 : 10}
          fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {/* 4. Pit lane */}
        <path d={circuit.pitLane} stroke="hsl(42 100% 50%)" strokeWidth="3"
          strokeDasharray="4,3" fill="none" opacity="0.45" />

        {/* 5. DRS / overtake zones */}
        {!compact && circuit.drs?.map(([x1, y1, x2, y2], i) => (
          <line key={`drs-${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="hsl(276 100% 71%)" strokeWidth="2.5"
            strokeLinecap="round" opacity="0.35" />
        ))}

        {/* 6. Corner numbers */}
        {!compact && circuit.corners?.map((c) => (
          <g key={`corner-${c.n}`}>
            <circle cx={c.x} cy={c.y} r="7"
              fill="hsl(222 14% 6%)" stroke="hsl(220 7% 39%)" strokeWidth="0.5" />
            <text x={c.x} y={c.y + 0.5}
              fontSize="8" fill="hsl(220 8% 87%)"
              textAnchor="middle" dominantBaseline="middle"
              className="mono">
              {c.n}
            </text>
          </g>
        ))}

        {/* 7. Pit in / Pit out markers */}
        {!compact && circuit.pitIn && (
          <g>
            <circle cx={circuit.pitIn[0]} cy={circuit.pitIn[1]} r="3"
              fill="hsl(42 100% 50%)" />
            <text x={circuit.pitIn[0] + 6} y={circuit.pitIn[1] + 3}
              fontSize="7" fill="hsl(42 100% 50%)" className="mono">
              PIT IN
            </text>
          </g>
        )}
        {!compact && circuit.pitOut && (
          <g>
            <circle cx={circuit.pitOut[0]} cy={circuit.pitOut[1]} r="3"
              fill="hsl(42 100% 50%)" />
            <text x={circuit.pitOut[0] + 6} y={circuit.pitOut[1] + 3}
              fontSize="7" fill="hsl(42 100% 50%)" className="mono">
              PIT OUT
            </text>
          </g>
        )}

        {/* 8. Car dots — interpolated sector-based positions */}
        {isLive && cars
          .filter(c => c.status !== 'OUT')
          .map(car => {
            const pos = posByKey.get(car.carNum)
            if (!pos) return null
            const [x, y] = pos
            const color    = CLASS_COLOR[car.carClass]
            const isPit    = car.status === 'PIT'
            const dotColor = isPit ? 'hsl(42 100% 50%)' : color

            return (
              <g key={car.carNum}
                style={{ transition: 'transform 200ms ease-out' }}>
                <circle cx={x} cy={y} r={dotRadius + 3}
                  fill={dotColor} opacity="0.18"
                  style={{ transition: 'cx 200ms ease-out, cy 200ms ease-out' }} />
                <circle cx={x} cy={y} r={dotRadius}
                  fill={dotColor} stroke="hsl(222 16% 3%)" strokeWidth="1"
                  opacity={isPit ? 0.55 : 1}
                  style={{ transition: 'cx 200ms ease-out, cy 200ms ease-out' }} />
                {!compact && (
                  <text x={x + dotRadius + 3} y={y + 1}
                    fontSize="8" fill={color} dominantBaseline="middle"
                    className="mono"
                    style={{ transition: 'x 200ms ease-out, y 200ms ease-out' }}
                  >
                    {car.carNum}
                  </text>
                )}
              </g>
            )
          })
        }

        {/* 9. S/F line — drawn last so it sits above everything */}
        <line
          x1={circuit.sf[0]} y1={circuit.sf[1]}
          x2={circuit.sf[2]} y2={circuit.sf[3]}
          stroke="hsl(220 8% 96%)" strokeWidth="2"
        />
        {!compact && (
          <text
            x={circuit.sf[2] + 3} y={(circuit.sf[1] + circuit.sf[3]) / 2}
            fontSize="8" fill="hsl(220 7% 57%)" dominantBaseline="middle"
            className="mono"
          >
            S/F
          </text>
        )}

        {/* 10. Compact label */}
        {compact && (
          <text x="12" y="18" fontSize="7" fill="hsl(220 7% 39%)" className="mono">
            {label.replace('Circuit de ', '').replace(' International Circuit', '')}
          </text>
        )}

        {!isLive && !compact && (
          <text x="240" y="360" textAnchor="middle"
            fontSize="9" fill="hsl(220 7% 25%)" className="mono">
            라이브 연결 시 차량 위치 표시
          </text>
        )}
      </svg>

      {!compact && (
        <div className="flex flex-wrap gap-3 text-[9px] text-fg3">
          {(['HYPERCAR', 'LMP2', 'LMGT3'] as const).map(cls => (
            <span key={cls} className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full"
                style={{ background: CLASS_COLOR[cls] }} />
              {cls}
            </span>
          ))}
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 h-0.5 opacity-50"
              style={{ background: 'hsl(42 100% 50%)' }} />
            PIT LANE
          </span>
          {circuit.drs && circuit.drs.length > 0 && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 h-0.5 opacity-50"
                style={{ background: 'hsl(276 100% 71%)' }} />
              DRS / OVERTAKE
            </span>
          )}
        </div>
      )}
    </div>
  )
}

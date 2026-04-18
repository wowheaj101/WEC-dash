'use client'

import { useMemo } from 'react'
import type { Car } from '@/app/types/race'
import { CIRCUIT_SVG, SPA } from '@/app/data/trackPaths'
import { CURRENT_SEASON } from '@/app/data/calendar'
import { getRoundStatus } from '@/app/lib/getRoundStatus'

const CLASS_COLOR: Record<string, string> = {
  HYPERCAR: '#ff4444',
  LMP2:     '#4488ff',
  LMGT3:    '#44cc55',
}

// Spa car positions (used only when Timing71 is live — circuit matched to active session)
const SPA_CAR_POSITIONS: Record<number, [number, number]> = {
  2:  [335, 215],
  7:  [294, 270],
  6:  [258, 346],
  8:  [210, 185],
  10: [268, 148],
  22: [318, 268],
  37: [152, 79],
  77: [248, 242],
  91: [357, 238],
  55: [258, 356],
}

interface Props {
  cars:        Car[]
  compact?:    boolean
  /** If provided, overrides the calendar-derived circuit */
  circuitKey?: string
  isLive?:     boolean
}

export default function TrackMap({ cars, compact, circuitKey, isLive }: Props) {
  const roundStatus = useMemo(() => getRoundStatus(CURRENT_SEASON), [])

  // Pick which circuit to show:
  // 1. Explicit override (e.g. from Timing71 service name matching)
  // 2. When live → use active/current round's circuit
  // 3. When not live → use next round's circuit
  const resolvedKey = circuitKey
    ?? (isLive ? roundStatus.current?.circuit : roundStatus.next?.circuit)
    ?? roundStatus.current?.circuit

  const circuit: import('@/app/data/trackPaths').CircuitSVG =
    (resolvedKey ? CIRCUIT_SVG[resolvedKey] : undefined) ?? SPA
  const label   = resolvedKey ?? 'Circuit de Spa-Francorchamps'

  // Only render car dots when we're live AND we're showing the Spa circuit
  // (car positions are hardcoded for Spa; future: interpolate from sector data)
  const showCars = isLive && (!resolvedKey || resolvedKey === 'Circuit de Spa-Francorchamps')

  return (
    <div style={{
      background:    '#0f0f0f',
      border:        '0.5px solid #2a2a2a',
      borderRadius:  8,
      padding:       compact ? 8 : 12,
      display:       'flex',
      flexDirection: 'column',
      gap:           8,
    }}>
      {!compact && (
        <div style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 1 }}>
          트랙맵 — {label}
        </div>
      )}

      <svg
        viewBox="0 0 480 380"
        style={{ width: '100%', height: compact ? 170 : 'auto' }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Pit lane */}
        <path d={circuit.pitLane} stroke="#ff9900" strokeWidth="3"
          strokeDasharray="4,3" fill="none" opacity="0.35" />

        {/* Track border (glow) */}
        <path d={circuit.path} stroke="#1e1e1e"
          strokeWidth={compact ? 10 : 14}
          fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {/* Track surface */}
        <path d={circuit.path} stroke="#2e2e2e"
          strokeWidth={compact ? 7 : 10}
          fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {/* S/F line */}
        <line
          x1={circuit.sf[0]} y1={circuit.sf[1]}
          x2={circuit.sf[2]} y2={circuit.sf[3]}
          stroke="#fff" strokeWidth="2"
        />
        {!compact && (
          <text
            x={circuit.sf[2] + 3} y={(circuit.sf[1] + circuit.sf[3]) / 2}
            fontSize="8" fill="#888" dominantBaseline="middle"
          >
            S/F
          </text>
        )}

        {/* Sector markers */}
        {circuit.sectors.map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#ffff55" strokeWidth="1.5" opacity="0.6" />
        ))}

        {/* Circuit label (compact mode, top-left) */}
        {compact && (
          <text x="12" y="18" fontSize="7" fill="#444"
            style={{ fontFamily: 'monospace' }}>
            {label.replace('Circuit de ', '').replace(' International Circuit', '')}
          </text>
        )}

        {/* Car dots — only when live on the Spa circuit */}
        {showCars && cars.map(car => {
          const [x, y]  = SPA_CAR_POSITIONS[car.carNum] ?? [240, 190]
          const color   = CLASS_COLOR[car.carClass]
          const isPit   = car.status === 'PIT'
          const isOut   = car.status === 'OUT'
          const r       = compact ? 5 : 7
          const dotColor = isPit ? '#ff9900' : isOut ? '#ffaa00' : color

          return (
            <g key={car.carNum}>
              <circle cx={x} cy={y} r={r + 4} fill={dotColor} opacity="0.12" />
              <circle cx={x} cy={y} r={r}
                fill={dotColor} stroke="#000" strokeWidth="1"
                opacity={isPit ? 0.65 : 1}
              />
              {!compact && (
                <text x={x + r + 3} y={y + 1}
                  fontSize="8" fill={color} dominantBaseline="middle"
                  style={{ fontFamily: 'monospace' }}
                >
                  {car.carNum}
                </text>
              )}
            </g>
          )
        })}

        {/* "No live data" overlay when not live */}
        {!showCars && !compact && (
          <text x="240" y="340" textAnchor="middle"
            fontSize="9" fill="#333" style={{ fontFamily: 'monospace' }}>
            라이브 연결 시 차량 위치 표시
          </text>
        )}
      </svg>

      {/* Class legend */}
      {!compact && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 9, color: '#555' }}>
          {(['HYPERCAR', 'LMP2', 'LMGT3'] as const).map(cls => (
            <span key={cls} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: CLASS_COLOR[cls], display: 'inline-block',
              }} />
              {cls}
            </span>
          ))}
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 16, height: 2, background: '#ff9900', display: 'inline-block', opacity: 0.5 }} />
            PIT LANE
          </span>
        </div>
      )}
    </div>
  )
}

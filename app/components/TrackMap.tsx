'use client'

import { useMemo } from 'react'
import type { Car } from '@/app/types/race'
import { CIRCUIT_SVG, SPA } from '@/app/data/trackPaths'
import type { CircuitSVG } from '@/app/data/trackPaths'
import { CURRENT_SEASON } from '@/app/data/calendar'
import { getRoundStatus } from '@/app/lib/getRoundStatus'

const CLASS_COLOR: Record<string, string> = {
  HYPERCAR: '#ff4444',
  LMP2:     '#4488ff',
  LMGT3:    '#44cc55',
}

interface Props {
  cars:        Car[]
  compact?:    boolean
  circuitKey?: string
  isLive?:     boolean
}

function carDotPosition(
  car: Car,
  circuit: CircuitSVG,
  indexInSector: number,
): [number, number] {
  if (car.status === 'PIT') {
    // Distribute pit cars along pit lane start point
    const sfMidX = (circuit.sf[0] + circuit.sf[2]) / 2
    const sfMidY = (circuit.sf[1] + circuit.sf[3]) / 2
    return [sfMidX + (indexInSector % 4 - 1.5) * 9, sfMidY - 14]
  }
  const s = Math.min((car.sectorNum ?? 1) - 1, 2)
  const [bx, by] = circuit.sectorPoints[s]
  // Spread cars in a 3-wide grid so dots don't stack
  const col = indexInSector % 3
  const row = Math.floor(indexInSector / 3)
  return [bx + (col - 1) * 11, by + (row - 1) * 11]
}

export default function TrackMap({ cars, compact, circuitKey, isLive }: Props) {
  const roundStatus = useMemo(() => getRoundStatus(CURRENT_SEASON), [])

  const resolvedKey = circuitKey
    ?? (isLive ? roundStatus.current?.circuit : roundStatus.next?.circuit)
    ?? roundStatus.current?.circuit

  const circuit: CircuitSVG =
    (resolvedKey ? CIRCUIT_SVG[resolvedKey] : undefined) ?? SPA
  const label = resolvedKey ?? 'Circuit de Spa-Francorchamps'

  // Group cars by sector for index-within-sector calculation
  const sectorGroups = useMemo(() => {
    const groups: Map<string, Car[]> = new Map()
    for (const car of cars) {
      const key = car.status === 'PIT' ? 'pit' : String(car.sectorNum ?? 1)
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(car)
    }
    return groups
  }, [cars])

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

        {/* Circuit label (compact mode) */}
        {compact && (
          <text x="12" y="18" fontSize="7" fill="#444"
            style={{ fontFamily: 'monospace' }}>
            {label.replace('Circuit de ', '').replace(' International Circuit', '')}
          </text>
        )}

        {/* Car dots — sector-based positions when live */}
        {isLive && cars
          .filter(c => c.status !== 'OUT')
          .map(car => {
            const key = car.status === 'PIT' ? 'pit' : String(car.sectorNum ?? 1)
            const group = sectorGroups.get(key) ?? []
            const idx = group.findIndex(c => c.carNum === car.carNum)
            const [x, y] = carDotPosition(car, circuit, Math.max(idx, 0))
            const color    = CLASS_COLOR[car.carClass]
            const isPit    = car.status === 'PIT'
            const dotColor = isPit ? '#ff9900' : color
            const r        = compact ? 4 : 6

            return (
              <g key={car.carNum}>
                <circle cx={x} cy={y} r={r + 3} fill={dotColor} opacity="0.15" />
                <circle cx={x} cy={y} r={r}
                  fill={dotColor} stroke="#000" strokeWidth="1"
                  opacity={isPit ? 0.6 : 1}
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
          })
        }

        {!isLive && !compact && (
          <text x="240" y="340" textAnchor="middle"
            fontSize="9" fill="#333" style={{ fontFamily: 'monospace' }}>
            라이브 연결 시 차량 위치 표시
          </text>
        )}
      </svg>

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

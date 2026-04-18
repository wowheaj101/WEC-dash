'use client'

import type { Car } from '@/app/types/race'
import TireBadge from './TireBadge'
import ClassBadge from './ClassBadge'
import StatusBadge from './StatusBadge'

// Must stay in sync with Leaderboard.tsx header
export const GRID_COLS =
  '28px 32px 60px 32px minmax(120px,1fr) 44px 46px 72px 72px 68px 60px 56px'

const CLS_POS_COLOR: Record<string, string> = {
  HYPERCAR: '#ff4444',
  LMP2:     '#4488ff',
  LMGT3:    '#44cc55',
}

interface Props {
  car:           Car
  isClassBorder: boolean   // first row of a new class → add top border
}

export default function LeaderboardRow({ car, isClassBorder }: Props) {
  const isPit = car.status === 'PIT'

  const gapColor  = car.gap === 'LEAD'
    ? '#ffff66'
    : car.gap.includes('Lap') ? '#555' : '#aaa'

  const intColor  = car.interval === '—' || car.interval.includes('Lap') ? '#555' : '#888'

  const lastColor = car.isFastestLap
    ? '#cc44ff'
    : isPit ? '#555' : '#ccc'

  const bestColor = car.isFastestLap ? '#cc44ff' : '#b8a0c0'

  return (
    <div
      className="lb-row"
      style={{
        display:             'grid',
        gridTemplateColumns: GRID_COLS,
        alignItems:          'center',
        padding:             '5px 8px',
        borderBottom:        '0.5px solid #1a1a1a',
        borderTop:           isClassBorder ? '1px solid #333' : undefined,
        background:          isPit ? '#1a1200' : 'transparent',
        minWidth:            0,
      }}
    >
      {/* POS */}
      <span style={{ fontSize: 11, color: '#888' }}>{car.pos}</span>

      {/* CLS */}
      <span style={{ fontSize: 10, color: CLS_POS_COLOR[car.carClass], fontWeight: 500 }}>
        {car.clsPos}
      </span>

      {/* CLASS badge */}
      <span><ClassBadge carClass={car.carClass} /></span>

      {/* Car number */}
      <span style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>
        {car.carNum}
      </span>

      {/* Team / Drivers */}
      <div style={{ minWidth: 0, overflow: 'hidden' }}>
        <div style={{
          fontSize: 9, color: '#666',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {car.team}
        </div>
        <div style={{
          fontSize: 10, color: '#ccc',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {car.drivers}
        </div>
      </div>

      {/* Tire */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <TireBadge tire={car.tire} />
      </div>

      {/* Laps */}
      <span style={{ fontSize: 10, color: '#aaa', textAlign: 'right', display: 'block' }}>
        {car.laps}
      </span>

      {/* Last Lap */}
      <span style={{
        fontSize: 10, color: lastColor,
        textAlign: 'right', display: 'block',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {isPit ? '—' : car.lastLap}
      </span>

      {/* Best Lap */}
      <span style={{
        fontSize: 10, color: bestColor,
        textAlign: 'right', display: 'block',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {car.bestLap}
      </span>

      {/* GAP */}
      <span style={{
        fontSize: 10, color: gapColor,
        textAlign: 'right', display: 'block',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {car.gap}
      </span>

      {/* INT */}
      <span style={{
        fontSize: 10, color: intColor,
        textAlign: 'right', display: 'block',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {car.interval}
      </span>

      {/* Status */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <StatusBadge status={car.status} />
      </div>
    </div>
  )
}

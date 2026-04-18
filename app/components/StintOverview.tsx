'use client'

import type { CarStint, Car } from '@/app/types/race'
import TireBadge from './TireBadge'

const CLASS_COLOR: Record<string, string> = {
  HYPERCAR: '#ff4444',
  LMP2:     '#4488ff',
  LMGT3:    '#44cc55',
}

interface Props {
  carStints: CarStint[]
  cars:      Car[]
  leaderLap: number
}

export default function StintOverview({ carStints, cars, leaderLap }: Props) {
  return (
    <div style={{
      background:   '#0f0f0f',
      border:       '0.5px solid #2a2a2a',
      borderRadius: 8,
      overflow:     'hidden',
    }}>
      <div style={{
        padding:      '5px 10px',
        borderBottom: '0.5px solid #1e1e1e',
        fontSize:     10,
        color:        '#555',
        textTransform:'uppercase',
        letterSpacing: 1,
      }}>
        스틴트 현황
      </div>

      {carStints.map(cs => {
        const lastStint  = cs.stints[cs.stints.length - 1]
        const pitCount   = cs.stints.length - 1
        const car        = cars.find(c => c.carNum === cs.carNum)
        const stintLaps  = lastStint.endLap !== null
          ? lastStint.endLap - lastStint.startLap + 1
          : leaderLap - lastStint.startLap + 1
        const clsColor = CLASS_COLOR[cs.carClass]

        return (
          <div
            key={cs.carNum}
            style={{
              display:      'flex',
              alignItems:   'center',
              padding:      '4px 10px',
              borderBottom: '0.5px solid #111',
              gap:          8,
              background:   car?.status === 'PIT' ? '#1a1200' : 'transparent',
            }}
          >
            <span style={{
              fontSize:  11,
              fontWeight: 600,
              color:     clsColor,
              width:     22,
              textAlign: 'right',
            }}>
              {cs.carNum}
            </span>
            <TireBadge tire={lastStint.tire} />
            <span style={{ fontSize: 9, color: '#888' }}>+{stintLaps}L</span>
            <span style={{ fontSize: 9, color: '#3a3a3a', marginLeft: 'auto' }}>
              Pit×{pitCount}
            </span>
          </div>
        )
      })}
    </div>
  )
}

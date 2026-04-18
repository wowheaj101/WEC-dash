'use client'

import type { Car } from '@/app/types/race'
import LeaderboardRow, { GRID_COLS } from './LeaderboardRow'

const HEADERS: { label: string; align: 'left' | 'center' | 'right' }[] = [
  { label: 'POS',         align: 'left'   },
  { label: 'CLS',         align: 'left'   },
  { label: 'CLASS',       align: 'left'   },
  { label: '#',           align: 'left'   },
  { label: 'TEAM · DRIVER', align: 'left' },
  { label: 'TIRE',        align: 'center' },
  { label: 'LAPS',        align: 'right'  },
  { label: 'LAST LAP',    align: 'right'  },
  { label: 'BEST LAP',    align: 'right'  },
  { label: 'GAP',         align: 'right'  },
  { label: 'INT',         align: 'right'  },
  { label: 'STATUS',      align: 'center' },
]

export default function Leaderboard({ cars }: { cars: Car[] }) {
  // Detect class-boundary rows (first row of LMP2, first row of LMGT3, etc.)
  const classBorderNums = new Set<number>()
  cars.forEach((car, i) => {
    if (i > 0 && car.carClass !== cars[i - 1].carClass) {
      classBorderNums.add(car.carNum)
    }
  })

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{
        border:       '0.5px solid #222',
        borderRadius: 8,
        overflow:     'hidden',
        minWidth:     640,
      }}>
        {/* Header row */}
        <div style={{
          display:             'grid',
          gridTemplateColumns: GRID_COLS,
          alignItems:          'center',
          background:          '#111',
          borderBottom:        '0.5px solid #222',
          padding:             '5px 8px',
        }}>
          {HEADERS.map((h) => (
            <span
              key={h.label}
              style={{
                fontSize:      9,
                color:         '#555',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                textAlign:     h.align,
                display:       'block',
              }}
            >
              {h.label}
            </span>
          ))}
        </div>

        {/* Data rows */}
        {cars.map((car) => (
          <LeaderboardRow
            key={car.carNum}
            car={car}
            isClassBorder={classBorderNums.has(car.carNum)}
          />
        ))}
      </div>
    </div>
  )
}

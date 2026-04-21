'use client'

import type { Car } from '@/app/types/race'
import LeaderboardRow, { GRID_COLS } from './LeaderboardRow'

const HEADERS: { label: string; align: 'left' | 'center' | 'right' }[] = [
  { label: 'POS',          align: 'left'   },
  { label: 'CLS',          align: 'left'   },
  { label: 'CLASS',        align: 'left'   },
  { label: '#',            align: 'left'   },
  { label: 'TEAM · DRIVER', align: 'left'  },
  { label: 'TIRE',         align: 'center' },
  { label: 'LAPS',         align: 'right'  },
  { label: 'LAST LAP',     align: 'right'  },
  { label: 'BEST LAP',     align: 'right'  },
  { label: 'GAP',          align: 'right'  },
  { label: 'INT',          align: 'right'  },
  { label: 'STATUS',       align: 'center' },
]

export default function Leaderboard({ cars }: { cars: Car[] }) {
  const classBorderNums = new Set<number>()
  cars.forEach((car, i) => {
    if (i > 0 && car.carClass !== cars[i - 1].carClass) {
      classBorderNums.add(car.carNum)
    }
  })

  return (
    <div className="overflow-x-auto">
      <div className="panel rounded-lg overflow-hidden min-w-[640px]">
        {/* Header row */}
        <div
          className="grid items-center bg-surface1 border-b border-border px-2 py-1.5"
          style={{ gridTemplateColumns: GRID_COLS }}
        >
          {HEADERS.map(h => (
            <span
              key={h.label}
              className="section-label block"
              style={{ textAlign: h.align }}
            >
              {h.label}
            </span>
          ))}
        </div>

        {/* Data rows */}
        {cars.map(car => (
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

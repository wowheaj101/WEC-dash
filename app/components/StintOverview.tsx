'use client'

import { cn } from '@/app/lib/utils'
import type { CarStint, Car } from '@/app/types/race'
import TireBadge from './TireBadge'

const CLS_TEXT: Record<string, string> = {
  HYPERCAR: 'text-hypercar',
  LMP2:     'text-lmp2',
  LMGT3:    'text-lmgt3',
}

interface Props {
  carStints: CarStint[]
  cars:      Car[]
  leaderLap: number
}

export default function StintOverview({ carStints, cars, leaderLap }: Props) {
  return (
    <div className="panel flex flex-col overflow-hidden min-h-0">
      <div className="panel-header">STINT OVERVIEW</div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {carStints.map(cs => {
          const lastStint = cs.stints[cs.stints.length - 1]
          const pitCount  = cs.stints.length - 1
          const car       = cars.find(c => c.carNumStr === cs.carNumStr)
          const stintLaps = lastStint.endLap !== null
            ? lastStint.endLap - lastStint.startLap + 1
            : leaderLap - lastStint.startLap + 1

          return (
            <div
              key={cs.carNumStr}
              className={cn(
                'flex items-center gap-2 px-3 py-2 border-b border-line1',
                car?.status === 'PIT' && 'bg-[hsl(var(--pit-bg))]',
              )}
            >
              <span className={cn('disp text-[14px] font-bold w-7 text-right', CLS_TEXT[cs.carClass])}>
                {cs.carNumStr}
              </span>
              <TireBadge tire={lastStint.tire} laps={stintLaps} />
              <span className="mono text-[10px] text-fg3 ml-auto">PIT×{pitCount}</span>
            </div>
          )
        })}
        {carStints.length === 0 && (
          <div className="py-6 text-center text-[11px] text-fg3">NO STINT DATA</div>
        )}
      </div>
    </div>
  )
}

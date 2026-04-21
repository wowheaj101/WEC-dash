'use client'

import { cn } from '@/app/lib/utils'
import type { CarStint, Car } from '@/app/types/race'
import TireBadge from './TireBadge'

const CLS_TEXT: Record<string, string> = {
  HYPERCAR: 'text-[hsl(var(--hypercar))]',
  LMP2:     'text-[hsl(var(--lmp2))]',
  LMGT3:    'text-[hsl(var(--lmgt3))]',
}

interface Props {
  carStints: CarStint[]
  cars:      Car[]
  leaderLap: number
}

export default function StintOverview({ carStints, cars, leaderLap }: Props) {
  return (
    <div className="panel overflow-hidden">
      <div className="px-3 py-2 border-b border-border section-label">
        스틴트 현황
      </div>

      {carStints.map(cs => {
        const lastStint = cs.stints[cs.stints.length - 1]
        const pitCount  = cs.stints.length - 1
        const car       = cars.find(c => c.carNum === cs.carNum)
        const stintLaps = lastStint.endLap !== null
          ? lastStint.endLap - lastStint.startLap + 1
          : leaderLap - lastStint.startLap + 1

        return (
          <div
            key={cs.carNum}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 border-b border-[hsl(var(--background))]',
              car?.status === 'PIT' ? 'bg-[hsl(var(--pit-bg))]' : 'bg-transparent'
            )}
          >
            <span className={cn('text-[11px] font-semibold w-6 text-right', CLS_TEXT[cs.carClass])}>
              {cs.carNum}
            </span>
            <TireBadge tire={lastStint.tire} />
            <span className="text-[9px] text-muted-foreground">+{stintLaps}L</span>
            <span className="text-[9px] text-[hsl(0_0%_25%)] ml-auto">Pit×{pitCount}</span>
          </div>
        )
      })}
    </div>
  )
}

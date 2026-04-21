'use client'

import { cn } from '@/app/lib/utils'
import type { Car } from '@/app/types/race'
import TireBadge from './TireBadge'
import ClassBadge from './ClassBadge'
import StatusBadge from './StatusBadge'

export const GRID_COLS =
  '28px 32px 60px 32px minmax(120px,1fr) 44px 46px 72px 72px 68px 60px 56px'

const CLS_POS_COLOR: Record<string, string> = {
  HYPERCAR: 'text-[hsl(var(--hypercar))]',
  LMP2:     'text-[hsl(var(--lmp2))]',
  LMGT3:    'text-[hsl(var(--lmgt3))]',
}

interface Props {
  car:           Car
  isClassBorder: boolean
}

export default function LeaderboardRow({ car, isClassBorder }: Props) {
  const isPit = car.status === 'PIT'

  const gapClass = car.gap === 'LEAD'
    ? 'text-yellow-300'
    : car.gap.includes('Lap') ? 'text-muted-foreground' : 'text-[#aaa]'

  const intClass = car.interval === '—' || car.interval.includes('Lap')
    ? 'text-muted-foreground'
    : 'text-[#888]'

  const lastClass = car.isFastestLap
    ? 'text-[hsl(var(--fastest))]'
    : isPit ? 'text-muted-foreground' : 'text-foreground'

  const bestClass = car.isFastestLap ? 'text-[hsl(var(--fastest))]' : 'text-[#b8a0c0]'

  return (
    <div
      className={cn(
        'lb-row grid items-center px-2 py-1.5 border-b border-[hsl(var(--background))]',
        isClassBorder && 'border-t border-t-surface3',
        isPit ? 'bg-[hsl(var(--pit-bg))]' : 'bg-transparent',
      )}
      style={{ gridTemplateColumns: GRID_COLS }}
    >
      {/* POS */}
      <span className="text-[11px] text-muted-foreground">{car.pos}</span>

      {/* CLS pos */}
      <span className={cn('text-[10px] font-semibold', CLS_POS_COLOR[car.carClass])}>
        {car.clsPos}
      </span>

      {/* CLASS badge */}
      <span><ClassBadge carClass={car.carClass} /></span>

      {/* Car number */}
      <span className="text-[14px] font-semibold text-foreground">{car.carNum}</span>

      {/* Team / Driver */}
      <div className="min-w-0 overflow-hidden">
        <div className="text-[9px] text-muted-foreground truncate">{car.team}</div>
        <div className="text-[10px] text-foreground truncate">{car.drivers}</div>
      </div>

      {/* Tire */}
      <div className="flex justify-center">
        <TireBadge tire={car.tire} />
      </div>

      {/* Laps */}
      <span className="text-[10px] text-muted-foreground text-right block tabular">{car.laps}</span>

      {/* Last Lap */}
      <span className={cn('text-[10px] text-right block tabular', lastClass)}>
        {isPit ? '—' : car.lastLap}
      </span>

      {/* Best Lap */}
      <span className={cn('text-[10px] text-right block tabular', bestClass)}>
        {car.bestLap}
      </span>

      {/* GAP */}
      <span className={cn('text-[10px] text-right block tabular', gapClass)}>
        {car.gap}
      </span>

      {/* INT */}
      <span className={cn('text-[10px] text-right block tabular', intClass)}>
        {car.interval}
      </span>

      {/* Status */}
      <div className="flex justify-center">
        <StatusBadge status={car.status} />
      </div>
    </div>
  )
}

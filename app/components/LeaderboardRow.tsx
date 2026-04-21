'use client'

import { cn } from '@/app/lib/utils'
import type { Car } from '@/app/types/race'
import TireBadge from './TireBadge'
import ClassBadge from './ClassBadge'
import StatusBadge from './StatusBadge'

export const GRID_COLS =
  '56px 96px 58px minmax(160px,1fr) 92px 104px 92px 60px'

const CLS_COLOR: Record<string, string> = {
  HYPERCAR: 'hsl(var(--hypercar))',
  LMP2:     'hsl(var(--lmp2))',
  LMGT3:    'hsl(var(--lmgt3))',
}

interface Props {
  car:           Car
  isClassBorder: boolean
}

export default function LeaderboardRow({ car, isClassBorder }: Props) {
  const isPit = car.status === 'PIT'
  const isLeader = car.pos === 1

  const gapIsLead = car.gap === 'LEAD'
  const gapClass = gapIsLead
    ? 'text-pit'
    : car.gap.includes('Lap') ? 'text-fg3' : 'text-fg0'

  const lastClass = car.lastColor === 'sb'
    ? 'text-fastest'
    : isPit ? 'text-pit' : 'text-fg0'

  return (
    <div
      className={cn(
        'lb-row grid items-stretch h-[44px] mb-[3px] transition-colors',
        isClassBorder && 'mt-2',
      )}
      style={{
        gridTemplateColumns: GRID_COLS,
        background: isLeader
          ? 'linear-gradient(90deg, rgba(255,46,46,0.10) 0%, hsl(var(--bg-2)) 60%)'
          : 'hsl(var(--bg-2))',
        border: isLeader ? '1px solid hsl(var(--hypercar))' : '1px solid hsl(var(--line-1))',
      }}
    >
      {/* POS — chevron with class color */}
      <div
        className="disp flex items-center justify-center font-black text-white text-[18px]"
        style={{
          background: CLS_COLOR[car.carClass] ?? 'hsl(var(--bg-3))',
          clipPath: 'polygon(0 0, 100% 0, calc(100% - 11px) 100%, 0 100%)',
        }}
      >
        <span className="text-[10px] opacity-70 mr-0.5">P</span>
        {car.pos}
      </div>

      {/* CLASS + class pos */}
      <div className="flex items-center pl-2 gap-1.5 min-w-0">
        <ClassBadge carClass={car.carClass} />
        <span className="mono text-[9px] text-fg3 shrink-0">P{car.clsPos}</span>
      </div>

      {/* Car number */}
      <div className="disp flex items-center justify-center font-black text-fg0 text-[24px]">
        {car.carNum}
      </div>

      {/* Team / Driver */}
      <div className="flex flex-col justify-center pr-2.5 min-w-0">
        <div className="text-[13px] font-semibold text-fg0 truncate" style={{ letterSpacing: 0.2 }}>
          {car.team}
        </div>
        <div className="mono text-[10px] text-fg3 truncate">{car.drivers}</div>
      </div>

      {/* Gap */}
      <div className="flex items-center justify-end pr-2.5">
        <div className="text-right">
          <div className={cn('mono font-bold text-[14px]', gapClass)}>{car.gap}</div>
          <div className="disp text-[8px] text-fg4 tracking-[1px] uppercase">
            {gapIsLead ? 'CLASS' : 'TO LEADER'}
          </div>
        </div>
      </div>

      {/* Last / Best */}
      <div className="flex flex-col items-end justify-center pr-2.5">
        <div className={cn('mono font-bold text-[14px]', lastClass)}>
          {isPit ? 'PIT' : car.lastLap}
        </div>
        <div className="disp text-[8px] text-fg4 tracking-[1px] uppercase">
          LAST · BEST {car.bestLap}
        </div>
      </div>

      {/* Tire / stint */}
      <div className="flex items-center justify-center pr-2.5">
        <TireBadge tire={car.tire} laps={car.laps} />
      </div>

      {/* Status */}
      <div className="flex items-center justify-center">
        <StatusBadge status={car.status} />
      </div>
    </div>
  )
}

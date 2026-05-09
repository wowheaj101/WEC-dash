'use client'

import { useEffect, useState } from 'react'
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

const FLASH_DURATION_MS = 1200

interface Props {
  car:       Car
  deltaPos?: number   // +N = positions gained, -N = positions lost
}

export default function LeaderboardRow({ car, deltaPos = 0 }: Props) {
  const isPit = car.status === 'PIT'
  const isLeader = car.clsPos === 1

  const gapIsLead = car.gap === 'LEAD' || car.gap === 'Leader'
  const gapClass = gapIsLead
    ? 'text-pit'
    : car.gap.includes('Lap') ? 'text-fg3' : 'text-fg0'

  const lastClass = car.lastColor === 'sb'
    ? 'text-fastest'
    : isPit ? 'text-pit' : 'text-fg0'

  // Flash effect — restart on every new delta event by tracking a counter
  const [flashId, setFlashId] = useState(0)
  useEffect(() => {
    if (deltaPos !== 0) {
      setFlashId(id => id + 1)
    }
  }, [deltaPos])

  const flashing = deltaPos !== 0
  const flashColor = deltaPos > 0 ? 'lmgt3' : 'danger'  // green up, red down

  return (
    <div
      data-car-num={car.carNumStr}
      className={cn(
        'lb-row grid items-stretch h-[44px] mb-[3px] relative',
        flashing && 'lb-flash',
      )}
      data-flash-id={flashId}
      style={{
        gridTemplateColumns: GRID_COLS,
        background: isLeader
          ? 'linear-gradient(90deg, rgba(255,46,46,0.10) 0%, hsl(var(--bg-2)) 60%)'
          : 'hsl(var(--bg-2))',
        border: isLeader ? '1px solid hsl(var(--hypercar))' : '1px solid hsl(var(--line-1))',
        // Override flash color via CSS custom property
        ['--flash-color' as string]: `var(--${flashColor})`,
        animationDuration: flashing ? `${FLASH_DURATION_MS}ms` : undefined,
      }}
    >
      {/* POS — class position (chevron with class color) */}
      <div
        className="disp flex items-center justify-center font-black text-white text-[18px] relative"
        style={{
          background: CLS_COLOR[car.carClass] ?? 'hsl(var(--bg-3))',
          clipPath: 'polygon(0 0, 100% 0, calc(100% - 11px) 100%, 0 100%)',
        }}
      >
        <span className="text-[10px] opacity-70 mr-0.5">P</span>
        {car.clsPos}

        {/* Delta badge — appears for DELTA_DISPLAY_MS after position change */}
        {deltaPos !== 0 && (
          <span
            className={cn(
              'absolute -top-1 -right-1 mono text-[10px] font-bold px-1 py-px rounded leading-none',
              deltaPos > 0
                ? 'bg-[hsl(var(--lmgt3))] text-white'
                : 'bg-[hsl(var(--danger))] text-white',
            )}
            style={{ minWidth: 20, textAlign: 'center' }}
          >
            {deltaPos > 0 ? `▲${deltaPos}` : `▼${Math.abs(deltaPos)}`}
          </span>
        )}
      </div>

      {/* CLASS + overall pos */}
      <div className="flex items-center pl-2 gap-1.5 min-w-0">
        <ClassBadge carClass={car.carClass} />
        <span className="mono text-[9px] text-fg3 shrink-0">#{car.pos}</span>
      </div>

      {/* Car number */}
      <div className="disp flex items-center justify-center font-black text-fg0 text-[24px]">
        {car.carNumStr}
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

'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/app/lib/utils'
import type { Car } from '@/app/types/race'
import StatusBadge from './StatusBadge'

// 16-column dense grid: Pos | +/- | Class | Team | Driver | Car | Int | Gap | S1 | S2 | S3 | Last | Best | Laps | Pits | Status
export const LB_GRID_COLS =
  '40px 36px 76px 220px 180px 200px 80px 80px 70px 70px 70px 92px 92px 50px 50px 56px'
export const LB_MIN_WIDTH = '1392px'

const FLASH_DURATION_MS = 1200

const CLS_COLOR: Record<string, string> = {
  HYPERCAR: 'hsl(var(--hypercar))',
  LMP2:     'hsl(var(--lmp2))',
  LMGT3:    'hsl(var(--lmgt3))',
}

const CLS_LABEL: Record<string, string> = {
  HYPERCAR: 'HYPERCAR',
  LMP2:     'LMP2',
  LMGT3:    'LMGT3',
}

function formatSectorMs(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return '--'
  return (ms / 1000).toFixed(3)
}

interface Props {
  car:       Car
  deltaPos?: number
}

export default function LeaderboardRow({ car, deltaPos = 0 }: Props) {
  const isPit  = car.status === 'PIT'
  const isOut  = car.status === 'OUT'
  const isLead = car.clsPos === 1

  const gapIsLead = car.gap === 'Leader' || car.gap === 'LEAD'
  const gapClass  = gapIsLead
    ? 'text-pit'
    : car.gap.includes('L') ? 'text-fg3' : 'text-fg0'

  const intervalIsLead = car.interval === '—' || car.interval === '--'
  const lastClass = car.lastColor === 'sb'
    ? 'text-fastest'
    : car.lastColor === 'pb'
      ? 'text-lmgt3'
      : (isPit ? 'text-pit' : 'text-fg0')
  const bestClass = car.bestColor === 'sb' ? 'text-fastest' : 'text-fg1'

  // Restart flash on every new delta event
  const [flashId, setFlashId] = useState(0)
  useEffect(() => {
    if (deltaPos !== 0) setFlashId(id => id + 1)
  }, [deltaPos])

  const flashing   = deltaPos !== 0
  const flashColor = deltaPos > 0 ? 'lmgt3' : 'danger'

  return (
    <div
      data-flash-id={flashId}
      className={cn(
        'grid items-center mb-[2px] text-[12px] mono relative',
        flashing && 'lb-flash',
      )}
      style={{
        gridTemplateColumns: LB_GRID_COLS,
        minWidth: LB_MIN_WIDTH,
        height: 32,
        background: isLead
          ? 'linear-gradient(90deg, hsl(var(--accent) / 0.10) 0%, hsl(var(--bg-2)) 30%)'
          : 'hsl(var(--bg-2))',
        border: '1px solid hsl(var(--line-1))',
        borderLeft: `3px solid ${CLS_COLOR[car.carClass] ?? 'hsl(var(--bg-3))'}`,
        opacity: isOut ? 0.55 : 1,
        ['--flash-color' as string]: `var(--${flashColor})`,
        animationDuration: flashing ? `${FLASH_DURATION_MS}ms` : undefined,
      }}
    >
      {/* Pos */}
      <div className="disp text-center font-bold text-fg0 text-[14px]">
        {car.pos}
      </div>

      {/* +/- delta */}
      <div className="text-center">
        {deltaPos !== 0 ? (
          <span className={cn(
            'mono text-[10px] font-bold px-1 py-0.5 rounded',
            deltaPos > 0
              ? 'bg-[hsl(var(--lmgt3)/0.2)] text-lmgt3'
              : 'bg-[hsl(var(--danger)/0.2)] text-danger',
          )}>
            {deltaPos > 0 ? `+${deltaPos}` : deltaPos}
          </span>
        ) : (
          <span className="text-fg4">·</span>
        )}
      </div>

      {/* Class badge */}
      <div className="flex items-center justify-center px-1">
        <span
          className="disp text-[9px] font-bold tracking-[1px] px-2 py-0.5 rounded"
          style={{
            background: CLS_COLOR[car.carClass] ?? 'hsl(var(--bg-3))',
            color: 'white',
          }}
        >
          {CLS_LABEL[car.carClass] ?? car.carClass}
        </span>
      </div>

      {/* Team — number prefix + team name */}
      <div className="flex items-center pl-2 gap-2 min-w-0">
        <span className="disp text-fg0 font-bold text-[13px] shrink-0 w-[34px] text-right">
          {car.carNumStr}
        </span>
        <span className="text-fg1 truncate text-[12px]">{car.team}</span>
      </div>

      {/* Driver(s) */}
      <div className="pl-2 truncate text-fg2 text-[11px]">
        {car.drivers || '—'}
      </div>

      {/* Car / manufacturer */}
      <div className="pl-2 truncate text-fg3 text-[11px]">
        {car.manufacturer || '—'}
      </div>

      {/* Interval (to car ahead) */}
      <div className="text-right pr-2 text-fg1 font-bold">
        {intervalIsLead ? <span className="text-fg4">—</span> : car.interval}
      </div>

      {/* Gap (to leader) */}
      <div className={cn('text-right pr-2 font-bold', gapClass)}>
        {car.gap}
      </div>

      {/* S1 */}
      <div className="text-right pr-2 text-fg2">{formatSectorMs(car.s1Ms)}</div>
      {/* S2 */}
      <div className="text-right pr-2 text-fg2">{formatSectorMs(car.s2Ms)}</div>
      {/* S3 */}
      <div className="text-right pr-2 text-fg2">{formatSectorMs(car.s3Ms)}</div>

      {/* Last lap */}
      <div className={cn('text-right pr-2 font-bold', lastClass)}>
        {isPit ? <span className="text-pit">PIT</span> : car.lastLap}
      </div>

      {/* Best lap */}
      <div className={cn('text-right pr-2', bestClass)}>
        {car.bestLap}
      </div>

      {/* Laps */}
      <div className="text-center text-fg2">{car.laps}</div>

      {/* Pits */}
      <div className="text-center">
        <span className="mono text-[10px] text-fg3 px-1.5 py-0.5 bg-bg3 rounded">
          {car.pitstops}
        </span>
      </div>

      {/* Status */}
      <div className="flex items-center justify-center px-1">
        <StatusBadge status={car.status} />
      </div>
    </div>
  )
}

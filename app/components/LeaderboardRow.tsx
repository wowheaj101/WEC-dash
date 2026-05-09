'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/app/lib/utils'
import type { Car } from '@/app/types/race'
import StatusBadge from './StatusBadge'

// 16-column dense grid: Pos | +/- | Class | Team | Driver | Car | Int | Gap | S1 | S2 | S3 | Last | Best | Laps | Pits | Status
// Team/Driver/Car use minmax(_, 1fr) so they expand to fill any extra width
// instead of leaving a big empty area on wide screens.
export const LB_GRID_COLS =
  '44px 44px 84px minmax(220px,1.4fr) minmax(170px,1.1fr) minmax(180px,1.2fr) 80px 84px 64px 64px 64px 88px 88px 50px 48px 60px'
export const LB_MIN_WIDTH = '1380px'

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
        'grid items-center mb-[3px] mono relative',
        flashing && 'lb-flash',
      )}
      style={{
        gridTemplateColumns: LB_GRID_COLS,
        minWidth: LB_MIN_WIDTH,
        height: 64,
        background: isLead
          ? 'linear-gradient(90deg, hsl(var(--accent) / 0.10) 0%, hsl(var(--bg-2)) 30%)'
          : 'hsl(var(--bg-2))',
        border: '1px solid hsl(var(--line-1))',
        borderLeft: `4px solid ${CLS_COLOR[car.carClass] ?? 'hsl(var(--bg-3))'}`,
        opacity: isOut ? 0.55 : 1,
        ['--flash-color' as string]: `var(--${flashColor})`,
        animationDuration: flashing ? `${FLASH_DURATION_MS}ms` : undefined,
      }}
    >
      {/* Pos */}
      <div className="disp text-center font-bold text-fg0 text-[20px]">
        {car.pos}
      </div>

      {/* +/- delta */}
      <div className="text-center">
        {deltaPos !== 0 ? (
          <span className={cn(
            'mono text-[12px] font-bold px-1.5 py-1 rounded',
            deltaPos > 0
              ? 'bg-[hsl(var(--lmgt3)/0.2)] text-lmgt3'
              : 'bg-[hsl(var(--danger)/0.2)] text-danger',
          )}>
            {deltaPos > 0 ? `+${deltaPos}` : deltaPos}
          </span>
        ) : (
          <span className="text-fg4 text-[16px]">·</span>
        )}
      </div>

      {/* Class badge */}
      <div className="flex items-center justify-center px-1">
        <span
          className="disp text-[10px] font-bold tracking-[1px] px-2.5 py-1 rounded"
          style={{
            background: CLS_COLOR[car.carClass] ?? 'hsl(var(--bg-3))',
            color: 'white',
          }}
        >
          {CLS_LABEL[car.carClass] ?? car.carClass}
        </span>
      </div>

      {/* Team — bold car number + team name */}
      <div className="flex items-center pl-2.5 gap-2.5 min-w-0">
        <span className="disp text-fg0 font-black text-[22px] shrink-0 w-[44px] text-right tabular-nums">
          {car.carNumStr}
        </span>
        <span className="text-fg1 truncate text-[13px] font-semibold">{car.team}</span>
      </div>

      {/* Driver(s) */}
      <div className="pl-2 truncate text-fg2 text-[12px]">
        {car.drivers || '—'}
      </div>

      {/* Car / manufacturer */}
      <div className="pl-2 truncate text-fg3 text-[12px]">
        {car.manufacturer || '—'}
      </div>

      {/* Interval (to car ahead) */}
      <div className="text-right pr-2.5 text-fg1 font-bold text-[13px]">
        {intervalIsLead ? <span className="text-fg4">—</span> : car.interval}
      </div>

      {/* Gap (to leader) */}
      <div className={cn('text-right pr-2.5 font-bold text-[13px]', gapClass)}>
        {car.gap}
      </div>

      {/* S1 */}
      <div className="text-right pr-2.5 text-fg2 text-[12px]">{formatSectorMs(car.s1Ms)}</div>
      {/* S2 */}
      <div className="text-right pr-2.5 text-fg2 text-[12px]">{formatSectorMs(car.s2Ms)}</div>
      {/* S3 */}
      <div className="text-right pr-2.5 text-fg2 text-[12px]">{formatSectorMs(car.s3Ms)}</div>

      {/* Last lap */}
      <div className={cn('text-right pr-2.5 font-bold text-[13px]', lastClass)}>
        {isPit ? <span className="text-pit">PIT</span> : car.lastLap}
      </div>

      {/* Best lap */}
      <div className={cn('text-right pr-2.5 text-[12px]', bestClass)}>
        {car.bestLap}
      </div>

      {/* Laps */}
      <div className="text-center text-fg2 text-[13px] font-semibold">{car.laps}</div>

      {/* Pits */}
      <div className="text-center">
        <span className="mono text-[11px] text-fg3 px-2 py-1 bg-bg3 rounded">
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

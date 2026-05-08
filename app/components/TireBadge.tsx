'use client'

import { cn } from '@/app/lib/utils'
import type { Tire } from '@/app/types/race'

const CONFIG: Record<Tire, { bg: string; text: string }> = {
  S: { bg: 'bg-[#ffd400]', text: 'text-black' },
  M: { bg: 'bg-[#f5f5f7]', text: 'text-black' },
  H: { bg: 'bg-hypercar',  text: 'text-white' },
  W: { bg: 'bg-lmp2',      text: 'text-white' },
  I: { bg: 'bg-lmgt3',     text: 'text-black' },
  '?': { bg: 'bg-bg3',     text: 'text-fg3' },
}

export default function TireBadge({ tire, laps }: { tire: Tire; laps?: number | null }) {
  const c = CONFIG[tire] ?? { bg: 'bg-bg3', text: 'text-fg1' }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          'disp inline-flex items-center justify-center rounded-full font-bold shrink-0',
          c.bg, c.text,
        )}
        style={{ width: 20, height: 20, fontSize: 11 }}
      >
        {tire}
      </span>
      {laps != null && (
        <span className="mono text-[11px] text-fg2">{laps}L</span>
      )}
    </span>
  )
}

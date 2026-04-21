'use client'

import type { CarClass } from '@/app/types/race'
import { cn } from '@/app/lib/utils'

const CLS_BG: Record<CarClass, string> = {
  HYPERCAR: 'bg-hypercar',
  LMP2:     'bg-lmp2',
  LMGT3:    'bg-lmgt3',
}

export default function ClassBadge({
  carClass,
  size = 10,
}: {
  carClass: CarClass
  size?: number
}) {
  const bg = CLS_BG[carClass] ?? 'bg-bg3'
  return (
    <span
      className={cn(
        'disp inline-block clip-chev-sm font-bold text-black whitespace-nowrap leading-[1.4]',
        bg,
      )}
      style={{
        padding: '2px 10px 2px 8px',
        fontSize: size,
        letterSpacing: 1.5,
      }}
    >
      {carClass}
    </span>
  )
}

'use client'

import { cn } from '@/app/lib/utils'
import type { Tire } from '@/app/types/race'

const CONFIG: Record<Tire, { bg: string; text: string }> = {
  S: { bg: 'bg-yellow-400',  text: 'text-black' },
  M: { bg: 'bg-white',       text: 'text-black' },
  H: { bg: 'bg-red-500',     text: 'text-white' },
  W: { bg: 'bg-blue-600',    text: 'text-white' },
  I: { bg: 'bg-emerald-600', text: 'text-white' },
}

export default function TireBadge({ tire }: { tire: Tire }) {
  const c = CONFIG[tire] ?? { bg: 'bg-surface3', text: 'text-foreground' }
  return (
    <span className={cn(
      'inline-flex items-center justify-center w-[18px] h-[18px] rounded-full text-[8px] font-semibold shrink-0',
      c.bg, c.text
    )}>
      {tire}
    </span>
  )
}

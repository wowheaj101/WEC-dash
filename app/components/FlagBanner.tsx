'use client'

import { cn } from '@/app/lib/utils'
import type { FlagStatus } from '@/app/types/race'

const CONFIG: Record<FlagStatus, {
  bg: string; border: string; text: string; dot: string; label: string
}> = {
  GREEN:  {
    bg:     'bg-[#002200]',
    border: 'border-[#00aa44]',
    text:   'text-[#00ff66]',
    dot:    'bg-[#00ff66]',
    label:  'GREEN FLAG — RACE RUNNING',
  },
  YELLOW: {
    bg:     'bg-[#261800]',
    border: 'border-[#cc8800]',
    text:   'text-[#ffaa00]',
    dot:    'bg-[#ffaa00]',
    label:  'YELLOW FLAG — CAUTION',
  },
  SC: {
    bg:     'bg-[#1a0e00]',
    border: 'border-[#ff7700]',
    text:   'text-[#ff9933]',
    dot:    'bg-[#ff9933]',
    label:  'SAFETY CAR DEPLOYED',
  },
  RED: {
    bg:     'bg-[#200000]',
    border: 'border-[#cc0000]',
    text:   'text-[#ff4444]',
    dot:    'bg-[#ff4444]',
    label:  'RED FLAG — SESSION SUSPENDED',
  },
}

export default function FlagBanner({ flag }: { flag: FlagStatus }) {
  const c = CONFIG[flag]
  return (
    <div className={cn(
      'flex items-center justify-center gap-2 py-1.5 rounded-lg border text-[11px] font-semibold tracking-[0.2em]',
      c.bg, c.border, c.text
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0 dot-blink', c.dot)} />
      {c.label}
    </div>
  )
}

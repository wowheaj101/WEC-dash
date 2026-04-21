'use client'

import { cn } from '@/app/lib/utils'
import type { Status } from '@/app/types/race'

const CFG: Record<Status, { color: string; bg: string }> = {
  RUN:  { color: 'text-live',    bg: 'bg-live/10' },
  PIT:  { color: 'text-pit',     bg: 'bg-pit/15' },
  OUT:  { color: 'text-info',    bg: 'bg-info/10' },
  OFF:  { color: 'text-warning', bg: 'bg-warning/10' },
  STOP: { color: 'text-danger',  bg: 'bg-danger/15' },
}

export default function StatusBadge({ status }: { status: Status }) {
  const c = CFG[status] ?? { color: 'text-fg2', bg: 'bg-bg2' }
  return (
    <span
      className={cn(
        'disp inline-flex items-center justify-center font-bold uppercase tracking-[1.5px]',
        c.color, c.bg,
      )}
      style={{ padding: '2px 8px', fontSize: 10, lineHeight: 1.4 }}
    >
      {status}
    </span>
  )
}

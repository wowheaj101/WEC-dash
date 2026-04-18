'use client'

import type { Status } from '@/app/types/race'

const CONFIG: Record<Status, { bg: string; color: string; border?: string }> = {
  RUN:  { bg: '#0a1a0a', color: '#44bb55' },
  PIT:  { bg: '#1a1200', color: '#ffaa00', border: '0.5px solid #ffaa00' },
  OUT:  { bg: '#001a1a', color: '#44ccff' },
  OFF:  { bg: '#1a0a0a', color: '#ff6644' },
  STOP: { bg: '#1a0000', color: '#ff4444', border: '0.5px solid #ff4444' },
}

export default function StatusBadge({ status }: { status: Status }) {
  const c = CONFIG[status]
  return (
    <span style={{
      fontSize:     9,
      padding:      '2px 5px',
      borderRadius: 3,
      background:   c.bg,
      color:        c.color,
      border:       c.border,
      whiteSpace:   'nowrap',
    }}>
      {status}
    </span>
  )
}

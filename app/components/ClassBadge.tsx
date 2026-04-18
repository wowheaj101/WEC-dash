'use client'

import type { CarClass } from '@/app/types/race'

const CONFIG: Record<CarClass, { bg: string; color: string; border: string }> = {
  HYPERCAR: { bg: '#2a0000', color: '#ff4444', border: '0.5px solid #ff4444' },
  LMP2:     { bg: '#00002a', color: '#4488ff', border: '0.5px solid #4488ff' },
  LMGT3:    { bg: '#002200', color: '#44cc55', border: '0.5px solid #44cc55' },
}

export default function ClassBadge({ carClass }: { carClass: CarClass }) {
  const c = CONFIG[carClass]
  return (
    <span style={{
      fontSize:     8,
      fontWeight:   500,
      padding:      '2px 5px',
      borderRadius: 3,
      background:   c.bg,
      color:        c.color,
      border:       c.border,
      whiteSpace:   'nowrap',
      letterSpacing: 0.3,
    }}>
      {carClass}
    </span>
  )
}

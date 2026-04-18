'use client'

import type { Tire } from '@/app/types/race'

const CONFIG: Record<Tire, { bg: string; color: string }> = {
  S: { bg: '#cccc00', color: '#000' },
  M: { bg: '#ffffff', color: '#000' },
  H: { bg: '#ee4444', color: '#fff' },
  W: { bg: '#0044ee', color: '#fff' },
  I: { bg: '#00aa55', color: '#fff' },
}

export default function TireBadge({ tire }: { tire: Tire }) {
  const c = CONFIG[tire]
  return (
    <span style={{
      display:        'inline-flex',
      alignItems:     'center',
      justifyContent: 'center',
      width:          18,
      height:         18,
      borderRadius:   '50%',
      background:     c.bg,
      color:          c.color,
      fontSize:       8,
      fontWeight:     500,
      flexShrink:     0,
    }}>
      {tire}
    </span>
  )
}

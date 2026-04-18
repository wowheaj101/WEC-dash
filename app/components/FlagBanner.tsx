'use client'

import type { FlagStatus } from '@/app/types/race'

const CONFIG: Record<FlagStatus, { bg: string; border: string; color: string; text: string }> = {
  GREEN:  { bg: '#003300', border: '#00aa44', color: '#00ff66', text: '● GREEN FLAG — RACE RUNNING'       },
  YELLOW: { bg: '#2a1a00', border: '#cc8800', color: '#ffaa00', text: '● YELLOW FLAG — CAUTION'           },
  SC:     { bg: '#1a0e00', border: '#ff7700', color: '#ff9933', text: '● SAFETY CAR DEPLOYED'             },
  RED:    { bg: '#2a0000', border: '#cc0000', color: '#ff4444', text: '● RED FLAG — SESSION SUSPENDED'    },
}

export default function FlagBanner({ flag }: { flag: FlagStatus }) {
  const c = CONFIG[flag]
  return (
    <div style={{
      textAlign:     'center',
      padding:       '4px 12px',
      borderRadius:  6,
      fontSize:      11,
      letterSpacing: 2,
      fontWeight:    500,
      background:    c.bg,
      border:        `0.5px solid ${c.border}`,
      color:         c.color,
    }}>
      {c.text}
    </div>
  )
}

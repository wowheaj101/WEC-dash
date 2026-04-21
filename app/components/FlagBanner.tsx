'use client'

import { cn } from '@/app/lib/utils'
import type { FlagStatus } from '@/app/types/race'

const FLAG_CFG: Record<FlagStatus, {
  label:     string
  color:     string   // hsl var name — for dynamic bg/text
  sectorBar: string   // border color for sector cards
  sectorText:string   // sector card label color
}> = {
  GREEN:  { label: 'GREEN FLAG',  color: 'var(--flag-green)',  sectorBar: 'var(--flag-green)',  sectorText: 'var(--flag-green)' },
  YELLOW: { label: 'YELLOW',      color: 'var(--flag-yellow)', sectorBar: 'var(--flag-yellow)', sectorText: 'var(--flag-yellow)' },
  SC:     { label: 'SAFETY CAR',  color: 'var(--flag-sc)',     sectorBar: 'var(--flag-sc)',     sectorText: 'var(--flag-sc)' },
  RED:    { label: 'RED FLAG',    color: 'var(--flag-red)',    sectorBar: 'var(--flag-red)',    sectorText: 'var(--flag-red)' },
}

export default function FlagBanner({ flag }: { flag: FlagStatus }) {
  const cfg = FLAG_CFG[flag]
  // Static sector/meta display — filled by real data when available.
  const sectors = ['S1', 'S2', 'S3']
  return (
    <div className="flex items-center gap-3 px-6 py-3 bg-bg1 border-b border-line1">
      {/* Chevron flag tag */}
      <span
        className="disp chev-tag text-black"
        style={{
          background: `hsl(${cfg.color})`,
          padding: '5px 14px 5px 10px',
          clipPath: 'polygon(0 0, 100% 0, calc(100% - 10px) 100%, 0 100%)',
          letterSpacing: '1.5px',
          fontSize: 12,
        }}
      >
        <span className="w-2 h-2 bg-black shrink-0" style={{ borderRadius: 1 }} />
        {cfg.label}
      </span>

      {/* Sector cards */}
      <div className="flex gap-1.5 flex-1 min-w-0">
        {sectors.map((s) => (
          <div
            key={s}
            className="flex-1 min-w-0 px-3 py-1.5 flex items-center justify-between bg-bg2"
            style={{ borderLeft: `3px solid hsl(${cfg.sectorBar})` }}
          >
            <span
              className="disp font-bold tracking-[1.5px] text-[11px] uppercase truncate"
              style={{ color: `hsl(${cfg.sectorText})` }}
            >
              {s} · {flag === 'GREEN' ? 'CLEAR' : flag}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

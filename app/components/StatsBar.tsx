'use client'

import { cn } from '@/app/lib/utils'
import type { Stats } from '@/app/types/race'

interface CardProps {
  label:       string
  value:       React.ReactNode
  sub?:        React.ReactNode
  bar?:        string
  valueClass?: string
}

function StatCard({ label, value, sub, bar, valueClass }: CardProps) {
  return (
    <div
      className="flex flex-col gap-1 px-4 py-3 bg-bg1 border border-line1 min-w-0"
      style={bar ? { borderTop: `3px solid ${bar}` } : undefined}
    >
      <div className="section-label">{label}</div>
      <div className={cn('mono text-[22px] font-bold leading-none truncate', valueClass ?? 'text-fg0')}>
        {value}
      </div>
      {sub != null && (
        <div className="mono text-[10px] text-fg3 truncate">{sub}</div>
      )}
    </div>
  )
}

export default function StatsBar({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      <StatCard
        label="LEADER LAP"
        value={String(stats.leaderLap)}
        sub={`#${stats.fastestLap.carNum} LEADS`}
        bar="hsl(var(--accent))"
      />
      <StatCard
        label="TOTAL PITSTOPS"
        value={String(stats.totalPitstops)}
        sub="ALL CLASSES"
      />
      <StatCard
        label="FASTEST LAP"
        value={stats.fastestLap.time}
        sub={`#${stats.fastestLap.carNum} · ${stats.fastestLap.team}`}
        valueClass="text-fastest"
        bar="hsl(var(--fastest))"
      />
      <StatCard
        label="SAFETY CARS"
        value={`${stats.safetyCars}`}
        sub={stats.safetyCarlap ? `LAST · L${stats.safetyCarlap}` : '—'}
      />
    </div>
  )
}

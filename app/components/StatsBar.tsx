'use client'

import { cn } from '@/app/lib/utils'
import type { Stats, RaceInfo } from '@/app/types/race'

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
      className="flex flex-col gap-1.5 px-5 py-3.5 bg-bg1 border border-line1 min-w-0"
      style={bar ? { borderTop: `3px solid ${bar}` } : undefined}
    >
      <div className="section-label">{label}</div>
      <div className={cn(
        'mono text-[28px] font-bold leading-none truncate tabular-nums',
        valueClass ?? 'text-fg0',
      )}>
        {value}
      </div>
      {sub != null && (
        <div className="mono text-[11px] text-fg3 truncate">{sub}</div>
      )}
    </div>
  )
}

interface Props {
  stats:    Stats
  raceInfo: RaceInfo
}

export default function StatsBar({ stats, raceInfo }: Props) {
  const remainingIsValid = raceInfo.remaining && raceInfo.remaining !== '--'
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <StatCard
        label="TOTAL LAPS"
        value={String(stats.leaderLap)}
        sub="LEADER LAP COUNT"
        bar="hsl(var(--accent))"
      />
      <StatCard
        label="FASTEST LAP"
        value={stats.fastestLap.time}
        sub={stats.fastestLap.carNum
          ? `#${stats.fastestLap.carNum} · ${stats.fastestLap.team}`
          : '—'}
        valueClass="text-fastest"
        bar="hsl(var(--fastest))"
      />
      <StatCard
        label="TIME REMAINING"
        value={remainingIsValid ? raceInfo.remaining : '—'}
        sub={raceInfo.total ? `OF ${raceInfo.total}` : '—'}
        bar="hsl(var(--info))"
      />
    </div>
  )
}

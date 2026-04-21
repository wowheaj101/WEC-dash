'use client'

import { cn } from '@/app/lib/utils'
import type { Stats } from '@/app/types/race'

interface CardProps {
  label:       string
  value:       string
  sub?:        string
  valueClass?: string
  icon?:       string
}

function StatCard({ label, value, sub, valueClass, icon }: CardProps) {
  return (
    <div className="panel flex flex-col gap-1.5 px-4 py-3 flex-1 min-w-0">
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-[12px] leading-none">{icon}</span>}
        <span className="section-label">{label}</span>
      </div>
      <div className={cn('text-[18px] font-semibold tabular leading-none', valueClass ?? 'text-foreground')}>
        {value}
      </div>
      {sub && (
        <div className="text-[9px] text-muted-foreground truncate">{sub}</div>
      )}
    </div>
  )
}

export default function StatsBar({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      <StatCard
        icon="🏁"
        label="선두 랩"
        value={String(stats.leaderLap)}
        sub={`#${stats.fastestLap.carNum} 리더`}
      />
      <StatCard
        icon="🔧"
        label="총 피트스톱"
        value={String(stats.totalPitstops)}
        sub="전체 클래스 합산"
      />
      <StatCard
        icon="⚡"
        label="패스티스트 랩"
        value={stats.fastestLap.time}
        sub={`#${stats.fastestLap.carNum} ${stats.fastestLap.team}`}
        valueClass="text-[hsl(var(--fastest))]"
      />
      <StatCard
        icon="🚗"
        label="세이프티카"
        value={`${stats.safetyCars}회`}
        sub={stats.safetyCarlap ? `Lap ${stats.safetyCarlap}` : '—'}
      />
    </div>
  )
}

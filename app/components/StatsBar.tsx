'use client'

import type { Stats } from '@/app/types/race'

interface CardProps {
  label:      string
  value:      string
  sub?:       string
  valueColor?: string
}

function StatCard({ label, value, sub, valueColor }: CardProps) {
  return (
    <div style={{
      background:   '#141414',
      border:       '0.5px solid #2a2a2a',
      borderRadius: 8,
      padding:      '8px 10px',
      flex:         1,
      minWidth:     0,
    }}>
      <div style={{ fontSize: 9, color: '#666', textTransform: 'uppercase', letterSpacing: 1 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, color: valueColor ?? '#fff', fontWeight: 500, marginTop: 3 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 9, color: '#555', marginTop: 2 }}>{sub}</div>
      )}
    </div>
  )
}

export default function StatsBar({ stats }: { stats: Stats }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
      <StatCard
        label="선두 랩"
        value={String(stats.leaderLap)}
        sub={`#${stats.fastestLap.carNum} Cadillac`}
      />
      <StatCard
        label="총 피트스톱"
        value={String(stats.totalPitstops)}
        sub="전체 클래스 합산"
      />
      <StatCard
        label="패스티스트 랩"
        value={stats.fastestLap.time}
        sub={`#${stats.fastestLap.carNum} ${stats.fastestLap.team}`}
        valueColor="#cc44ff"
      />
      <StatCard
        label="세이프티카"
        value={`${stats.safetyCars}회`}
        sub={`Lap ${stats.safetyCarlap}`}
      />
    </div>
  )
}

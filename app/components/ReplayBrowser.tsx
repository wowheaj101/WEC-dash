'use client'

import { cn } from '@/app/lib/utils'
import { Badge } from '@/app/components/ui/badge'
import type { RaceMeta } from '@/app/types/replay'

interface Props {
  raceList:  RaceMeta[]
  loading:   boolean
  onSelect:  (meta: RaceMeta) => void
}

const DURATION_VARIANT: Record<string, 'warning' | 'info' | 'purple' | 'danger'> = {
  '~12h': 'warning',
  '6h':   'info',
  '8h':   'purple',
  '24h':  'danger',
}

export default function ReplayBrowser({ raceList, loading, onSelect }: Props) {
  if (loading) {
    return (
      <div className="py-10 text-center text-[12px] text-muted-foreground">
        레이스 목록 불러오는 중…
      </div>
    )
  }

  if (!raceList.length) {
    return (
      <div className="panel flex flex-col items-center justify-center gap-3 py-16 text-center">
        <span className="text-4xl">📼</span>
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          저장된 레이스가 없습니다.<br />
          라이브 레이스가 시작되면 자동으로 저장됩니다.
        </p>
      </div>
    )
  }

  const byYear: Record<number, RaceMeta[]> = {}
  for (const r of raceList) {
    ;(byYear[r.year] ??= []).push(r)
  }

  return (
    <div className="flex flex-col gap-5">
      {Object.entries(byYear)
        .sort(([a], [b]) => Number(b) - Number(a))
        .map(([year, races]) => (
          <div key={year}>
            <div className="section-label mb-2">{year} Season</div>
            <div className="flex flex-col gap-1">
              {races.sort((a, b) => a.round - b.round).map(race => (
                <button
                  key={race.id}
                  onClick={() => onSelect(race)}
                  className={cn(
                    'panel flex items-center gap-3 px-4 py-3 text-left w-full',
                    'transition-colors hover:bg-surface2 cursor-pointer'
                  )}
                >
                  <Badge variant="muted" className="text-[9px] shrink-0">R{race.round}</Badge>
                  <span className="text-base shrink-0">{race.countryFlag}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-foreground truncate">{race.name}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{race.circuit}</div>
                  </div>
                  <Badge variant={DURATION_VARIANT[race.duration] ?? 'default'}>
                    {race.duration}
                  </Badge>
                  <span className="text-[9px] text-muted-foreground shrink-0">{race.snapshots} snaps</span>
                  <span className="text-[9px] text-muted-foreground shrink-0">{race.date}</span>
                  <span className="text-border text-[12px] shrink-0">›</span>
                </button>
              ))}
            </div>
          </div>
        ))}
    </div>
  )
}

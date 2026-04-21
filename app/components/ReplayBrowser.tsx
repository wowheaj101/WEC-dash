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
      <div className="py-10 text-center text-[12px] text-fg3">
        레이스 목록 불러오는 중…
      </div>
    )
  }

  if (!raceList.length) {
    return (
      <div className="panel flex flex-col items-center justify-center gap-3 py-16 text-center">
        <span className="text-4xl">📼</span>
        <p className="text-[12px] text-fg3 leading-relaxed">
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
    <div className="panel flex flex-col overflow-hidden">
      <div className="panel-header">
        RACE ARCHIVE
        <span className="ml-auto mono text-[10px] text-fg3 font-normal tracking-[1px]">
          {raceList.length} RACES
        </span>
      </div>
      <div className="flex flex-col p-4 gap-6">
        {Object.entries(byYear)
          .sort(([a], [b]) => Number(b) - Number(a))
          .map(([year, races]) => (
            <div key={year}>
              <div className="section-label mb-2.5">{year} SEASON</div>
              <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))' }}>
                {races.sort((a, b) => a.round - b.round).map(race => (
                  <button
                    key={race.id}
                    onClick={() => onSelect(race)}
                    className={cn(
                      'flex items-stretch bg-bg2 border border-line1 text-left',
                      'transition-colors hover:bg-bg3 cursor-pointer overflow-hidden',
                    )}
                  >
                    <div className="w-[110px] bg-gradient-to-br from-hypercar/10 to-transparent flex items-center justify-center text-4xl shrink-0">
                      {race.countryFlag}
                    </div>
                    <div className="flex-1 px-4 py-3 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="disp text-[10px] tracking-[1.8px] text-fg3 uppercase">
                            {race.year} · ROUND {race.round}
                          </div>
                          <div className="disp text-[18px] font-bold text-fg0 leading-tight mt-1 truncate">
                            {race.name}
                          </div>
                        </div>
                        <Badge variant={DURATION_VARIANT[race.duration] ?? 'default'} className="shrink-0">
                          {race.duration}
                        </Badge>
                      </div>
                      <div className="flex gap-5 mt-3">
                        <div>
                          <div className="disp text-[9px] tracking-[1.5px] text-fg4 uppercase">SNAPSHOTS</div>
                          <div className="mono text-[12px] text-fg0">{race.snapshots}</div>
                        </div>
                        <div>
                          <div className="disp text-[9px] tracking-[1.5px] text-fg4 uppercase">DATE</div>
                          <div className="mono text-[12px] text-fg0">{race.date}</div>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}

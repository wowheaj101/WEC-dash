'use client'

import { useState } from 'react'
import type { Car, CarClass } from '@/app/types/race'
import LeaderboardRow from './LeaderboardRow'
import { cn } from '@/app/lib/utils'

type Filter = 'ALL' | 'HC' | 'P2' | 'GT3'
const FILTERS: Filter[] = ['ALL', 'HC', 'P2', 'GT3']

const FILTER_MATCH: Record<Exclude<Filter, 'ALL'>, CarClass> = {
  HC:  'HYPERCAR',
  P2:  'LMP2',
  GT3: 'LMGT3',
}

export default function Leaderboard({ cars }: { cars: Car[] }) {
  const [filter, setFilter] = useState<Filter>('ALL')

  const filtered = filter === 'ALL'
    ? cars
    : cars.filter(c => c.carClass === FILTER_MATCH[filter])

  const classBorderNums = new Set<string>()
  filtered.forEach((car, i) => {
    if (i > 0 && car.carClass !== filtered[i - 1].carClass) {
      classBorderNums.add(car.carNumStr)
    }
  })

  const leaderLap = cars.length > 0 ? cars[0].laps : 0

  return (
    <div className="panel flex flex-col min-h-0 overflow-hidden">
      <div className="panel-header">
        <span>
          CLASSIFICATION
          <span className="text-fg3 font-normal tracking-[1px] ml-1.5">· LAP {leaderLap}</span>
        </span>
        <div className="ml-auto flex gap-1">
          {FILTERS.map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={cn('btn-ghost', filter === t && 'on')}
              style={{ padding: '3px 10px' }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto flex-1 min-h-0">
        <div className="flex flex-col p-2 min-w-[820px]">
          {filtered.map(car => (
            <LeaderboardRow
              key={car.carNumStr}
              car={car}
              isClassBorder={classBorderNums.has(car.carNumStr)}
            />
          ))}
          {filtered.length === 0 && (
            <div className="py-10 text-center text-[11px] text-fg3">
              해당 클래스 데이터가 없습니다
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

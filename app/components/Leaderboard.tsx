'use client'

import type { Car, CarClass } from '@/app/types/race'
import LeaderboardRow from './LeaderboardRow'

const CLASS_ORDER: CarClass[] = ['HYPERCAR', 'LMP2', 'LMGT3']
const CLASS_LABELS: Record<CarClass, string> = {
  HYPERCAR: 'HYPERCAR',
  LMP2: 'LMP2',
  LMGT3: 'LM GT3',
}

export default function Leaderboard({ cars }: { cars: Car[] }) {
  const leaderLap = cars.length > 0 ? cars[0].laps : 0

  // Group cars by class, sorted by class position
  const carsByClass: Record<CarClass, Car[]> = {
    HYPERCAR: [],
    LMP2: [],
    LMGT3: [],
  }

  cars.forEach(car => {
    carsByClass[car.carClass].push(car)
  })

  // Sort each class by class position
  Object.keys(carsByClass).forEach(key => {
    carsByClass[key as CarClass].sort((a, b) => a.clsPos - b.clsPos)
  })

  return (
    <div className="panel flex flex-col min-h-0 overflow-hidden">
      <div className="panel-header">
        <span>
          CLASSIFICATION
          <span className="text-fg3 font-normal tracking-[1px] ml-1.5">· LAP {leaderLap}</span>
        </span>
      </div>

      <div className="overflow-x-auto flex-1 min-h-0">
        <div className="flex flex-col p-2 min-w-[820px]">
          {CLASS_ORDER.map(carClass => {
            const classJobs = carsByClass[carClass]
            if (classJobs.length === 0) return null

            return (
              <div key={carClass} className="mb-3">
                {/* Class section header */}
                <div className="text-[10px] font-bold tracking-[2px] uppercase text-fg3 px-2 py-1.5 mb-1">
                  {CLASS_LABELS[carClass]}
                </div>

                {/* Class rows */}
                {classJobs.map((car, idx) => (
                  <LeaderboardRow
                    key={car.carNumStr}
                    car={car}
                    isClassBorder={idx > 0}
                  />
                ))}
              </div>
            )
          })}

          {cars.length === 0 && (
            <div className="py-10 text-center text-[11px] text-fg3">
              데이터 대기 중...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

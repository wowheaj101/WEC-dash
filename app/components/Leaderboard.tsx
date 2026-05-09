'use client'

import type { Car, CarClass } from '@/app/types/race'
import type { ConnStatus } from '@/app/hooks/useTiming71'
import LeaderboardRow from './LeaderboardRow'

const CLASS_ORDER: CarClass[] = ['HYPERCAR', 'LMP2', 'LMGT3']
const CLASS_LABELS: Record<CarClass, string> = {
  HYPERCAR: 'HYPERCAR',
  LMP2: 'LMP2',
  LMGT3: 'LM GT3',
}

const SKELETON_ROWS_PER_CLASS = 4

const STATUS_TEXT: Record<ConnStatus, string> = {
  idle:             '초기화 중...',
  connecting:       'WEC 서버 검색 중...',
  discovering:      'SignalR 핸드셰이크 중...',
  connected:        '채널 가입 중...',
  live:             '데이터 수신 대기 중...',
  no_service:       '진행 중인 라이브 세션 없음',
  showing_previous: '이전 라운드 스냅샷 로딩...',
  disconnected:     '재연결 중...',
  error:            '연결 오류 — 재시도 중',
}

function LeaderboardSkeleton({ status }: { status: ConnStatus }) {
  const statusText = STATUS_TEXT[status] ?? '대기 중...'

  return (
    <div className="flex flex-col gap-3 px-2 pb-3">
      {(['HYPERCAR', 'LMP2', 'LMGT3'] as const).map(cls => (
        <div key={cls}>
          <div className="text-[10px] font-bold tracking-[2px] uppercase text-fg4 px-2 py-1.5 mb-1">
            {cls === 'LMGT3' ? 'LM GT3' : cls}
          </div>
          {Array.from({ length: SKELETON_ROWS_PER_CLASS }).map((_, i) => (
            <div
              key={i}
              className="h-[44px] mb-[3px] rounded-sm animate-pulse"
              style={{
                background: 'hsl(var(--bg-2))',
                border: '1px solid hsl(var(--line-1))',
                opacity: 0.6 - i * 0.1,
              }}
            />
          ))}
        </div>
      ))}
      <div className="text-center text-[10px] text-fg3 mono pt-1 flex items-center justify-center gap-2">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-warning dot-blink" />
        {statusText}
      </div>
    </div>
  )
}

interface LeaderboardProps {
  cars:    Car[]
  status?: ConnStatus
}

export default function Leaderboard({ cars, status = 'idle' }: LeaderboardProps) {
  const leaderLap = cars.length > 0 ? cars[0].laps : 0

  // Group cars by class, sorted by class position
  const carsByClass: Record<CarClass, Car[]> = {
    HYPERCAR: [],
    LMP2: [],
    LMGT3: [],
  }
  cars.forEach(car => carsByClass[car.carClass].push(car))
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
                <div className="text-[10px] font-bold tracking-[2px] uppercase text-fg3 px-2 py-1.5 mb-1">
                  {CLASS_LABELS[carClass]}
                </div>

                {classJobs.map(car => (
                  <LeaderboardRow key={car.carNumStr} car={car} />
                ))}
              </div>
            )
          })}

          {cars.length === 0 && <LeaderboardSkeleton status={status} />}
        </div>
      </div>
    </div>
  )
}

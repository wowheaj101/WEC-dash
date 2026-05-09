'use client'

import { useEffect, useRef, useState } from 'react'
import type { Car } from '@/app/types/race'
import type { ConnStatus } from '@/app/hooks/useTiming71'
import LeaderboardRow, { LB_GRID_COLS, LB_MIN_WIDTH } from './LeaderboardRow'

const DELTA_DISPLAY_MS = 8000

const SKELETON_ROWS = 12

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

function HeaderRow() {
  return (
    <div
      className="grid items-center text-[9px] tracking-[1.5px] uppercase text-fg3 font-bold border-b border-line2 bg-bg1 sticky top-0 z-10"
      style={{ gridTemplateColumns: LB_GRID_COLS, minWidth: LB_MIN_WIDTH, height: 32 }}
    >
      <div className="text-center">Pos</div>
      <div className="text-center">+/-</div>
      <div className="text-center">Class</div>
      <div className="pl-2">Team</div>
      <div className="pl-2">Driver</div>
      <div className="pl-2">Car</div>
      <div className="text-right pr-2">Interval</div>
      <div className="text-right pr-2">Gap</div>
      <div className="text-right pr-2">S1</div>
      <div className="text-right pr-2">S2</div>
      <div className="text-right pr-2">S3</div>
      <div className="text-right pr-2">Last Lap</div>
      <div className="text-right pr-2">Best Lap</div>
      <div className="text-center">Laps</div>
      <div className="text-center">Pits</div>
      <div className="text-center">Status</div>
    </div>
  )
}

function LeaderboardSkeleton({ status }: { status: ConnStatus }) {
  const statusText = STATUS_TEXT[status] ?? '대기 중...'

  return (
    <>
      {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
        <div
          key={i}
          className="h-[32px] mb-[2px] rounded-sm animate-pulse"
          style={{
            background: 'hsl(var(--bg-2))',
            border: '1px solid hsl(var(--line-1))',
            opacity: 0.7 - i * 0.04,
            minWidth: LB_MIN_WIDTH,
          }}
        />
      ))}
      <div className="text-center text-[10px] text-fg3 mono pt-2 flex items-center justify-center gap-2">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-warning dot-blink" />
        {statusText}
      </div>
    </>
  )
}

interface PositionMemory {
  pos: number
}

interface LeaderboardProps {
  cars:    Car[]
  status?: ConnStatus
}

export default function Leaderboard({ cars, status = 'idle' }: LeaderboardProps) {
  const leaderLap = cars.length > 0 ? cars[0].laps : 0

  // Sort by overall position (single list, no class grouping)
  const sortedCars = [...cars].sort((a, b) => a.pos - b.pos)

  // ── Position change detection ─────────────────────────────────────
  const prevPosRef = useRef<Map<string, PositionMemory>>(new Map())
  const deltaTimestampRef = useRef<Map<string, { delta: number; ts: number }>>(new Map())

  const now = Date.now()
  const activeDeltas = new Map<string, number>()

  cars.forEach(car => {
    const prev = prevPosRef.current.get(car.carNumStr)
    if (prev && prev.pos !== car.pos) {
      const delta = prev.pos - car.pos  // positive = improved
      deltaTimestampRef.current.set(car.carNumStr, { delta, ts: now })
    }
    prevPosRef.current.set(car.carNumStr, { pos: car.pos })
  })

  deltaTimestampRef.current.forEach((entry, carNumStr) => {
    if (now - entry.ts < DELTA_DISPLAY_MS) {
      activeDeltas.set(carNumStr, entry.delta)
    } else {
      deltaTimestampRef.current.delete(carNumStr)
    }
  })

  const [, setTick] = useState(0)
  useEffect(() => {
    if (deltaTimestampRef.current.size === 0) return
    const timer = setTimeout(() => setTick(t => t + 1), DELTA_DISPLAY_MS + 100)
    return () => clearTimeout(timer)
  })

  return (
    <div className="panel flex flex-col min-h-0 overflow-hidden">
      <div className="panel-header">
        <span>
          CLASSIFICATION
          <span className="text-fg3 font-normal tracking-[1px] ml-1.5">· LAP {leaderLap}</span>
        </span>
        <span className="ml-auto mono text-[10px] text-fg3">{cars.length} CARS</span>
      </div>

      <div className="overflow-x-auto flex-1 min-h-0">
        <div className="flex flex-col">
          <HeaderRow />
          <div className="flex flex-col p-1.5">
            {sortedCars.map(car => (
              <LeaderboardRow
                key={car.carNumStr}
                car={car}
                deltaPos={activeDeltas.get(car.carNumStr) ?? 0}
              />
            ))}

            {cars.length === 0 && <LeaderboardSkeleton status={status} />}
          </div>
        </div>
      </div>
    </div>
  )
}

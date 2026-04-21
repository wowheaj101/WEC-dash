'use client'

import type { CarStint, Tire } from '@/app/types/race'

const CLASS_COLOR: Record<string, string> = {
  HYPERCAR: 'hsl(var(--hypercar))',
  LMP2:     'hsl(var(--lmp2))',
  LMGT3:    'hsl(var(--lmgt3))',
}

const TIRE_COLOR: Record<Tire, { bg: string; text: string }> = {
  S: { bg: '#ffd400',  text: '#000' },
  M: { bg: '#f5f5f7',  text: '#000' },
  H: { bg: '#ff2e2e',  text: '#fff' },
  W: { bg: '#3a8cff',  text: '#fff' },
  I: { bg: '#27d36b',  text: '#000' },
}

const TIRE_LABEL: Record<Tire, string> = {
  S: 'Soft', M: 'Medium', H: 'Hard', W: 'Wet', I: 'Inter',
}

interface Props {
  carStints: CarStint[]
  totalLaps: number
}

export default function StintTimeline({ carStints, totalLaps }: Props) {
  const safeLaps = Math.max(totalLaps, 1)
  const lapTicks = Array.from({ length: Math.floor(safeLaps / 10) + 1 }, (_, i) => i * 10)
    .filter(l => l <= safeLaps)

  return (
    <div className="panel flex flex-col overflow-hidden">
      <div className="panel-header">
        STINT TIMELINE
        <span className="ml-auto mono text-[10px] text-fg3 font-normal tracking-[1px]">
          LAP 0 — {safeLaps}
        </span>
      </div>

      <div className="p-4 overflow-x-auto">
        <div style={{ minWidth: 620 }}>
          {/* Lap ruler */}
          <div className="relative h-4 mb-2" style={{ marginLeft: 140 }}>
            {lapTicks.map(lap => (
              <div
                key={lap}
                className="absolute mono text-[9px] text-fg4 pl-1 pt-0.5 border-l border-line1"
                style={{ left: `${(lap / safeLaps) * 100}%` }}
              >
                {lap}
              </div>
            ))}
            <div className="absolute right-0 mono text-[9px] text-fg4 pt-0.5">{safeLaps}</div>
          </div>

          {/* Car rows */}
          <div className="flex flex-col gap-1">
            {carStints.map(car => {
              const clsColor = CLASS_COLOR[car.carClass]
              return (
                <div key={car.carNum} className="flex items-center">
                  {/* Label */}
                  <div className="flex items-center gap-2 pr-3" style={{ width: 140, flexShrink: 0 }}>
                    <span className="disp text-[16px] font-bold text-fg0 text-right" style={{ minWidth: 28 }}>
                      {car.carNum}
                    </span>
                    <div className="min-w-0">
                      <div className="disp text-[9px] font-bold tracking-[1.2px]" style={{ color: clsColor }}>
                        {car.carClass}
                      </div>
                      <div className="mono text-[9px] text-fg4 truncate" style={{ maxWidth: 94 }}>
                        {car.team.split(' ').slice(0, 2).join(' ')}
                      </div>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="flex-1 h-[24px] bg-bg0 relative overflow-hidden border border-line1">
                    {/* Lap grid lines */}
                    {lapTicks.filter(l => l > 0).map(lap => (
                      <div
                        key={lap}
                        className="absolute top-0 bottom-0 bg-line1"
                        style={{ left: `${(lap / safeLaps) * 100}%`, width: '1px' }}
                      />
                    ))}

                    {/* Stint blocks */}
                    {car.stints.map((stint, i) => {
                      const start     = ((stint.startLap - 1) / safeLaps) * 100
                      const end       = stint.endLap !== null
                        ? (stint.endLap / safeLaps) * 100
                        : 100
                      const width     = Math.max(end - start, 0.5)
                      const isRunning = stint.endLap === null
                      const tc        = TIRE_COLOR[stint.tire]
                      const title     = [
                        `${stint.tire} (${TIRE_LABEL[stint.tire]})`,
                        `Laps ${stint.startLap}–${stint.endLap ?? '...'}`,
                        stint.avgLap ? `avg ${stint.avgLap}` : '',
                      ].filter(Boolean).join(' — ')

                      return (
                        <div
                          key={i}
                          title={title}
                          className="absolute flex items-center justify-center overflow-hidden disp font-bold"
                          style={{
                            left:     `${start}%`,
                            width:    `${width}%`,
                            top:      1,
                            bottom:   1,
                            background: isRunning
                              ? `repeating-linear-gradient(90deg,${tc.bg} 0px,${tc.bg} 10px,${tc.bg}99 10px,${tc.bg}99 12px)`
                              : tc.bg,
                            color: tc.text,
                            fontSize: 10,
                          }}
                        >
                          {width > 4 && <span>{stint.tire}·{(stint.endLap ?? safeLaps) - stint.startLap + 1}L</span>}
                        </div>
                      )
                    })}

                    {/* Pit stop markers */}
                    {car.stints.slice(0, -1).map((stint, i) => {
                      if (stint.endLap === null) return null
                      const pos = (stint.endLap / safeLaps) * 100
                      return (
                        <div
                          key={`pit-${i}`}
                          title={`Pit — ${stint.pitDuration}s`}
                          className="absolute top-0 bottom-0 bg-pit z-10"
                          style={{ left: `${pos}%`, width: 2 }}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-3 mt-4 text-[10px] text-fg3 flex-wrap items-center">
            {(['S','M','H','W','I'] as Tire[]).map(t => {
              const tc = TIRE_COLOR[t]
              return (
                <span key={t} className="flex items-center gap-1.5">
                  <span
                    className="inline-flex items-center justify-center font-bold"
                    style={{ width: 16, height: 12, background: tc.bg, color: tc.text, fontSize: 8 }}
                  >
                    {t}
                  </span>
                  <span className="disp tracking-[1px] uppercase">{TIRE_LABEL[t]}</span>
                </span>
              )
            })}
            <span className="flex items-center gap-1.5">
              <span className="inline-block bg-pit" style={{ width: 2, height: 12 }} />
              <span className="disp tracking-[1px] uppercase">PIT</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

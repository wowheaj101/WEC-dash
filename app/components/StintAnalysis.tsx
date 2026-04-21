'use client'

import type { CarStint } from '@/app/types/race'
import StintTimeline from './StintTimeline'

const CLASS_COLOR: Record<string, string> = {
  HYPERCAR: 'hsl(var(--hypercar))',
  LMP2:     'hsl(var(--lmp2))',
  LMGT3:    'hsl(var(--lmgt3))',
}

function pitColor(duration: string): string {
  const sec = parseFloat(duration)
  if (sec > 30) return 'hsl(var(--danger))'
  if (sec > 24) return 'hsl(var(--pit))'
  return 'hsl(var(--live))'
}

function pitLabel(duration: string): string | null {
  const sec = parseFloat(duration)
  if (sec > 30) return 'ANOMALY'
  if (sec > 24) return 'DRIVER CHANGE'
  return null
}

interface PitStop {
  carNum:   number
  carClass: string
  lap:      number
  stint:    number
  duration: string
}

function collectPitStops(carStints: CarStint[]): PitStop[] {
  const result: PitStop[] = []
  carStints.forEach(car => {
    car.stints.forEach((stint, i) => {
      if (stint.pitDuration && stint.endLap !== null) {
        result.push({
          carNum:   car.carNum,
          carClass: car.carClass,
          lap:      stint.endLap,
          stint:    i + 1,
          duration: stint.pitDuration,
        })
      }
    })
  })
  return result.sort((a, b) => b.lap - a.lap)
}

interface Props {
  carStints: CarStint[]
  totalLaps: number
}

export default function StintAnalysis({ carStints, totalLaps }: Props) {
  const pitStops = collectPitStops(carStints)

  return (
    <div className="flex flex-col gap-3">
      <StintTimeline carStints={carStints} totalLaps={totalLaps} />

      {/* Pit stop table */}
      <div className="panel flex flex-col overflow-hidden">
        <div className="panel-header">PIT STOP DURATIONS</div>

        <div
          className="disp grid px-4 py-2 border-b border-line2 bg-bg2"
          style={{
            gridTemplateColumns: '44px 86px 68px 60px 1fr',
            fontSize: 10,
            letterSpacing: 1.5,
            fontWeight: 700,
            color: 'hsl(var(--fg-3))',
          }}
        >
          {['CAR','CLASS','LAP','STINT','DURATION'].map(h => (
            <span key={h}>{h}</span>
          ))}
        </div>

        {pitStops.length === 0 ? (
          <div className="py-8 text-center text-[11px] text-fg3">NO PIT STOP DATA</div>
        ) : (
          pitStops.map((p, i) => {
            const label = pitLabel(p.duration)
            const labelIsDanger = parseFloat(p.duration) > 30
            return (
              <div
                key={i}
                className="grid px-4 py-2 border-b border-line1 items-center"
                style={{ gridTemplateColumns: '44px 86px 68px 60px 1fr' }}
              >
                <span className="disp text-[14px] font-bold" style={{ color: CLASS_COLOR[p.carClass] }}>
                  {p.carNum}
                </span>
                <span className="disp text-[10px] font-bold tracking-[1.5px]" style={{ color: CLASS_COLOR[p.carClass] }}>
                  {p.carClass}
                </span>
                <span className="mono text-[11px] text-fg2">L{p.lap}</span>
                <span className="mono text-[11px] text-fg3">#{p.stint}</span>
                <div className="flex items-center gap-2.5">
                  <span className="mono text-[14px] font-bold" style={{ color: pitColor(p.duration) }}>
                    {p.duration}s
                  </span>
                  {label && (
                    <span
                      className="disp text-[9px] font-bold tracking-[1px] px-1.5 py-0.5"
                      style={{
                        color:      labelIsDanger ? 'hsl(var(--danger))' : 'hsl(var(--pit))',
                        background: labelIsDanger ? 'hsl(var(--danger-bg))' : 'hsl(var(--pit-bg))',
                        border: `1px solid ${labelIsDanger ? 'hsl(var(--danger-border))' : 'hsl(var(--pit-border))'}`,
                      }}
                    >
                      {label}
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="flex gap-5 text-[10px] text-fg3 mono px-1 flex-wrap">
        <span className="text-live">■ NORMAL (~22s)</span>
        <span className="text-pit">■ DRIVER CHANGE (~25s)</span>
        <span className="text-danger">■ ANOMALY (30s+)</span>
      </div>
    </div>
  )
}

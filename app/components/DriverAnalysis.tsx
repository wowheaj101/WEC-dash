'use client'

import type { DriverStat } from '@/app/types/race'
import ClassBadge from './ClassBadge'
import { cn } from '@/app/lib/utils'

const CLASS_COLOR: Record<string, string> = {
  HYPERCAR: 'hsl(var(--hypercar))',
  LMP2:     'hsl(var(--lmp2))',
  LMGT3:    'hsl(var(--lmgt3))',
}

function toSec(t: string): number {
  const [h, m, s] = t.split(':').map(Number)
  return h * 3600 + m * 60 + s
}

interface Props {
  driverStats: DriverStat[]
}

export default function DriverAnalysis({ driverStats }: Props) {
  const MAX_SEC = 14400  // 4 hours
  const MIN_SEC = 3600   // 1 hour

  if (!driverStats.length) {
    return (
      <div className="panel py-10 text-center text-[11px] text-fg3">
        NO DRIVER DATA
      </div>
    )
  }

  const sbS1 = driverStats.reduce((a, b) => a.s1 < b.s1 ? a : b)
  const sbS2 = driverStats.reduce((a, b) => a.s2 < b.s2 ? a : b)
  const sbS3 = driverStats.reduce((a, b) => a.s3 < b.s3 ? a : b)

  return (
    <div className="flex flex-col gap-3">
      {/* Sector best cards */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label:'SECTOR 1 BEST', time:sbS1.s1, carNum:sbS1.carNumStr, team:sbS1.team },
          { label:'SECTOR 2 BEST', time:sbS2.s2, carNum:sbS2.carNumStr, team:sbS2.team },
          { label:'SECTOR 3 BEST', time:sbS3.s3, carNum:sbS3.carNumStr, team:sbS3.team },
        ].map(({ label, time, carNum, team }) => (
          <div
            key={label}
            className="bg-bg1 border border-line1 px-4 py-3"
            style={{ borderTop: '3px solid hsl(var(--fastest))' }}
          >
            <div className="section-label">{label}</div>
            <div className="mono text-[22px] font-bold text-fastest leading-none mt-1.5">{time}</div>
            <div className="mono text-[10px] text-fg3 mt-1">#{carNum} · {team}</div>
          </div>
        ))}
      </div>

      {/* Table + time bars */}
      <div className="flex gap-3 flex-wrap items-stretch">
        {/* Best lap table */}
        <div className="panel flex-[2] min-w-[420px] flex flex-col">
          <div className="panel-header">DRIVER RANKINGS</div>
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              <div
                className="disp grid px-4 py-2.5 border-b border-line2 bg-bg2"
                style={{
                  gridTemplateColumns: '44px 80px minmax(140px,1fr) 90px 70px 70px 70px 90px',
                  fontSize: 10,
                  letterSpacing: 1.5,
                  color: 'hsl(var(--fg-3))',
                  fontWeight: 700,
                }}
              >
                {['CAR','CLASS','DRIVER','BEST','S1','S2','S3','TOTAL'].map((h, i) => (
                  <span key={h} style={{ textAlign: i >= 3 ? 'right' : 'left' }}>{h}</span>
                ))}
              </div>
              {driverStats.map((d, i) => {
                const prevClass    = i > 0 ? driverStats[i - 1].carClass : null
                const isClassBorder = prevClass !== null && d.carClass !== prevClass
                return (
                  <div
                    key={d.carNumStr}
                    className={cn(
                      'grid px-4 py-2.5 border-b border-line1 items-center',
                      isClassBorder && 'border-t-2 border-t-line3',
                    )}
                    style={{ gridTemplateColumns: '44px 80px minmax(140px,1fr) 90px 70px 70px 70px 90px' }}
                  >
                    <span className="disp text-[16px] font-bold text-fg0">{d.carNumStr}</span>
                    <ClassBadge carClass={d.carClass} size={9} />
                    <div className="min-w-0">
                      <div className="text-[12px] text-fg0 truncate">{d.driver}</div>
                      <div className="mono text-[10px] text-fg3 truncate">{d.team}</div>
                    </div>
                    <span className={cn('mono text-right text-[13px] font-bold', d.isSessionBest ? 'text-fastest' : 'text-fg0')}>
                      {d.bestLap}
                    </span>
                    <span className={cn('mono text-right text-[11px]', d.s1 === sbS1.s1 ? 'text-fastest' : 'text-fg2')}>{d.s1}</span>
                    <span className={cn('mono text-right text-[11px]', d.s2 === sbS2.s2 ? 'text-fastest' : 'text-fg2')}>{d.s2}</span>
                    <span className={cn('mono text-right text-[11px]', d.s3 === sbS3.s3 ? 'text-fastest' : 'text-fg2')}>{d.s3}</span>
                    <span className="mono text-right text-[11px] text-fg3">{d.totalTime}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Driving time bar chart */}
        <div className="panel flex-1 min-w-[240px] flex flex-col">
          <div className="panel-header">DRIVING TIME</div>
          <div className="p-4">
            <div className="mono text-[10px] text-fg3 mb-3">
              WEC RULE · MIN 1h / MAX 4h (solo driver)
            </div>
            <div className="flex flex-col gap-1.5">
              {driverStats.map(d => {
                const sec    = toSec(d.totalTime)
                const barPct = (sec / MAX_SEC) * 100
                const tooMuch = sec > MAX_SEC
                const tooFew  = sec < MIN_SEC
                const color   = tooMuch ? 'hsl(var(--danger))' : CLASS_COLOR[d.carClass]
                return (
                  <div key={d.carNumStr} className="flex items-center gap-2">
                    <span className="disp text-[11px] text-fg2 w-7 text-right font-semibold">{d.carNumStr}</span>
                    <div className="flex-1 h-3 bg-bg0 relative border border-line1">
                      <div
                        className="absolute top-0 bottom-0 w-px bg-line3 z-10"
                        style={{ left: `${(MIN_SEC / MAX_SEC) * 100}%` }}
                      />
                      <div
                        style={{
                          width: `${Math.min(barPct, 100)}%`,
                          height: '100%',
                          background: color,
                          opacity: tooFew ? 0.4 : 0.85,
                        }}
                      />
                    </div>
                    <span className="mono text-[10px] text-fg3 w-12 text-right">{d.totalTime.slice(0, 5)}</span>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-4 mt-4 text-[10px] text-fg4 flex-wrap mono">
              <span>│ 1h THRESHOLD</span>
              <span className="text-danger">■ &gt; 4h</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

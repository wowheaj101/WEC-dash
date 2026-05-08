'use client'

import { useMemo } from 'react'
import type { CarClass, DriverStat, LapHistoryEntry } from '@/app/types/race'
import ClassBadge from './ClassBadge'
import LapTimeChart from './LapTimeChart'
import { cn } from '@/app/lib/utils'

const CLASS_COLOR: Record<CarClass, string> = {
  HYPERCAR: 'hsl(var(--hypercar))',
  LMP2:     'hsl(var(--lmp2))',
  LMGT3:    'hsl(var(--lmgt3))',
}

const CLASS_ORDER: CarClass[] = ['HYPERCAR', 'LMP2', 'LMGT3']

const CLASS_LABEL: Record<CarClass, string> = {
  HYPERCAR: 'HYPERCAR',
  LMP2:     'LMP2',
  LMGT3:    'LMGT3',
}

interface Props {
  driverStats: DriverStat[]
  lapHistory?: Record<string, LapHistoryEntry[]>
}

function formatGap(ms: number | null): string {
  if (ms === null) return '—'
  if (ms < 1)      return '0.000'
  return `+${(ms / 1000).toFixed(3)}`
}

export default function DriverAnalysis({ driverStats, lapHistory = {} }: Props) {
  // Sort: class order, then best lap ascending. Cars without bestLapMs sink to the bottom.
  const sorted = useMemo(() => {
    const arr = [...driverStats]
    return arr.sort((a, b) => {
      const ca = CLASS_ORDER.indexOf(a.carClass)
      const cb = CLASS_ORDER.indexOf(b.carClass)
      if (ca !== cb) return ca - cb
      const aMs = a.bestLapMs ?? Infinity
      const bMs = b.bestLapMs ?? Infinity
      return aMs - bMs
    })
  }, [driverStats])

  // Per-class POTENTIAL — best optimal lap in each class
  const potentialByClass = useMemo(() => {
    const out: Partial<Record<CarClass, DriverStat>> = {}
    for (const d of driverStats) {
      if (!d.optimalLapMs) continue
      const cur = out[d.carClass]
      if (!cur || (cur.optimalLapMs ?? Infinity) > d.optimalLapMs) out[d.carClass] = d
    }
    return out
  }, [driverStats])

  // Largest gap-to-optimal (worst pace use) for the BEST vs OPTIMAL bar chart scale
  const maxGapMs = useMemo(() => {
    let max = 0
    for (const d of driverStats) {
      if (d.gapToOptimalMs !== null && d.gapToOptimalMs > max) max = d.gapToOptimalMs
    }
    return max
  }, [driverStats])

  if (!driverStats.length) {
    return (
      <div className="panel py-10 text-center text-[11px] text-fg3">
        NO DRIVER DATA
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Class POTENTIAL cards */}
      <div className="grid grid-cols-3 gap-2">
        {CLASS_ORDER.map(cls => {
          const d = potentialByClass[cls]
          return (
            <div
              key={cls}
              className="bg-bg1 border border-line1 px-4 py-3"
              style={{ borderTop: `3px solid ${CLASS_COLOR[cls]}` }}
            >
              <div className="flex items-center justify-between">
                <span className="section-label">{CLASS_LABEL[cls]} · POTENTIAL</span>
                <span className="mono text-[9px] text-fg4">OPTIMAL LAP</span>
              </div>
              {d ? (
                <>
                  <div className="mono text-[22px] font-bold text-fastest leading-none mt-1.5">
                    {d.optimalLap}
                  </div>
                  <div className="mono text-[10px] text-fg3 mt-1 truncate">
                    #{d.carNumStr} · {d.team} · best {d.bestLap} ({formatGap(d.gapToOptimalMs)})
                  </div>
                </>
              ) : (
                <div className="mono text-[14px] text-fg4 mt-2">—</div>
              )}
            </div>
          )
        })}
      </div>

      {/* Table + gap chart */}
      <div className="flex gap-3 flex-wrap items-stretch">
        {/* Driver rankings table */}
        <div className="panel flex-[2] min-w-[480px] flex flex-col">
          <div className="panel-header">DRIVER RANKINGS</div>
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div
                className="disp grid px-4 py-2.5 border-b border-line2 bg-bg2"
                style={{
                  gridTemplateColumns: '40px 70px minmax(120px,1fr) 84px 84px 60px 56px 56px 56px',
                  fontSize: 10,
                  letterSpacing: 1.5,
                  color: 'hsl(var(--fg3))',
                  fontWeight: 700,
                }}
              >
                {['CAR','CLASS','DRIVER','BEST','OPTIMAL','Δ','S1','S2','S3'].map((h, i) => (
                  <span key={h} style={{ textAlign: i >= 3 ? 'right' : 'left' }}>{h}</span>
                ))}
              </div>
              {sorted.map((d, i) => {
                const prevClass     = i > 0 ? sorted[i - 1].carClass : null
                const isClassBorder = prevClass !== null && d.carClass !== prevClass
                return (
                  <div
                    key={d.carNumStr}
                    className={cn(
                      'grid px-4 py-2.5 border-b border-line1 items-center',
                      isClassBorder && 'border-t-2 border-t-line3',
                    )}
                    style={{ gridTemplateColumns: '40px 70px minmax(120px,1fr) 84px 84px 60px 56px 56px 56px' }}
                  >
                    <span className="disp text-[14px] font-bold text-fg0">{d.carNumStr}</span>
                    <ClassBadge carClass={d.carClass} size={9} />
                    <div className="min-w-0">
                      <div className="text-[12px] text-fg0 truncate">{d.driver}</div>
                      <div className="mono text-[10px] text-fg3 truncate">{d.team}</div>
                    </div>
                    <span className={cn(
                      'mono text-right text-[12px] font-bold',
                      d.isSessionBest ? 'text-fastest' : 'text-fg0',
                    )}>
                      {d.bestLap}
                    </span>
                    <span className="mono text-right text-[12px] text-fg2">{d.optimalLap}</span>
                    <span className={cn(
                      'mono text-right text-[11px]',
                      d.gapToOptimalMs === null ? 'text-fg4' :
                      d.gapToOptimalMs < 200    ? 'text-live' :
                      d.gapToOptimalMs < 500    ? 'text-fg2' :
                                                   'text-pit',
                    )}>
                      {formatGap(d.gapToOptimalMs)}
                    </span>
                    <span className="mono text-right text-[11px] text-fg2">{d.s1}</span>
                    <span className="mono text-right text-[11px] text-fg2">{d.s2}</span>
                    <span className="mono text-right text-[11px] text-fg2">{d.s3}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* BEST vs OPTIMAL bar chart */}
        <div className="panel flex-1 min-w-[260px] flex flex-col">
          <div className="panel-header">BEST vs OPTIMAL</div>
          <div className="p-4">
            <div className="mono text-[10px] text-fg3 mb-3">
              가장 빠른 랩이 베스트 섹터 합산 대비 얼마나 손해를 봤는가
            </div>
            <div className="flex flex-col gap-1.5">
              {sorted.map(d => {
                const gap = d.gapToOptimalMs
                const pct = gap !== null && maxGapMs > 0 ? (gap / maxGapMs) * 100 : 0
                const color = gap === null      ? 'hsl(var(--line2))'
                            : gap < 200         ? 'hsl(var(--live))'
                            : gap < 500         ? CLASS_COLOR[d.carClass]
                                                : 'hsl(var(--pit))'
                return (
                  <div key={d.carNumStr} className="flex items-center gap-2">
                    <span className="disp text-[11px] text-fg2 w-7 text-right font-semibold">{d.carNumStr}</span>
                    <div className="flex-1 h-3 bg-bg0 relative border border-line1">
                      <div
                        style={{
                          width:      `${Math.min(pct, 100)}%`,
                          height:     '100%',
                          background: color,
                          opacity:    gap === null ? 0.25 : 0.85,
                        }}
                      />
                    </div>
                    <span className="mono text-[10px] text-fg3 w-14 text-right">
                      {formatGap(gap)}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-3 mt-4 text-[10px] text-fg4 flex-wrap mono">
              <span className="text-live">■ &lt; 0.2s</span>
              <span>■ 0.2 ~ 0.5s</span>
              <span className="text-pit">■ &gt; 0.5s</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lap-time evolution chart */}
      <LapTimeChart
        lapHistory={lapHistory}
        cars={driverStats.map(d => ({ carNumStr: d.carNumStr, carClass: d.carClass, team: d.team }))}
      />
    </div>
  )
}

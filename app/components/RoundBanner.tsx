'use client'

import { useMemo } from 'react'
import { cn } from '@/app/lib/utils'
import { CURRENT_SEASON } from '@/app/data/calendar'
import { getRoundStatus, formatDaysUntil } from '@/app/lib/getRoundStatus'

interface Props {
  isLive:           boolean
  showingPrevious?: boolean
}

export default function RoundBanner({ isLive, showingPrevious = false }: Props) {
  const status = useMemo(() => getRoundStatus(CURRENT_SEASON), [])
  if (isLive) return null

  // Previous round result view — distinct banner
  if (showingPrevious && status.previous) {
    const p = status.previous
    return (
      <Banner accent="hsl(var(--accent))">
        <span className="disp font-bold tracking-[1.5px] text-accent text-[11px] uppercase">
          PREVIOUS ROUND RESULT
        </span>
        <span className="text-fg0 font-semibold text-[12px]">
          R{p.round} {p.countryFlag} {p.name}
        </span>
        <span className="mono text-[10px] text-fg3">
          {p.circuit} · {p.duration} ·{' '}
          {new Date(p.raceEnd).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', timeZone: 'UTC' })} 종료
        </span>
        {status.next && status.daysUntilNext !== null && (
          <span className="ml-auto mono text-[10px] text-fg3">
            NEXT · R{status.next.round} {status.next.countryFlag} ({formatDaysUntil(status.daysUntilNext)})
          </span>
        )}
      </Banner>
    )
  }

  if (status.phase === 'active' && status.current) {
    const r = status.current
    return (
      <Banner accent="hsl(var(--pit))">
        <span className="dot-blink-slow text-pit">●</span>
        <span className="disp font-bold tracking-[1.5px] text-pit text-[11px] uppercase">
          RECONNECTING · R{r.round} {r.countryFlag} {r.name}
        </span>
        <span className="mono text-[10px] text-fg3">{r.circuit} · {r.duration}</span>
      </Banner>
    )
  }

  if (status.phase === 'post_season') {
    return <Banner>🏁 2026 WEC 시즌 종료</Banner>
  }

  const { next, current, daysUntilNext, phase } = status

  if (phase === 'post_race' && current) {
    return (
      <Banner accent="hsl(var(--pit))">
        <span className="disp font-bold tracking-[1.5px] text-pit text-[11px] uppercase">
          R{current.round} {current.name} FINISHED
        </span>
        {next && daysUntilNext !== null && (
          <span className="mono text-[10px] text-fg3">
            NEXT · R{next.round} {next.countryFlag} {next.name} ({formatDaysUntil(daysUntilNext)})
          </span>
        )}
      </Banner>
    )
  }

  if (!next) return null

  if (phase === 'race_week') {
    return (
      <Banner accent="hsl(var(--live))">
        <span className="disp font-bold tracking-[1.5px] text-live text-[11px] uppercase dot-blink-slow">
          ● RACE WEEK
        </span>
        <span className="text-fg0 font-semibold text-[12px]">
          R{next.round} {next.countryFlag} {next.name}
        </span>
        <span className="mono text-[10px] text-fg3">
          {next.circuit} · {next.duration} ·{' '}
          {new Date(next.raceStart).toLocaleDateString('ko-KR', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
          })} UTC
          {daysUntilNext !== null && (
            <span className="text-live ml-1.5">{formatDaysUntil(daysUntilNext)}</span>
          )}
        </span>
      </Banner>
    )
  }

  return (
    <Banner>
      <span className="disp font-bold tracking-[1.5px] text-fg3 text-[11px] uppercase">
        NEXT ROUND
      </span>
      <span className="text-fg0 font-semibold text-[12px]">
        R{next.round} {next.countryFlag} {next.name}
      </span>
      <span className="mono text-[10px] text-fg3">
        {next.circuit} · {next.duration} ·{' '}
        {new Date(next.raceStart).toLocaleDateString('ko-KR', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
        })} UTC
      </span>
      {daysUntilNext !== null && (
        <span className="ml-auto mono text-[11px] text-fg0 bg-bg2 border border-line2 px-2 py-0.5">
          {formatDaysUntil(daysUntilNext)}
        </span>
      )}
    </Banner>
  )
}

function Banner({
  accent,
  children,
}: {
  accent?:   string
  children:  React.ReactNode
}) {
  return (
    <div
      className={cn('flex flex-wrap items-center gap-3 px-6 py-2.5 bg-bg1 border border-line1')}
      style={accent ? { borderLeft: `3px solid ${accent}` } : undefined}
    >
      {children}
    </div>
  )
}

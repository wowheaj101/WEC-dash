'use client'

import { useMemo } from 'react'
import { cn } from '@/app/lib/utils'
import { CURRENT_SEASON } from '@/app/data/calendar'
import { getRoundStatus, formatDaysUntil } from '@/app/lib/getRoundStatus'

interface Props { isLive: boolean }

export default function RoundBanner({ isLive }: Props) {
  const status = useMemo(() => getRoundStatus(CURRENT_SEASON), [])
  if (isLive) return null

  if (status.phase === 'active' && status.current) {
    const r = status.current
    return (
      <Banner variant="warning">
        <span className="dot-blink-slow text-[hsl(var(--pit))]">●</span>
        <span className="text-[hsl(var(--pit))] font-medium">
          Round {r.round} {r.countryFlag} {r.name} — LIVE 재연결 중…
        </span>
        <span className="text-muted-foreground text-[10px]">{r.circuit} · {r.duration}</span>
      </Banner>
    )
  }

  if (status.phase === 'post_season') {
    return (
      <Banner variant="muted">
        🏁 2026 WEC 시즌이 종료되었습니다
      </Banner>
    )
  }

  const { next, current, daysUntilNext, phase } = status

  if (phase === 'post_race' && current) {
    return (
      <Banner variant="warning">
        <span className="text-[hsl(var(--pit))] font-medium">
          Round {current.round} — {current.name} 종료
        </span>
        {next && daysUntilNext !== null && (
          <span className="text-muted-foreground">
            다음: Round {next.round} {next.countryFlag} {next.name} ({formatDaysUntil(daysUntilNext)})
          </span>
        )}
      </Banner>
    )
  }

  if (!next) return null

  if (phase === 'race_week') {
    return (
      <Banner variant="live">
        <span className="text-[hsl(var(--live))] font-semibold dot-blink-slow">● RACE WEEK</span>
        <span className="text-foreground font-medium">
          Round {next.round} {next.countryFlag} {next.name}
        </span>
        <span className="text-muted-foreground text-[10px]">
          {next.circuit} · {next.duration} ·{' '}
          {new Date(next.raceStart).toLocaleDateString('ko-KR', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
          })} UTC
          {daysUntilNext !== null && (
            <span className="text-[hsl(var(--live))] ml-1.5">{formatDaysUntil(daysUntilNext)}</span>
          )}
        </span>
      </Banner>
    )
  }

  return (
    <Banner variant="muted">
      <span className="text-muted-foreground">다음 라운드</span>
      <span className="text-foreground font-medium">
        Round {next.round} {next.countryFlag} {next.name}
      </span>
      <span className="text-muted-foreground text-[10px]">
        {next.circuit} · {next.duration} ·{' '}
        {new Date(next.raceStart).toLocaleDateString('ko-KR', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
        })} UTC
      </span>
      {daysUntilNext !== null && (
        <span className="ml-auto px-2 py-0.5 text-[11px] text-foreground bg-surface2 border border-border rounded">
          {formatDaysUntil(daysUntilNext)}
        </span>
      )}
    </Banner>
  )
}

const BANNER_STYLES = {
  live:    'bg-[hsl(var(--live-bg))]     border-[hsl(var(--live-border))]',
  warning: 'bg-[hsl(var(--warning-bg))]  border-[hsl(var(--warning-border))]',
  muted:   'bg-surface1                  border-border',
}

function Banner({ variant, children }: {
  variant:  keyof typeof BANNER_STYLES
  children: React.ReactNode
}) {
  return (
    <div className={cn(
      'flex flex-wrap items-center gap-2 px-4 py-2 rounded-lg border text-[11px]',
      BANNER_STYLES[variant]
    )}>
      {children}
    </div>
  )
}

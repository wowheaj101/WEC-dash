'use client'

import { useMemo } from 'react'
import type { RaceInfo } from '@/app/types/race'
import { CURRENT_SEASON } from '@/app/data/calendar'
import { getRoundStatus } from '@/app/lib/getRoundStatus'
import { useWeather } from '@/app/hooks/useWeather'
import { cn } from '@/app/lib/utils'

interface Props {
  info:   RaceInfo
  isLive: boolean
}

export default function Header({ info, isLive }: Props) {
  const roundStatus = useMemo(() => getRoundStatus(CURRENT_SEASON), [])

  const weatherRound = isLive ? null : (roundStatus.next ?? roundStatus.current)
  const weather = useWeather(
    weatherRound?.lat ?? null,
    weatherRound?.lon ?? null,
  )

  const displayRound = (isLive || roundStatus.phase === 'active')
    ? roundStatus.current ?? roundStatus.next
    : roundStatus.next ?? roundStatus.current

  const raceName  = isLive ? info.name  : (displayRound?.name    ?? info.name)
  const roundNum  = isLive ? info.round : (displayRound?.round   ?? info.round)
  const circuit   = displayRound?.circuit ?? ''
  const air       = isLive ? info.weather.air      : (weather?.air       ?? null)
  const track     = isLive ? info.weather.track    : (weather?.track     ?? null)
  const humidity  = isLive ? info.weather.humidity : (weather?.humidity  ?? null)
  const windSpeed = weather?.windSpeed ?? null
  const icon      = isLive ? '☀️' : (weather?.icon ?? '—')

  return (
    <div className={cn(
      'panel flex flex-wrap items-center justify-between gap-3 px-4 py-3',
      isLive && 'glow-live'
    )}>
      {/* Left — race identity */}
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2">
          {displayRound?.countryFlag && (
            <span className="text-base leading-none">{displayRound.countryFlag}</span>
          )}
          <span className="text-[13px] font-semibold text-foreground truncate">
            {raceName}
            <span className="text-muted-foreground font-normal"> — Round {roundNum}</span>
          </span>
        </div>
        {circuit && (
          <span className="text-[10px] text-muted-foreground pl-[26px]">{circuit}</span>
        )}
        {isLive && (
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground pl-[26px] tabular">
            <span>경과 {info.elapsed}</span>
            <span className="text-border">/</span>
            <span>{info.total}</span>
            <span className="text-border">·</span>
            <span>잔여 {info.remaining}</span>
          </div>
        )}
      </div>

      {/* Right — weather + session status */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Weather row */}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="text-sm">{icon}</span>
          {air !== null ? (
            <>
              <span>기온 <span className="text-foreground">{air}°C</span></span>
              <span className="text-border">|</span>
              <span>트랙 <span className="text-foreground">{track}°C</span></span>
              <span className="text-border">|</span>
              <span>습도 <span className="text-foreground">{humidity}%</span></span>
              {windSpeed !== null && !isLive && (
                <>
                  <span className="text-border">|</span>
                  <span>풍속 <span className="text-foreground">{windSpeed}km/h</span></span>
                </>
              )}
            </>
          ) : (
            <span>날씨 로딩 중…</span>
          )}
        </div>

        {/* Session badge */}
        {isLive ? (
          <span className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium',
            'bg-[hsl(var(--live-bg))] text-[hsl(var(--live))] border border-[hsl(var(--live-border))]'
          )}>
            <span className="dot-blink inline-block w-1.5 h-1.5 rounded-full bg-[hsl(var(--live))] shrink-0" />
            RACE IN PROGRESS
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] text-muted-foreground bg-surface1 border border-border">
            {displayRound?.duration ?? '—'}
          </span>
        )}
      </div>
    </div>
  )
}

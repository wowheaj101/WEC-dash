'use client'

import { useMemo } from 'react'
import type { RaceInfo, Stats } from '@/app/types/race'
import { CURRENT_SEASON } from '@/app/data/calendar'
import { getRoundStatus } from '@/app/lib/getRoundStatus'
import { useWeather } from '@/app/hooks/useWeather'

interface Props {
  info:             RaceInfo
  stats?:           Stats
  isLive:           boolean
  showingPrevious?: boolean
}

function weatherIcon(condition: string | undefined): string {
  switch (condition) {
    case 'sunny':  return '☀️'
    case 'cloudy': return '⛅'
    case 'rainy':  return '🌧️'
    case 'foggy':  return '🌫️'
    case 'snowy':  return '❄️'
    case 'stormy': return '⛈️'
    default:       return '☁️'
  }
}

export default function Header({ info, stats: _stats, isLive, showingPrevious = false }: Props) {
  const roundStatus = useMemo(() => getRoundStatus(CURRENT_SEASON), [])

  const weatherRound = isLive
    ? null
    : showingPrevious
      ? (roundStatus.previous ?? roundStatus.next ?? roundStatus.current)
      : (roundStatus.next ?? roundStatus.current)
  const weather = useWeather(weatherRound?.lat ?? null, weatherRound?.lon ?? null)

  const displayRound = (isLive || roundStatus.phase === 'active')
    ? roundStatus.current ?? roundStatus.next
    : showingPrevious
      ? roundStatus.previous ?? roundStatus.next ?? roundStatus.current
      : roundStatus.next ?? roundStatus.current

  const raceName     = isLive ? info.name  : (displayRound?.name  ?? info.name)
  const roundNum     = isLive ? info.round : (displayRound?.round ?? info.round)
  const countryLabel = displayRound?.country?.toUpperCase() ?? ''
  const flag         = displayRound?.countryFlag ?? ''
  const air          = isLive ? info.weather.air       : (weather?.air       ?? null)
  const track        = isLive ? info.weather.track     : (weather?.track     ?? null)
  const humidity     = isLive ? info.weather.humidity  : (weather?.humidity  ?? null)
  const condition    = isLive ? info.weather.condition : (weather?.condition ?? '')
  const icon         = isLive ? weatherIcon(info.weather.condition) : (weather?.icon ?? weatherIcon(condition))

  const subline = isLive
    ? 'LIVE · RACE'
    : showingPrevious
      ? 'PREVIOUS ROUND · FINAL RESULT'
      : displayRound?.duration ? `DURATION · ${displayRound.duration}` : '—'

  return (
    <div className="relative flex h-[80px] bg-bg0 border-b-2 border-accent">
      {/* Red hero chevron — content-sized, caps at 70% so weather stays visible */}
      <div
        className="flex items-center text-white clip-chev-hero pr-11 pl-6 shrink-0 max-w-[70%]"
        style={{ background: 'hsl(var(--accent))' }}
      >
        <div className="min-w-0">
          <div className="disp font-bold tracking-[3.5px] text-[11px] opacity-90 uppercase truncate">
            FIA WEC · R{roundNum} {countryLabel && `· ${countryLabel}`} {flag}
          </div>
          <div className="disp font-bold text-[26px] leading-none mt-[3px] uppercase truncate" style={{ letterSpacing: '-0.2px' }}>
            {raceName}
          </div>
          <div className="mono text-[10px] opacity-90 mt-1 tracking-[0.5px] truncate">
            {subline}
          </div>
        </div>
      </div>

      {/* Right: weather only (track temp + air/condition) */}
      <div className="flex items-center gap-5 flex-1 px-6 overflow-hidden justify-end">
        <Stat
          label="AIR"
          big={air != null ? `${air}°` : '—'}
          sub={
            <span className="inline-flex items-center gap-1">
              <span className="text-[12px] leading-none">{icon}</span>
              <span className="truncate">{condition ? condition.toUpperCase() : '—'}</span>
            </span>
          }
        />
        <Sep />
        <Stat
          label="TRACK"
          big={track != null ? `${track}°` : '—'}
          sub={humidity != null ? `HUM ${humidity}%` : '—'}
        />
      </div>
    </div>
  )
}

function Stat({ label, big, sub }: { label: string; big: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <div className="disp text-[9px] tracking-[2px] text-fg3 uppercase">{label}</div>
      <div className="mono text-[20px] font-bold text-fg0 leading-none truncate">{big}</div>
      <div className="mono text-[10px] text-fg3 truncate">{sub}</div>
    </div>
  )
}
function Sep() { return <div className="w-px h-10 bg-line2 shrink-0" /> }

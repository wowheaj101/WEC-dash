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

export default function Header({ info, stats, isLive, showingPrevious = false }: Props) {
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
  const air          = isLive ? info.weather.air      : (weather?.air      ?? null)
  const track        = isLive ? info.weather.track    : (weather?.track    ?? null)
  const humidity     = isLive ? info.weather.humidity : (weather?.humidity ?? null)

  const elapsed = info.elapsed || '—'
  const total   = info.total   || '—'

  // live clock
  const now = new Date()
  const clock = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

  const subline = isLive
    ? (stats ? `RACE · LAP ${stats.leaderLap}` : 'RACE · LIVE')
    : showingPrevious
      ? 'PREVIOUS ROUND · FINAL RESULT'
      : displayRound?.duration ? `DURATION · ${displayRound.duration}` : '—'

  return (
    <div className="relative flex h-[80px] bg-bg0 border-b-2 border-accent">
      {/* Red hero chevron */}
      <div
        className="flex items-center text-white clip-chev-hero pr-11 pl-6 min-w-0"
        style={{ width: 420, background: 'hsl(var(--accent))' }}
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

      {/* Right: inline stats */}
      <div className="flex items-center gap-5 flex-1 px-6 overflow-hidden">
        <Stat label="ELAPSED" big={elapsed} sub={`of ${total}`} />
        <Sep />
        <Stat
          label="FASTEST"
          big={stats?.fastestLap.time ? <span className="text-fastest">{stats.fastestLap.time}</span> : '—'}
          sub={stats?.fastestLap.carNum ? `#${stats.fastestLap.carNum} ${stats.fastestLap.team ?? ''}`.trim() : '—'}
        />
        <Sep />
        <Stat
          label="TEMP"
          big={air != null ? `${air}°` : '—'}
          sub={track != null ? `TRACK ${track}°` : humidity != null ? `HUM ${humidity}%` : '—'}
        />

        <div className="ml-auto flex flex-col items-end gap-1 shrink-0">
          {isLive ? (
            <span className="inline-flex items-center gap-2 px-3 py-[5px] bg-[hsl(var(--live-bg))] border border-[hsl(var(--live))] text-live">
              <span className="dot-blink w-2 h-2 rounded-full bg-live shrink-0" />
              <span className="disp font-bold text-[11px] tracking-[1.5px]">LIVE</span>
            </span>
          ) : showingPrevious ? (
            <span className="inline-flex items-center gap-2 px-3 py-[5px] bg-bg2 border border-accent text-accent">
              <span className="disp font-bold text-[11px] tracking-[1.5px]">PREVIOUS</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 px-3 py-[5px] bg-bg2 border border-line2 text-fg2">
              <span className="disp font-bold text-[11px] tracking-[1.5px]">{displayRound?.duration ?? '—'}</span>
            </span>
          )}
          <div className="mono text-[10px] text-fg3">{clock}</div>
        </div>
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

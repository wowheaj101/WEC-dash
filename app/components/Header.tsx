'use client'

import { useMemo } from 'react'
import type { RaceInfo } from '@/app/types/race'
import { CURRENT_SEASON } from '@/app/data/calendar'
import { getRoundStatus } from '@/app/lib/getRoundStatus'
import { useWeather } from '@/app/hooks/useWeather'

interface Props {
  info:   RaceInfo
  isLive: boolean
}

export default function Header({ info, isLive }: Props) {
  const roundStatus = useMemo(() => getRoundStatus(CURRENT_SEASON), [])

  // Decide which circuit's coords to use for weather:
  //  - Live: use Timing71 info (session weather from raceInfo)
  //  - Not live, race active/upcoming: use next/current round coords
  const weatherRound = isLive ? null : (roundStatus.next ?? roundStatus.current)
  const weather = useWeather(
    weatherRound?.lat ?? null,
    weatherRound?.lon ?? null,
  )

  // Display name: live → from Timing71 raceInfo, otherwise from calendar
  const displayRound = isLive
    ? roundStatus.current ?? roundStatus.next
    : roundStatus.next ?? roundStatus.current

  const raceName  = isLive ? info.name  : (displayRound?.name    ?? info.name)
  const roundNum  = isLive ? info.round : (displayRound?.round   ?? info.round)
  const circuit   = displayRound?.circuit ?? ''

  // Weather values: live → Timing71 trackData, not live → Open-Meteo
  const air      = isLive ? info.weather.air      : (weather?.air       ?? null)
  const track    = isLive ? info.weather.track    : (weather?.track     ?? null)
  const humidity = isLive ? info.weather.humidity : (weather?.humidity  ?? null)
  const windSpeed = weather?.windSpeed ?? null
  const icon     = isLive ? '☀️' : (weather?.icon ?? '—')

  return (
    <div style={{
      background:     '#141414',
      border:         '0.5px solid #2a2a2a',
      borderRadius:   8,
      padding:        '8px 12px',
      display:        'flex',
      justifyContent: 'space-between',
      alignItems:     'center',
      flexWrap:       'wrap',
      gap:            8,
    }}>
      {/* ── Left ── */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>
          {raceName}&nbsp;—&nbsp;Round {roundNum}
        </div>
        {circuit && (
          <div style={{ fontSize: 10, color: '#555', marginTop: 1 }}>
            {circuit}
          </div>
        )}
        {isLive && (
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 3 }}>
            경과&nbsp;{info.elapsed}&nbsp;/&nbsp;{info.total}
            &nbsp;&nbsp;|&nbsp;&nbsp;잔여&nbsp;{info.remaining}
          </div>
        )}
      </div>

      {/* ── Right ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {/* Weather */}
        <span style={{ fontSize: 11, color: '#aaa', display: 'flex', gap: 6, alignItems: 'center' }}>
          <span>{icon}</span>
          {air !== null
            ? <>
                <span>기온&nbsp;{air}°C</span>
                <span style={{ color: '#444' }}>|</span>
                <span>트랙&nbsp;{track}°C</span>
                <span style={{ color: '#444' }}>|</span>
                <span>습도&nbsp;{humidity}%</span>
                {windSpeed !== null && !isLive && (
                  <>
                    <span style={{ color: '#444' }}>|</span>
                    <span>풍속&nbsp;{windSpeed}km/h</span>
                  </>
                )}
              </>
            : <span style={{ color: '#444' }}>날씨 로딩 중…</span>
          }
        </span>

        {/* Session badge */}
        {isLive ? (
          <span style={{
            display:      'inline-flex',
            alignItems:   'center',
            gap:          5,
            background:   '#003d00',
            color:        '#00ff66',
            fontSize:     10,
            padding:      '3px 8px',
            borderRadius: 4,
            border:       '0.5px solid #00ff66',
            whiteSpace:   'nowrap',
          }}>
            <span className="dot-blink" style={{
              display: 'inline-block', width: 6, height: 6,
              borderRadius: '50%', background: '#00ff66', flexShrink: 0,
            }} />
            RACE IN PROGRESS
          </span>
        ) : (
          <span style={{
            display:      'inline-flex',
            alignItems:   'center',
            gap:          5,
            background:   '#111',
            color:        '#555',
            fontSize:     10,
            padding:      '3px 8px',
            borderRadius: 4,
            border:       '0.5px solid #222',
            whiteSpace:   'nowrap',
          }}>
            {displayRound?.countryFlag}&nbsp;{displayRound?.duration ?? '—'}
          </span>
        )}
      </div>
    </div>
  )
}

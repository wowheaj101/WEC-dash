'use client'

import { useMemo } from 'react'
import { CURRENT_SEASON } from '@/app/data/calendar'
import { getRoundStatus, formatDaysUntil } from '@/app/lib/getRoundStatus'

interface Props {
  /** Timing71 라이브 연결 중이면 배너 숨김 */
  isLive: boolean
}

export default function RoundBanner({ isLive }: Props) {
  const status = useMemo(() => getRoundStatus(CURRENT_SEASON), [])

  // 라이브 중이면 Timing71 데이터가 우선 — 숨김
  if (isLive) return null

  // 레이스 활성 중이지만 연결 안 됨 → 재연결 중 배너 표시
  if (status.phase === 'active' && status.current) {
    const r = status.current
    return (
      <Banner color="#1a0800" border="#663300">
        <span className="dot-blink-slow" style={{ color: '#ff6600' }}>●</span>
        <span style={{ color: '#ff9933', marginLeft: 6 }}>
          Round {r.round} {r.countryFlag} {r.name} — LIVE 재연결 중…
        </span>
        <span style={{ color: '#555', marginLeft: 8, fontSize: 10 }}>
          {r.circuit} · {r.duration}
        </span>
      </Banner>
    )
  }

  // 시즌 종료 후
  if (status.phase === 'post_season') {
    return (
      <Banner color="#333" border="#444">
        🏁 2026 WEC 시즌이 종료되었습니다
      </Banner>
    )
  }

  const { next, current, daysUntilNext, phase } = status

  // 레이스 직후 (24h 이내)
  if (phase === 'post_race' && current) {
    return (
      <Banner color="#1a0e00" border="#553300">
        <span style={{ color: '#ff9900' }}>
          Round {current.round} — {current.name} 종료
        </span>
        {next && daysUntilNext !== null && (
          <span style={{ color: '#555', marginLeft: 12 }}>
            다음: Round {next.round} {next.countryFlag} {next.name} ({formatDaysUntil(daysUntilNext)})
          </span>
        )}
      </Banner>
    )
  }

  if (!next) return null

  // 레이스 위크 (7일 이내)
  if (phase === 'race_week') {
    return (
      <Banner color="#001a00" border="#005500">
        <span style={{ color: '#00ee55' }} className="dot-blink-slow">
          ● RACE WEEK
        </span>
        <span style={{ color: '#fff', marginLeft: 10 }}>
          Round {next.round} {next.countryFlag} {next.name}
        </span>
        <span style={{ color: '#aaa', marginLeft: 8, fontSize: 10 }}>
          {next.circuit} · {next.duration} ·{' '}
          {new Date(next.raceStart).toLocaleDateString('ko-KR', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
          })} UTC
          {daysUntilNext !== null && (
            <span style={{ color: '#00ee55', marginLeft: 6 }}>
              {formatDaysUntil(daysUntilNext)}
            </span>
          )}
        </span>
      </Banner>
    )
  }

  // 일반 upcoming / pre_season
  return (
    <Banner color="#0f0f0f" border="#2a2a2a">
      <span style={{ color: '#555' }}>다음 라운드</span>
      <span style={{ color: '#fff', marginLeft: 8 }}>
        Round {next.round} {next.countryFlag} {next.name}
      </span>
      <span style={{ color: '#555', marginLeft: 8, fontSize: 10 }}>
        {next.circuit} · {next.duration} ·{' '}
        {new Date(next.raceStart).toLocaleDateString('ko-KR', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
        })} UTC
      </span>
      {daysUntilNext !== null && (
        <span style={{
          marginLeft:   'auto',
          color:        '#fff',
          background:   '#1e1e1e',
          border:       '0.5px solid #333',
          borderRadius: 4,
          padding:      '2px 8px',
          fontSize:     11,
        }}>
          {formatDaysUntil(daysUntilNext)}
        </span>
      )}
    </Banner>
  )
}

function Banner({ color, border, children }: {
  color:    string
  border:   string
  children: React.ReactNode
}) {
  return (
    <div style={{
      background:   color,
      border:       `0.5px solid ${border}`,
      borderRadius: 6,
      padding:      '6px 12px',
      display:      'flex',
      alignItems:   'center',
      gap:          6,
      fontSize:     11,
      fontFamily:   'monospace',
      flexWrap:     'wrap',
    }}>
      {children}
    </div>
  )
}

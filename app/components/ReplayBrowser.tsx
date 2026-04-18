'use client'

import type { RaceMeta } from '@/app/types/replay'

interface Props {
  raceList:    RaceMeta[]
  loading:     boolean
  onSelect:    (meta: RaceMeta) => void
}

const CLASS_COLORS: Record<string, string> = {
  '~12h': '#ff9900',
  '6h':   '#3399ff',
  '8h':   '#bb55ff',
  '24h':  '#ff4040',
}

export default function ReplayBrowser({ raceList, loading, onSelect }: Props) {
  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#444', fontSize: 12 }}>
        레이스 목록 불러오는 중…
      </div>
    )
  }

  if (!raceList.length) {
    return (
      <div style={{
        padding:       60,
        textAlign:     'center',
        color:         '#444',
        fontSize:      12,
        background:    '#0f0f0f',
        borderRadius:  8,
        border:        '0.5px solid #1e1e1e',
      }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>📼</div>
        <div style={{ color: '#555', lineHeight: 1.8 }}>
          저장된 레이스가 없습니다.<br />
          라이브 레이스가 시작되면 자동으로 저장됩니다.
        </div>
      </div>
    )
  }

  // 연도별로 그룹핑
  const byYear: Record<number, RaceMeta[]> = {}
  for (const r of raceList) {
    ;(byYear[r.year] ??= []).push(r)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {Object.entries(byYear)
        .sort(([a], [b]) => Number(b) - Number(a))
        .map(([year, races]) => (
          <div key={year}>
            <div style={{
              fontSize:     10,
              color:        '#444',
              marginBottom: 8,
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}>
              {year} Season
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {races
                .sort((a, b) => a.round - b.round)
                .map(race => (
                  <button
                    key={race.id}
                    onClick={() => onSelect(race)}
                    style={{
                      display:        'flex',
                      alignItems:     'center',
                      gap:            10,
                      background:     '#0f0f0f',
                      border:         '0.5px solid #1e1e1e',
                      borderRadius:   6,
                      padding:        '10px 14px',
                      cursor:         'pointer',
                      textAlign:      'left',
                      width:          '100%',
                      fontFamily:     'monospace',
                      transition:     'border-color 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#333')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e1e1e')}
                  >
                    {/* Round badge */}
                    <span style={{
                      fontSize:     9,
                      color:        '#555',
                      background:   '#141414',
                      border:       '0.5px solid #2a2a2a',
                      borderRadius: 4,
                      padding:      '2px 6px',
                      whiteSpace:   'nowrap',
                      flexShrink:   0,
                    }}>
                      R{race.round}
                    </span>

                    {/* Flag */}
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{race.countryFlag}</span>

                    {/* Name */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: '#ccc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {race.name}
                      </div>
                      <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>
                        {race.circuit}
                      </div>
                    </div>

                    {/* Duration badge */}
                    <span style={{
                      fontSize:     9,
                      color:        CLASS_COLORS[race.duration] ?? '#555',
                      background:   '#141414',
                      border:       `0.5px solid ${CLASS_COLORS[race.duration] ?? '#2a2a2a'}`,
                      borderRadius: 4,
                      padding:      '2px 6px',
                      flexShrink:   0,
                    }}>
                      {race.duration}
                    </span>

                    {/* Snapshot count */}
                    <span style={{ fontSize: 9, color: '#444', flexShrink: 0 }}>
                      {race.snapshots} snaps
                    </span>

                    {/* Date */}
                    <span style={{ fontSize: 9, color: '#444', flexShrink: 0 }}>
                      {race.date}
                    </span>

                    <span style={{ color: '#333', fontSize: 12, flexShrink: 0 }}>›</span>
                  </button>
                ))}
            </div>
          </div>
        ))}
    </div>
  )
}

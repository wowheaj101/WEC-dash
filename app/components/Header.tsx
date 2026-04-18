'use client'

import type { RaceInfo } from '@/app/types/race'

export default function Header({ info }: { info: RaceInfo }) {
  return (
    <div style={{
      background:    '#141414',
      border:        '0.5px solid #2a2a2a',
      borderRadius:  8,
      padding:       '8px 12px',
      display:       'flex',
      justifyContent:'space-between',
      alignItems:    'center',
      flexWrap:      'wrap',
      gap:           8,
    }}>
      {/* ── Left ── */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>
          {info.name}&nbsp;—&nbsp;Round {info.round}
        </div>
        <div style={{ fontSize: 11, color: '#aaa', marginTop: 3 }}>
          경과&nbsp;{info.elapsed}&nbsp;/&nbsp;{info.total}&nbsp;&nbsp;|&nbsp;&nbsp;잔여&nbsp;{info.remaining}
        </div>
      </div>

      {/* ── Right ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {/* Weather */}
        <span style={{ fontSize: 11, color: '#aaa' }}>
          ☀️&nbsp;기온&nbsp;{info.weather.air}°C&nbsp;&nbsp;&nbsp;
          트랙&nbsp;{info.weather.track}°C&nbsp;&nbsp;&nbsp;
          습도&nbsp;{info.weather.humidity}%
        </span>

        {/* Session badge */}
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
          <span
            className="dot-blink"
            style={{
              display:      'inline-block',
              width:        6,
              height:       6,
              borderRadius: '50%',
              background:   '#00ff66',
              flexShrink:   0,
            }}
          />
          RACE IN PROGRESS
        </span>
      </div>
    </div>
  )
}

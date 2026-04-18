'use client'

import type { CarStint, Tire } from '@/app/types/race'

const CLASS_COLOR: Record<string, string> = {
  HYPERCAR: '#ff4444',
  LMP2:     '#4488ff',
  LMGT3:    '#44cc55',
}

const TIRE_COLOR: Record<Tire, { bg: string; text: string }> = {
  S: { bg: '#d4b800', text: '#000' },
  M: { bg: '#d0d0d0', text: '#000' },
  H: { bg: '#cc2222', text: '#fff' },
  W: { bg: '#2255cc', text: '#fff' },
  I: { bg: '#229944', text: '#fff' },
}

const TIRE_LABEL: Record<Tire, string> = {
  S: 'Soft', M: 'Medium', H: 'Hard', W: 'Wet', I: 'Inter',
}

interface Props {
  carStints: CarStint[]
  totalLaps: number
}

export default function StintTimeline({ carStints, totalLaps }: Props) {
  const lapTicks = Array.from({ length: Math.floor(totalLaps / 10) + 1 }, (_, i) => i * 10)
    .filter(l => l <= totalLaps)

  return (
    <div style={{
      background:   '#0f0f0f',
      border:       '0.5px solid #2a2a2a',
      borderRadius: 8,
      padding:      12,
      overflowX:    'auto',
    }}>
      <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
        스틴트 타임라인
      </div>

      <div style={{ minWidth: 560 }}>
        {/* Lap ruler */}
        <div style={{ display: 'flex', marginLeft: 128, marginBottom: 6, position: 'relative', height: 14 }}>
          {lapTicks.map(lap => (
            <div
              key={lap}
              style={{
                position:   'absolute',
                left:       `${(lap / totalLaps) * 100}%`,
                fontSize:   8,
                color:      '#333',
                borderLeft: '0.5px solid #1e1e1e',
                paddingLeft: 3,
                paddingTop:  2,
              }}
            >
              {lap}
            </div>
          ))}
          <div style={{
            position: 'absolute',
            right:    0,
            fontSize: 8,
            color:    '#333',
            paddingTop: 2,
          }}>
            {totalLaps}
          </div>
        </div>

        {/* Car rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {carStints.map(car => {
            const clsColor = CLASS_COLOR[car.carClass]
            return (
              <div key={car.carNum} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                {/* Label */}
                <div style={{
                  width:      128,
                  flexShrink: 0,
                  display:    'flex',
                  alignItems: 'center',
                  gap:        6,
                  paddingRight: 10,
                }}>
                  <span style={{
                    fontSize:  12,
                    fontWeight: 600,
                    color:     '#fff',
                    minWidth:  24,
                    textAlign: 'right',
                  }}>
                    {car.carNum}
                  </span>
                  <div>
                    <div style={{ fontSize: 8, color: clsColor, lineHeight: 1, marginBottom: 1 }}>
                      {car.carClass}
                    </div>
                    <div style={{
                      fontSize:     8,
                      color:        '#444',
                      whiteSpace:   'nowrap',
                      overflow:     'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth:     82,
                    }}>
                      {car.team.split(' ').slice(0, 2).join(' ')}
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div style={{
                  flex:         1,
                  height:       22,
                  background:   '#111',
                  borderRadius: 3,
                  position:     'relative',
                  overflow:     'hidden',
                }}>
                  {/* Lap grid lines */}
                  {lapTicks.filter(l => l > 0).map(lap => (
                    <div
                      key={lap}
                      style={{
                        position:   'absolute',
                        left:       `${(lap / totalLaps) * 100}%`,
                        top:        0,
                        bottom:     0,
                        width:      '0.5px',
                        background: '#1a1a1a',
                      }}
                    />
                  ))}

                  {/* Stint blocks */}
                  {car.stints.map((stint, i) => {
                    const start     = ((stint.startLap - 1) / totalLaps) * 100
                    const end       = stint.endLap !== null
                      ? (stint.endLap / totalLaps) * 100
                      : 100
                    const width     = Math.max(end - start, 0.5)
                    const isRunning = stint.endLap === null
                    const tc        = TIRE_COLOR[stint.tire]
                    const title     = [
                      `${stint.tire} (${TIRE_LABEL[stint.tire]})`,
                      `Laps ${stint.startLap}–${stint.endLap ?? '...'}`,
                      stint.avgLap ? `avg ${stint.avgLap}` : '',
                    ].filter(Boolean).join(' — ')

                    return (
                      <div
                        key={i}
                        title={title}
                        style={{
                          position: 'absolute',
                          left:     `${start}%`,
                          width:    `${width}%`,
                          top:      1,
                          bottom:   1,
                          background: isRunning
                            ? `repeating-linear-gradient(90deg,${tc.bg} 0px,${tc.bg} 10px,${tc.bg}99 10px,${tc.bg}99 12px)`
                            : tc.bg,
                          borderRadius: 2,
                          display:      'flex',
                          alignItems:   'center',
                          justifyContent: 'center',
                          overflow:     'hidden',
                        }}
                      >
                        {width > 4 && (
                          <span style={{ fontSize: 8, color: tc.text, fontWeight: 700 }}>
                            {stint.tire}
                          </span>
                        )}
                      </div>
                    )
                  })}

                  {/* Pit stop markers */}
                  {car.stints.slice(0, -1).map((stint, i) => {
                    if (stint.endLap === null) return null
                    const pos = (stint.endLap / totalLaps) * 100
                    return (
                      <div
                        key={`pit-${i}`}
                        title={`Pit — ${stint.pitDuration}s`}
                        style={{
                          position:   'absolute',
                          left:       `${pos}%`,
                          top:        0,
                          bottom:     0,
                          width:      2,
                          background: '#ff9900',
                          zIndex:     10,
                        }}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display:'flex', gap:10, marginTop:12, fontSize:9, color:'#444', flexWrap:'wrap', alignItems:'center' }}>
        {(['S','M','H','W','I'] as Tire[]).map(t => {
          const tc = TIRE_COLOR[t]
          return (
            <span key={t} style={{ display:'flex', alignItems:'center', gap:3 }}>
              <span style={{
                width:14, height:10, background:tc.bg, borderRadius:2,
                display:'inline-flex', alignItems:'center', justifyContent:'center',
              }}>
                <span style={{ fontSize:7, color:tc.text, fontWeight:700 }}>{t}</span>
              </span>
              {TIRE_LABEL[t]}
            </span>
          )
        })}
        <span style={{ display:'flex', alignItems:'center', gap:3 }}>
          <span style={{ width:2, height:10, background:'#ff9900', display:'inline-block' }} />
          피트스톱
        </span>
      </div>
    </div>
  )
}

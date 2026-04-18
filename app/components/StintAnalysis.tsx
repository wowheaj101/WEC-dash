'use client'

import type { CarStint } from '@/app/types/race'
import StintTimeline from './StintTimeline'

const CLASS_COLOR: Record<string, string> = {
  HYPERCAR: '#ff4444',
  LMP2:     '#4488ff',
  LMGT3:    '#44cc55',
}

function pitColor(duration: string): string {
  const sec = parseFloat(duration)
  if (sec > 30) return '#ff4444'
  if (sec > 24) return '#ffaa00'
  return '#44cc55'
}

function pitLabel(duration: string): string | null {
  const sec = parseFloat(duration)
  if (sec > 30) return '이상'
  if (sec > 24) return '드라이버 교체'
  return null
}

interface PitStop {
  carNum:   number
  carClass: string
  lap:      number
  stint:    number
  duration: string
}

function collectPitStops(carStints: CarStint[]): PitStop[] {
  const result: PitStop[] = []
  carStints.forEach(car => {
    car.stints.forEach((stint, i) => {
      if (stint.pitDuration && stint.endLap !== null) {
        result.push({
          carNum:   car.carNum,
          carClass: car.carClass,
          lap:      stint.endLap,
          stint:    i + 1,
          duration: stint.pitDuration,
        })
      }
    })
  })
  return result.sort((a, b) => b.lap - a.lap)
}

interface Props {
  carStints: CarStint[]
  totalLaps: number
}

export default function StintAnalysis({ carStints, totalLaps }: Props) {
  const pitStops = collectPitStops(carStints)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      <StintTimeline carStints={carStints} totalLaps={totalLaps} />

      {/* Pit stop time table */}
      <div style={{
        background:   '#0f0f0f',
        border:       '0.5px solid #222',
        borderRadius: 8,
        overflow:     'hidden',
      }}>
        <div style={{ padding:'6px 12px', borderBottom:'0.5px solid #1e1e1e', background:'#111' }}>
          <span style={{ fontSize:10, color:'#555', textTransform:'uppercase', letterSpacing:1 }}>
            피트스톱 소요시간
          </span>
        </div>

        <div style={{
          display:             'grid',
          gridTemplateColumns: '40px 90px 68px 52px 1fr',
          padding:             '4px 12px',
          borderBottom:        '0.5px solid #1a1a1a',
          background:          '#0d0d0d',
        }}>
          {['#','CLASS','LAP','STINT','소요시간'].map(h => (
            <span key={h} style={{ fontSize:9, color:'#333', textTransform:'uppercase' }}>{h}</span>
          ))}
        </div>

        {pitStops.map((p, i) => {
          const label = pitLabel(p.duration)
          return (
            <div
              key={i}
              style={{
                display:             'grid',
                gridTemplateColumns: '40px 90px 68px 52px 1fr',
                padding:             '5px 12px',
                borderBottom:        '0.5px solid #111',
                alignItems:          'center',
              }}
            >
              <span style={{ fontSize:11, fontWeight:600, color: CLASS_COLOR[p.carClass] }}>
                {p.carNum}
              </span>
              <span style={{ fontSize:9, color: CLASS_COLOR[p.carClass] }}>{p.carClass}</span>
              <span style={{ fontSize:10, color:'#666', fontVariantNumeric:'tabular-nums' }}>
                Lap {p.lap}
              </span>
              <span style={{ fontSize:10, color:'#3a3a3a' }}>Stint {p.stint}</span>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{
                  fontSize:           13,
                  color:              pitColor(p.duration),
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight:         500,
                }}>
                  {p.duration}s
                </span>
                {label && (
                  <span style={{
                    fontSize:   8,
                    color:      parseFloat(p.duration) > 30 ? '#ff4444' : '#ffaa00',
                    background: parseFloat(p.duration) > 30 ? '#1a0000' : '#1a1000',
                    padding:    '1px 5px',
                    borderRadius: 3,
                  }}>
                    {label}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Color key */}
      <div style={{ display:'flex', gap:16, fontSize:9, color:'#3a3a3a', padding:'0 4px' }}>
        <span style={{ color:'#44cc55' }}>■ 정상 (~22s)</span>
        <span style={{ color:'#ffaa00' }}>■ 드라이버 교체 (~25s)</span>
        <span style={{ color:'#ff4444' }}>■ 이상 (30s+)</span>
      </div>
    </div>
  )
}

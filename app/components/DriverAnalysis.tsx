'use client'

import type { DriverStat } from '@/app/types/race'
import ClassBadge from './ClassBadge'

const CLASS_COLOR: Record<string, string> = {
  HYPERCAR: '#ff4444',
  LMP2:     '#4488ff',
  LMGT3:    '#44cc55',
}

function toSec(t: string): number {
  const [h, m, s] = t.split(':').map(Number)
  return h * 3600 + m * 60 + s
}

interface Props {
  driverStats: DriverStat[]
}

export default function DriverAnalysis({ driverStats }: Props) {
  const MAX_SEC = 14400  // 4 hours
  const MIN_SEC = 3600   // 1 hour

  const sbS1 = driverStats.reduce((a, b) => a.s1 < b.s1 ? a : b)
  const sbS2 = driverStats.reduce((a, b) => a.s2 < b.s2 ? a : b)
  const sbS3 = driverStats.reduce((a, b) => a.s3 < b.s3 ? a : b)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>

      {/* Sector best cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
        {[
          { label:'SECTOR 1 BEST', time:sbS1.s1, carNum:sbS1.carNum, team:sbS1.team },
          { label:'SECTOR 2 BEST', time:sbS2.s2, carNum:sbS2.carNum, team:sbS2.team },
          { label:'SECTOR 3 BEST', time:sbS3.s3, carNum:sbS3.carNum, team:sbS3.team },
        ].map(({ label, time, carNum, team }) => (
          <div key={label} style={{
            background:   '#110019',
            border:       '0.5px solid #2a0050',
            borderRadius: 8,
            padding:      '8px 10px',
          }}>
            <div style={{ fontSize:9, color:'#6633aa', textTransform:'uppercase', letterSpacing:1 }}>
              {label}
            </div>
            <div style={{ fontSize:16, color:'#cc44ff', fontWeight:500, marginTop:3, fontVariantNumeric:'tabular-nums' }}>
              {time}
            </div>
            <div style={{ fontSize:9, color:'#444', marginTop:2 }}>#{carNum} {team}</div>
          </div>
        ))}
      </div>

      {/* Table + time bars */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'start' }}>

        {/* Best lap table */}
        <div style={{
          flex:         2,
          background:   '#0f0f0f',
          border:       '0.5px solid #222',
          borderRadius: 8,
          overflow:     'hidden',
          minWidth:     400,
        }}>
          <div style={{
            display:             'grid',
            gridTemplateColumns: '32px 64px minmax(90px,1fr) 82px 62px 62px 62px 72px',
            padding:             '5px 10px',
            borderBottom:        '0.5px solid #1e1e1e',
            background:          '#111',
          }}>
            {['#','CLASS','DRIVER','BEST','S1','S2','S3','TOTAL'].map(h => (
              <span key={h} style={{ fontSize:9, color:'#444', textTransform:'uppercase', letterSpacing:0.5 }}>
                {h}
              </span>
            ))}
          </div>

          {driverStats.map((d, i) => {
            const prevClass    = i > 0 ? driverStats[i - 1].carClass : null
            const isClassBorder = prevClass !== null && d.carClass !== prevClass

            return (
              <div
                key={d.carNum}
                style={{
                  display:             'grid',
                  gridTemplateColumns: '32px 64px minmax(90px,1fr) 82px 62px 62px 62px 72px',
                  padding:             '5px 10px',
                  borderBottom:        '0.5px solid #141414',
                  borderTop:           isClassBorder ? '1px solid #2a2a2a' : undefined,
                  alignItems:          'center',
                }}
              >
                <span style={{ fontSize:10, color:'#888' }}>{d.carNum}</span>
                <ClassBadge carClass={d.carClass} />
                <div>
                  <div style={{ fontSize:10, color:'#ccc' }}>{d.driver}</div>
                  <div style={{ fontSize:8, color:'#444' }}>{d.team}</div>
                </div>
                <span style={{
                  fontSize:           10,
                  color:              d.isSessionBest ? '#cc44ff' : '#bbb',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {d.bestLap}
                </span>
                <span style={{ fontSize:9, color: d.s1 === sbS1.s1 ? '#cc44ff' : '#666', fontVariantNumeric:'tabular-nums' }}>{d.s1}</span>
                <span style={{ fontSize:9, color: d.s2 === sbS2.s2 ? '#cc44ff' : '#666', fontVariantNumeric:'tabular-nums' }}>{d.s2}</span>
                <span style={{ fontSize:9, color: d.s3 === sbS3.s3 ? '#cc44ff' : '#666', fontVariantNumeric:'tabular-nums' }}>{d.s3}</span>
                <span style={{ fontSize:9, color:'#555', fontVariantNumeric:'tabular-nums' }}>{d.totalTime}</span>
              </div>
            )
          })}
        </div>

        {/* Driving time bar chart */}
        <div style={{
          flex:         1,
          background:   '#0f0f0f',
          border:       '0.5px solid #222',
          borderRadius: 8,
          padding:      12,
          minWidth:     200,
        }}>
          <div style={{ fontSize:10, color:'#555', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>
            누적 주행시간
          </div>
          <div style={{ fontSize:8, color:'#333', marginBottom:8 }}>
            WEC 규정: 최소 1h / 최대 4h (단독 드라이버)
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            {driverStats.map(d => {
              const sec      = toSec(d.totalTime)
              const barPct   = (sec / MAX_SEC) * 100
              const tooMuch  = sec > MAX_SEC
              const tooFew   = sec < MIN_SEC
              const color    = tooMuch ? '#ff4444' : CLASS_COLOR[d.carClass]

              return (
                <div key={d.carNum} style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:9, color:'#777', width:20, textAlign:'right' }}>
                    {d.carNum}
                  </span>
                  <div style={{ flex:1, height:12, background:'#111', borderRadius:2, position:'relative' }}>
                    {/* Min driving time line */}
                    <div style={{
                      position:   'absolute',
                      left:       `${(MIN_SEC / MAX_SEC) * 100}%`,
                      top:        0, bottom:0,
                      width:      '0.5px',
                      background: '#2a2a2a',
                      zIndex:     2,
                    }} />
                    <div style={{
                      width:        `${Math.min(barPct, 100)}%`,
                      height:       '100%',
                      background:   color,
                      borderRadius: 2,
                      opacity:      tooFew ? 0.4 : 0.75,
                    }} />
                  </div>
                  <span style={{ fontSize:9, color:'#555', width:46, fontVariantNumeric:'tabular-nums' }}>
                    {d.totalTime.slice(0, 5)}
                  </span>
                </div>
              )
            })}
          </div>

          <div style={{ display:'flex', gap:10, marginTop:10, fontSize:8, color:'#333', flexWrap:'wrap' }}>
            <span>│ = 1h 기준선</span>
            <span style={{ color:'#ff4444' }}>■ 4h 초과</span>
          </div>
        </div>
      </div>
    </div>
  )
}

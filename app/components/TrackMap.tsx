'use client'

import type { Car } from '@/app/types/race'

const CLASS_COLOR: Record<string, string> = {
  HYPERCAR: '#ff4444',
  LMP2:     '#4488ff',
  LMGT3:    '#44cc55',
}

// Approximate positions on the SVG track (viewBox 0 0 480 380)
const CAR_POSITIONS: Record<number, [number, number]> = {
  2:  [335, 215],
  7:  [294, 270],
  6:  [258, 346],
  8:  [210, 185],
  10: [268, 148],
  22: [318, 268],
  37: [152, 79],
  77: [248, 242],
  91: [357, 238],
  55: [258, 356],
}

// Simplified Spa-Francorchamps outline
const TRACK_PATH = `
  M 370,215
  L 280,215
  Q 245,215 228,233
  Q 211,251 205,270
  Q 199,289 215,296
  Q 231,303 248,291
  L 260,276
  L 258,261
  L 248,246
  Q 232,218 210,186
  L 190,152
  L 170,112
  L 152,79
  Q 138,61 120,67
  Q 102,73 110,93
  Q 118,113 138,110
  L 154,106
  L 168,100
  L 188,95
  Q 210,91 235,105
  Q 260,119 270,147
  Q 280,175 268,197
  Q 256,219 264,243
  Q 272,267 295,272
  L 318,272
  Q 340,270 355,254
  Q 370,238 370,215
  Z
`

interface Props {
  cars: Car[]
  compact?: boolean
}

export default function TrackMap({ cars, compact }: Props) {
  return (
    <div style={{
      background:   '#0f0f0f',
      border:       '0.5px solid #2a2a2a',
      borderRadius: 8,
      padding:      compact ? 8 : 12,
      display:      'flex',
      flexDirection:'column',
      gap:          8,
    }}>
      {!compact && (
        <div style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 1 }}>
          트랙맵 — Spa-Francorchamps
        </div>
      )}

      <svg
        viewBox="0 0 480 380"
        style={{ width: '100%', height: compact ? 170 : 'auto' }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Pit lane */}
        <line x1="280" y1="211" x2="370" y2="211"
          stroke="#ff9900" strokeWidth="3" strokeDasharray="4,3" opacity="0.35" />

        {/* Track border (outer glow) */}
        <path d={TRACK_PATH} stroke="#1e1e1e" strokeWidth={compact ? 10 : 14}
          fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* Track surface */}
        <path d={TRACK_PATH} stroke="#2e2e2e" strokeWidth={compact ? 7 : 10}
          fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {/* Start/Finish line */}
        <line x1="370" y1="207" x2="370" y2="223" stroke="#fff" strokeWidth="2" />
        {!compact && (
          <text x="374" y="217" fontSize="8" fill="#888" dominantBaseline="middle">S/F</text>
        )}

        {/* Sector markers */}
        <line x1="148" y1="75" x2="157" y2="83"
          stroke="#ffff55" strokeWidth="1.5" opacity="0.6" />
        <line x1="264" y1="239" x2="272" y2="247"
          stroke="#ffff55" strokeWidth="1.5" opacity="0.6" />
        {!compact && (
          <>
            <text x="105" y="70" fontSize="7" fill="#ffff55" opacity="0.5">S2</text>
            <text x="274" y="252" fontSize="7" fill="#ffff55" opacity="0.5">S3</text>
          </>
        )}

        {/* Car dots */}
        {cars.map(car => {
          const [x, y] = CAR_POSITIONS[car.carNum] ?? [240, 190]
          const color   = CLASS_COLOR[car.carClass]
          const isPit   = car.status === 'PIT'
          const isOut   = car.status === 'OUT'
          const r       = compact ? 5 : 7
          const dotColor = isPit ? '#ff9900' : isOut ? '#ffaa00' : color

          return (
            <g key={car.carNum}>
              <circle cx={x} cy={y} r={r + 4} fill={dotColor} opacity="0.12" />
              <circle cx={x} cy={y} r={r}
                fill={dotColor} stroke="#000" strokeWidth="1"
                opacity={isPit ? 0.65 : 1}
              />
              {!compact && (
                <text x={x + r + 3} y={y + 1}
                  fontSize="8" fill={color} dominantBaseline="middle"
                  style={{ fontFamily: 'monospace' }}
                >
                  {car.carNum}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Class legend */}
      {!compact && (
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', fontSize:9, color:'#555' }}>
          {(['HYPERCAR','LMP2','LMGT3'] as const).map(cls => (
            <span key={cls} style={{ display:'flex', alignItems:'center', gap:4 }}>
              <span style={{
                width:8, height:8, borderRadius:'50%',
                background: CLASS_COLOR[cls], display:'inline-block',
              }} />
              {cls}
            </span>
          ))}
          <span style={{ display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:'#ff9900', display:'inline-block' }} />
            PIT
          </span>
          <span style={{ display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ width:16, height:2, background:'#ff9900', display:'inline-block', opacity:0.5 }} />
            피트 레인
          </span>
        </div>
      )}
    </div>
  )
}

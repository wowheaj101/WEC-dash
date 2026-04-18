'use client'

import { useState } from 'react'
import type { Message } from '@/app/types/race'
import ClassBadge from './ClassBadge'

type Filter = 'all' | 'pit' | 'driver_change' | 'safety_car' | 'incident' | 'fastest'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all',           label: '전체' },
  { id: 'pit',           label: '피트인·아웃' },
  { id: 'driver_change', label: '드라이버 교체' },
  { id: 'safety_car',    label: '세이프티카' },
  { id: 'incident',      label: '사고·페널티' },
  { id: 'fastest',       label: '패스티스트' },
]

function msgBg(type: Message['type']): string {
  switch (type) {
    case 'pit':           return '#160e00'
    case 'safety_car':    return '#1a0e00'
    case 'fastest':       return '#110018'
    case 'incident':      return '#1a0000'
    case 'driver_change': return '#001020'
    default:              return 'transparent'
  }
}

function msgColor(type: Message['type']): string {
  switch (type) {
    case 'pit':           return '#ff9900'
    case 'safety_car':    return '#ff7700'
    case 'fastest':       return '#cc44ff'
    case 'incident':      return '#ff4444'
    case 'driver_change': return '#4488ff'
    default:              return '#aaa'
  }
}

interface Props {
  messages: Message[]
  compact?: boolean
}

export default function MessageFeed({ messages, compact }: Props) {
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = filter === 'all'
    ? messages
    : messages.filter(m => m.type === filter)

  const displayed = compact ? filtered.slice(0, 7) : filtered

  return (
    <div style={{
      background:    '#0f0f0f',
      border:        '0.5px solid #2a2a2a',
      borderRadius:  8,
      overflow:      'hidden',
      display:       'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding:        '6px 10px',
        borderBottom:   '0.5px solid #1e1e1e',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        flexWrap:       'wrap',
        gap:            6,
      }}>
        <span style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: 1 }}>
          {compact ? '이벤트 로그' : '메시지 피드'}
        </span>
        {!compact && (
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                style={{
                  padding:     '2px 7px',
                  background:  filter === f.id ? '#222' : 'transparent',
                  color:       filter === f.id ? '#fff' : '#555',
                  border:      `0.5px solid ${filter === f.id ? '#444' : '#1e1e1e'}`,
                  borderRadius: 4,
                  fontSize:    9,
                  cursor:      'pointer',
                  fontFamily:  'monospace',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      <div style={{ overflowY: 'auto', maxHeight: compact ? 210 : 560 }}>
        {displayed.map(msg => (
          <div
            key={msg.id}
            style={{
              padding:      '5px 10px',
              borderBottom: '0.5px solid #141414',
              background:   msgBg(msg.type),
              display:      'flex',
              alignItems:   'flex-start',
              gap:          8,
            }}
          >
            <span style={{
              fontSize:           9,
              color:              '#3a3a3a',
              whiteSpace:         'nowrap',
              marginTop:          1,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {msg.timestamp}
            </span>
            {msg.carClass && (
              <span style={{ flexShrink: 0 }}>
                <ClassBadge carClass={msg.carClass} />
              </span>
            )}
            <span style={{ fontSize: 10, color: msgColor(msg.type), lineHeight: 1.5 }}>
              {msg.text}
            </span>
          </div>
        ))}
        {displayed.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', fontSize: 10, color: '#333' }}>
            해당 유형의 메시지가 없습니다
          </div>
        )}
      </div>
    </div>
  )
}

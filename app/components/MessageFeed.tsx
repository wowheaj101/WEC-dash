'use client'

import { useState } from 'react'
import { cn } from '@/app/lib/utils'
import type { Message } from '@/app/types/race'
import ClassBadge from './ClassBadge'

type Filter = 'all' | 'pit' | 'driver_change' | 'safety_car' | 'incident' | 'fastest'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all',           label: 'ALL' },
  { id: 'pit',           label: 'PIT' },
  { id: 'driver_change', label: 'DRIVER' },
  { id: 'safety_car',    label: 'SC' },
  { id: 'incident',      label: 'INCIDENT' },
  { id: 'fastest',       label: 'FASTEST' },
]

const MSG_COLOR: Record<string, string> = {
  pit:           'hsl(var(--pit))',
  safety_car:    'hsl(var(--flag-sc))',
  fastest:       'hsl(var(--fastest))',
  incident:      'hsl(var(--danger))',
  driver_change: 'hsl(var(--info))',
  general:       'hsl(var(--fg-2))',
}

const MSG_TITLE: Record<string, string> = {
  pit:           'PIT',
  safety_car:    'SAFETY CAR',
  fastest:       'FASTEST LAP',
  incident:      'INCIDENT',
  driver_change: 'DRIVER CHANGE',
  general:       'RACE CONTROL',
}

interface Props {
  messages: Message[]
  compact?: boolean
}

export default function MessageFeed({ messages, compact }: Props) {
  const [filter, setFilter] = useState<Filter>('all')

  // Sort by id descending — id is set to Date.now() at creation, so the
  // largest id is the most recent message. Latest first in the UI.
  const filtered  = (filter === 'all' ? messages : messages.filter(m => m.type === filter))
  const sorted    = [...filtered].sort((a, b) => b.id - a.id)
  const displayed = compact ? sorted.slice(0, 7) : sorted

  return (
    <div className="panel flex flex-col overflow-hidden min-h-0">
      <div className="panel-header">
        <span>RACE CONTROL FEED</span>
        {!compact && (
          <div className="ml-auto flex gap-1 flex-wrap">
            {FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn('btn-ghost', filter === f.id && 'on')}
                style={{ padding: '3px 10px' }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={cn('overflow-y-auto flex-1 min-h-0', compact && 'max-h-[260px]')}>
        {displayed.map(msg => {
          const color = MSG_COLOR[msg.type] ?? MSG_COLOR.general
          const title = MSG_TITLE[msg.type] ?? 'RACE CONTROL'
          return (
            <div
              key={msg.id}
              className="grid items-start gap-2.5 px-3.5 py-2.5 border-b border-line1"
              style={{ gridTemplateColumns: '4px 70px 1fr' }}
            >
              <div style={{ width: 3, background: color, height: 36, marginTop: 2 }} />
              <div className="mono text-[11px] text-fg3 pt-[3px]">{msg.timestamp}</div>
              <div className="min-w-0">
                <div
                  className="disp font-bold text-[11px] tracking-[1.5px] uppercase flex items-center gap-2 flex-wrap"
                  style={{ color }}
                >
                  {title}
                  {msg.carClass && <ClassBadge carClass={msg.carClass} size={9} />}
                  {msg.carNum != null && (
                    <span className="mono text-[11px] text-fg2 font-normal">#{msg.carNum}</span>
                  )}
                </div>
                <div className="text-[12px] text-fg1 mt-1 leading-[1.4]">{msg.text}</div>
              </div>
            </div>
          )
        })}
        {displayed.length === 0 && (
          <div className="py-10 text-center text-[11px] text-fg3">
            해당 유형의 메시지가 없습니다
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { cn } from '@/app/lib/utils'
import { Button } from '@/app/components/ui/button'
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

const MSG_STYLE: Record<string, { bg: string; text: string }> = {
  pit:           { bg: 'bg-[hsl(var(--pit-bg))]',     text: 'text-[hsl(var(--pit))]' },
  safety_car:    { bg: 'bg-[#1a0e00]',                text: 'text-[#ff7700]' },
  fastest:       { bg: 'bg-[hsl(var(--purple-bg))]',  text: 'text-[hsl(var(--purple))]' },
  incident:      { bg: 'bg-[hsl(var(--danger-bg))]',  text: 'text-[hsl(var(--danger))]' },
  driver_change: { bg: 'bg-[hsl(var(--info-bg))]',    text: 'text-[hsl(var(--info))]' },
}

function msgStyle(type: Message['type']) {
  return MSG_STYLE[type] ?? { bg: 'bg-transparent', text: 'text-foreground' }
}

interface Props {
  messages: Message[]
  compact?: boolean
}

export default function MessageFeed({ messages, compact }: Props) {
  const [filter, setFilter] = useState<Filter>('all')

  const filtered  = filter === 'all' ? messages : messages.filter(m => m.type === filter)
  const displayed = compact ? filtered.slice(0, 7) : filtered

  return (
    <div className="panel flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 px-3 py-2 border-b border-border">
        <span className="section-label">{compact ? '이벤트 로그' : '메시지 피드'}</span>
        {!compact && (
          <div className="flex gap-1 flex-wrap">
            {FILTERS.map(f => (
              <Button
                key={f.id}
                size="sm"
                variant={filter === f.id ? 'active' : 'ghost'}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      <div className={cn('overflow-y-auto', compact ? 'max-h-[210px]' : 'max-h-[560px]')}>
        {displayed.map(msg => {
          const s = msgStyle(msg.type)
          return (
            <div
              key={msg.id}
              className={cn(
                'flex items-start gap-2 px-3 py-2 border-b border-[hsl(var(--background))] text-[10px]',
                s.bg
              )}
            >
              <span className="text-[9px] text-muted-foreground whitespace-nowrap mt-0.5 tabular shrink-0">
                {msg.timestamp}
              </span>
              {msg.carClass && (
                <span className="shrink-0">
                  <ClassBadge carClass={msg.carClass} />
                </span>
              )}
              <span className={cn('leading-relaxed', s.text)}>{msg.text}</span>
            </div>
          )
        })}
        {displayed.length === 0 && (
          <div className="py-8 text-center text-[10px] text-muted-foreground">
            해당 유형의 메시지가 없습니다
          </div>
        )}
      </div>
    </div>
  )
}

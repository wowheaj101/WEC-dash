'use client'

import type { Message } from '@/app/types/race'

export default function Ticker({ messages }: { messages: Message[] }) {
  const items = (messages.length > 0 ? messages : [
    { timestamp: '—', type: 'general' as const, text: 'Awaiting race control messages…' } as Message,
  ])
    .slice(0, 20)
    .map(m => `${m.timestamp}  ${m.text}`)
    .join('       ')

  return (
    <div className="h-9 bg-accent text-white flex items-center overflow-hidden shrink-0">
      {/* Red-on-black "RACE CONTROL" chevron tag */}
      <div
        className="disp bg-black text-accent flex items-center font-bold px-7 h-full"
        style={{
          fontSize: 11,
          letterSpacing: 2.5,
          clipPath: 'polygon(0 0, 100% 0, calc(100% - 16px) 100%, 0 100%)',
        }}
      >
        <span className="pulse w-2 h-2 rounded-full bg-accent mr-2.5" />
        RACE CONTROL
      </div>

      {/* Scrolling text */}
      <div
        className="flex-1 overflow-hidden relative"
        style={{ maskImage: 'linear-gradient(90deg, #000 0, #000 96%, transparent 100%)' }}
      >
        <div
          className="mono ticker-track whitespace-nowrap inline-flex"
          style={{ fontSize: 12, fontWeight: 600, paddingLeft: 24 }}
        >
          <span>{items}       {items}</span>
        </div>
      </div>
    </div>
  )
}

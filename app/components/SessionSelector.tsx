'use client'

import { cn } from '@/app/lib/utils'
import { shortSessionLabel, type EventMeta, type SessionMeta } from '@/app/lib/griiipResults'

interface Props {
  event:       EventMeta | null
  sessions:    SessionMeta[]
  selectedSid: number | null   // null = LIVE
  onSelect:    (sid: number | null) => void
  loading:     boolean
  isLive:      boolean         // is the live SignalR feed currently connected
  liveSid:     number | null   // sid of the currently-streamed session, if any
}

export default function SessionSelector({
  event, sessions, selectedSid, onSelect, loading, isLive, liveSid,
}: Props) {
  const now = Date.now()

  // A session is selectable once it has started (date-based; isRunning is unreliable).
  const startedSessions = sessions.filter(s => new Date(s.startTime).getTime() <= now)

  // The LIVE button and the live-session button are data-linked: clicking either
  // means "show live data". `selectedSid === liveSid` is treated identically to
  // `selectedSid === null`.
  const onLive = isLive && (selectedSid === null || selectedSid === liveSid)

  return (
    <div className="panel flex items-center gap-2 px-3 py-2 flex-wrap">
      <span className="section-label whitespace-nowrap">SESSION</span>

      <button
        onClick={() => onSelect(null)}
        className={cn(
          'btn-ghost',
          onLive       && 'live-on',
          !onLive && isLive   && 'live-idle',
          !isLive && selectedSid === null && 'on',
        )}
        style={{ padding: '3px 10px' }}
      >
        <span className="inline-flex items-center gap-1.5">
          <span className={cn(
            'w-1.5 h-1.5 rounded-full',
            isLive ? 'bg-live dot-blink' : 'bg-fg3',
          )} />
          LIVE
        </span>
      </button>

      {loading && (
        <span className="mono text-[10px] text-fg3 ml-1">불러오는 중…</span>
      )}

      {!loading && startedSessions.length === 0 && (
        <span className="mono text-[10px] text-fg3 ml-1">완료된 세션 없음</span>
      )}

      {startedSessions.map(s => {
        const ended       = new Date(s.endTime).getTime() < now
        const isLiveOne   = liveSid != null && s.id === liveSid && isLive
        const userPicked  = selectedSid === s.id
        // Live session button reflects the same "active" state as the LIVE button.
        const liveActive  = isLiveOne && onLive
        const idleActive  = !isLiveOne && userPicked
        return (
          <button
            key={s.id}
            // Clicking the live session is equivalent to clicking LIVE.
            onClick={() => onSelect(isLiveOne ? null : s.id)}
            className={cn(
              'btn-ghost',
              liveActive && 'live-on',
              isLiveOne && !liveActive && 'live-idle',
              idleActive && 'on',
            )}
            style={{ padding: '3px 10px' }}
            title={`${s.name} · ${new Date(s.startTime).toLocaleString('ko-KR')}`}
          >
            <span className="inline-flex items-center gap-1.5">
              {isLiveOne
                ? <span className="w-1.5 h-1.5 rounded-full bg-live dot-blink" />
                : !ended && <span className="w-1.5 h-1.5 rounded-full bg-warning dot-blink" />
              }
              {shortSessionLabel(s)}
            </span>
          </button>
        )
      })}

      {event && (
        <span className="mono text-[10px] text-fg3 ml-auto whitespace-nowrap">
          {event.name}
        </span>
      )}
    </div>
  )
}

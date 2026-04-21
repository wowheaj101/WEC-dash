'use client'

import { cn } from '@/app/lib/utils'
import { Slider } from '@/app/components/ui/slider'
import type { RaceMeta, RaceSnapshot } from '@/app/types/replay'

interface Props {
  meta:       RaceMeta
  snapshots:  RaceSnapshot[]
  currentIdx: number
  isPlaying:  boolean
  onSeek:     (idx: number) => void
  onPlay:     () => void
  onPause:    () => void
  onClose:    () => void
}

function fmt(ts: number) {
  return new Date(ts).toLocaleTimeString('ko-KR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  })
}

export default function ReplayControls({
  meta, snapshots, currentIdx, isPlaying,
  onSeek, onPlay, onPause, onClose,
}: Props) {
  const current = snapshots[currentIdx]
  const total   = snapshots.length

  return (
    <div className="panel flex flex-col gap-3 px-4 py-3" style={{ borderLeft: '3px solid hsl(var(--pit))' }}>
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="disp font-bold text-pit text-[11px] tracking-[1.5px] shrink-0">📼 REPLAY</span>
        <span className="disp text-fg0 text-[13px] font-semibold flex-1 truncate">
          {meta.countryFlag} {meta.name}
        </span>
        {current && (
          <span className="mono text-[10px] text-fg3 shrink-0">
            {current.raceInfo.elapsed} · {fmt(current.ts)} UTC
          </span>
        )}
        <button onClick={onClose} className="btn-ghost">✕ CLOSE</button>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-3">
        <button
          onClick={isPlaying ? onPause : onPlay}
          disabled={total === 0}
          className={cn(
            'disp shrink-0 px-4 py-1.5 font-bold text-[11px] tracking-[1.5px] uppercase cursor-pointer border transition-colors disabled:opacity-40',
            isPlaying
              ? 'bg-pit text-black border-pit'
              : 'bg-live text-black border-live',
          )}
        >
          {isPlaying ? '⏸ PAUSE' : '▶ PLAY'}
        </button>

        <div className="flex-1">
          <Slider
            min={0}
            max={Math.max(0, total - 1)}
            value={[currentIdx]}
            onValueChange={([v]) => onSeek(v)}
          />
        </div>

        <span className="mono text-[11px] text-fg2 shrink-0 min-w-[60px] text-right">
          {currentIdx + 1} / {total}
        </span>
      </div>

      {/* Snapshot dots */}
      {total > 0 && total <= 60 && (
        <div className="flex gap-1 flex-wrap">
          {snapshots.map((_, i) => (
            <button
              key={i}
              onClick={() => onSeek(i)}
              className={cn(
                'w-2 h-2 rounded-full shrink-0 cursor-pointer transition-colors',
                i === currentIdx
                  ? 'bg-pit'
                  : i < currentIdx
                    ? 'bg-[hsl(var(--pit-border))]'
                    : 'bg-bg3',
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}

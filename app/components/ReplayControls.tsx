'use client'

import { cn } from '@/app/lib/utils'
import { Button } from '@/app/components/ui/button'
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
    <div className="panel px-4 py-3 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[hsl(var(--pit))] text-[11px] font-semibold shrink-0">📼 REPLAY</span>
        <span className="text-foreground text-[11px] flex-1 truncate">
          {meta.countryFlag} {meta.name}
        </span>
        {current && (
          <span className="text-[10px] text-muted-foreground tabular shrink-0">
            {current.raceInfo.elapsed} 경과 · {fmt(current.ts)} UTC
          </span>
        )}
        <Button size="sm" variant="ghost" onClick={onClose}>✕ 닫기</Button>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          variant={isPlaying ? 'accent' : 'live'}
          onClick={isPlaying ? onPause : onPlay}
          disabled={total === 0}
          className="shrink-0"
        >
          {isPlaying ? '⏸ 일시정지' : '▶ 재생'}
        </Button>

        <div className="flex-1">
          <Slider
            min={0}
            max={Math.max(0, total - 1)}
            value={[currentIdx]}
            onValueChange={([v]) => onSeek(v)}
          />
        </div>

        <span className="text-[10px] text-muted-foreground tabular shrink-0 min-w-[52px] text-right">
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
                  ? 'bg-[hsl(var(--pit))]'
                  : i < currentIdx
                    ? 'bg-[hsl(var(--pit-border))]'
                    : 'bg-surface3'
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}

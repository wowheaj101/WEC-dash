'use client'

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
    hour: '2-digit', minute: '2-digit',
    timeZone: 'UTC',
  })
}

export default function ReplayControls({
  meta, snapshots, currentIdx, isPlaying,
  onSeek, onPlay, onPause, onClose,
}: Props) {
  const current = snapshots[currentIdx]
  const total   = snapshots.length

  return (
    <div style={{
      background:   '#0f0f0f',
      border:       '0.5px solid #2a2a2a',
      borderRadius: 8,
      padding:      '10px 14px',
      display:      'flex',
      flexDirection:'column',
      gap:          8,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, color: '#ff9900' }}>📼 REPLAY</span>
        <span style={{ fontSize: 11, color: '#ccc', flex: 1 }}>
          {meta.countryFlag} {meta.name}
        </span>
        {current && (
          <span style={{ fontSize: 10, color: '#555' }}>
            {current.raceInfo.elapsed} 경과 ({fmt(current.ts)} UTC)
          </span>
        )}
        <button
          onClick={onClose}
          style={{
            background:   'transparent',
            border:       '0.5px solid #333',
            borderRadius: 4,
            color:        '#555',
            fontSize:     9,
            padding:      '2px 8px',
            cursor:       'pointer',
            fontFamily:   'monospace',
          }}
        >
          닫기
        </button>
      </div>

      {/* Timeline slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Play / Pause */}
        <button
          onClick={isPlaying ? onPause : onPlay}
          disabled={total === 0}
          style={{
            background:   isPlaying ? '#1a0e00' : '#001a00',
            border:       `0.5px solid ${isPlaying ? '#553300' : '#005500'}`,
            borderRadius: 4,
            color:        isPlaying ? '#ff9900' : '#00ee55',
            fontSize:     11,
            padding:      '4px 10px',
            cursor:       'pointer',
            fontFamily:   'monospace',
            flexShrink:   0,
          }}
        >
          {isPlaying ? '⏸ 일시정지' : '▶ 재생'}
        </button>

        {/* Slider */}
        <input
          type="range"
          min={0}
          max={Math.max(0, total - 1)}
          value={currentIdx}
          onChange={e => onSeek(Number(e.target.value))}
          style={{ flex: 1, accentColor: '#ff9900', cursor: 'pointer' }}
        />

        {/* Counter */}
        <span style={{ fontSize: 10, color: '#444', flexShrink: 0, minWidth: 60, textAlign: 'right' }}>
          {currentIdx + 1} / {total}
        </span>
      </div>

      {/* Snapshot timeline dots (compact) */}
      {total > 0 && total <= 60 && (
        <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {snapshots.map((_, i) => (
            <div
              key={i}
              onClick={() => onSeek(i)}
              style={{
                width:        8, height: 8,
                borderRadius: '50%',
                background:   i === currentIdx ? '#ff9900' : i < currentIdx ? '#553300' : '#1e1e1e',
                cursor:       'pointer',
                flexShrink:   0,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

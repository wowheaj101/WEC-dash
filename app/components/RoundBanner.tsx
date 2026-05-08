'use client'

import { useEffect, useState } from 'react'
import { CURRENT_SEASON } from '@/app/data/calendar'
import { getCountdown, getRoundStatus, type Countdown } from '@/app/lib/getRoundStatus'
import { shortSessionLabel, type SessionMeta } from '@/app/lib/griiipResults'

interface Props {
  isLive:    boolean
  sessions?: SessionMeta[]
}

interface NextEvent {
  kind:      'session' | 'round'
  label:     string
  sublabel:  string
  startTime: string
}

function findNextEvent(sessions: SessionMeta[]): NextEvent | null {
  const status = getRoundStatus(CURRENT_SEASON)
  const now    = Date.now()

  const upcoming = sessions
    .filter(s => new Date(s.startTime).getTime() > now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

  if (upcoming[0]) {
    const r = status.current ?? status.next
    return {
      kind:      'session',
      label:     shortSessionLabel(upcoming[0]),
      sublabel:  r ? `${upcoming[0].name} · ${r.countryFlag} ${r.name}` : upcoming[0].name,
      startTime: upcoming[0].startTime,
    }
  }

  if (status.next) {
    return {
      kind:      'round',
      label:     `R${status.next.round} ${status.next.countryFlag} ${status.next.name}`,
      sublabel:  `${status.next.circuit} · ${status.next.duration}`,
      startTime: status.next.raceStart,
    }
  }

  return null
}

export default function RoundBanner({ isLive, sessions = [] }: Props) {
  const [next, setNext]         = useState<NextEvent | null>(null)
  const [cd,   setCd]           = useState<Countdown | null>(null)
  const [flashing, setFlashing] = useState(false)

  useEffect(() => {
    let prev: number | null = null
    let flashId: ReturnType<typeof setTimeout> | null = null

    const tick = () => {
      const ne = findNextEvent(sessions)
      setNext(ne)
      if (!ne) {
        setCd(null)
        prev = null
        return
      }
      const c = getCountdown(ne.startTime)
      if (prev !== null && prev > 0 && c.totalMs <= 0) {
        setFlashing(true)
        if (flashId) clearTimeout(flashId)
        flashId = setTimeout(() => setFlashing(false), 3000)
      }
      prev = c.totalMs
      setCd(c)
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => {
      clearInterval(id)
      if (flashId) clearTimeout(flashId)
    }
  }, [sessions])

  // Hide during a live race — but keep the banner up for the 3 s green flash
  // even if isLive flips true the moment the timer hits zero.
  if (!flashing && isLive) return null
  if (!next || !cd)        return null

  const pad = (n: number) => String(n).padStart(2, '0')

  const accent = flashing ? 'hsl(var(--lmgt3))' : 'hsl(var(--accent))'
  const numCol = flashing ? 'hsl(var(--lmgt3))' : 'hsl(var(--fg0))'

  return (
    <div
      className="flex flex-col items-center justify-center gap-2.5 px-6 py-4 border-b-2 transition-colors duration-500"
      style={{
        background:        flashing ? 'hsl(var(--lmgt3) / 0.16)' : 'hsl(var(--bg1))',
        borderBottomColor: accent,
      }}
    >
      {/* Tag — small uppercase strip with NEXT label + short code */}
      <div className="flex items-center gap-2.5 disp text-[11px] tracking-[2.5px] uppercase">
        <span style={{ color: accent }} className="font-bold">
          {flashing
            ? '● STARTING NOW'
            : next.kind === 'session' ? 'NEXT SESSION' : 'NEXT ROUND'}
        </span>
        <span className="text-fg4">/</span>
        <span className="text-fg0 font-bold">{next.label}</span>
      </div>

      {/* Countdown — DD : HH : MM : SS */}
      <div className="flex items-end gap-2 sm:gap-3">
        <Unit value={pad(cd.d)} label="DAY"  color={numCol} />
        <Colon color={numCol} />
        <Unit value={pad(cd.h)} label="HOUR" color={numCol} />
        <Colon color={numCol} />
        <Unit value={pad(cd.m)} label="MIN"  color={numCol} />
        <Colon color={numCol} />
        <Unit value={pad(cd.s)} label="SEC"  color={numCol} />
      </div>

      {/* Subline — full session/round name */}
      <span className="mono text-[11px] text-fg3 text-center truncate max-w-full">
        {next.sublabel}
      </span>
    </div>
  )
}

function Unit({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center min-w-[68px]">
      <span
        className="mono text-[52px] font-bold leading-none tabular-nums"
        style={{ color }}
      >
        {value}
      </span>
      <span className="disp text-[9px] tracking-[2px] text-fg3 mt-2 uppercase">{label}</span>
    </div>
  )
}

function Colon({ color }: { color: string }) {
  return (
    <span
      className="mono text-[52px] font-bold leading-none -translate-y-[14px]"
      style={{ color }}
    >
      :
    </span>
  )
}

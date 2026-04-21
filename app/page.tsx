'use client'

import Header          from '@/app/components/Header'
import FlagBanner      from '@/app/components/FlagBanner'
import StatsBar        from '@/app/components/StatsBar'
import Leaderboard     from '@/app/components/Leaderboard'
import Legend          from '@/app/components/Legend'
import TrackMap        from '@/app/components/TrackMap'
import StintOverview   from '@/app/components/StintOverview'
import MessageFeed     from '@/app/components/MessageFeed'
import DriverAnalysis  from '@/app/components/DriverAnalysis'
import StintAnalysis   from '@/app/components/StintAnalysis'
import RoundBanner     from '@/app/components/RoundBanner'
import ReplayBrowser   from '@/app/components/ReplayBrowser'
import ReplayControls  from '@/app/components/ReplayControls'
import Ticker          from '@/app/components/Ticker'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs'
import { cn }          from '@/app/lib/utils'
import { useTiming71, type ConnStatus } from '@/app/hooks/useTiming71'
import { useReplay }   from '@/app/hooks/useReplay'

// ── Connection status badge (broadcast look) ──────────────────────

const STATUS_CFG: Record<ConnStatus, {
  dotClass: string; bgClass: string; borderClass: string; textClass: string; label: string
}> = {
  idle:             { dotClass: 'bg-fg3',     bgClass: 'bg-bg1',                     borderClass: 'border-line2',                        textClass: 'text-fg3',     label: 'IDLE' },
  connecting:       { dotClass: 'bg-warning', bgClass: 'bg-[hsl(var(--warning-bg))]', borderClass: 'border-[hsl(var(--warning-border))]', textClass: 'text-warning', label: 'CONNECTING' },
  connected:        { dotClass: 'bg-warning', bgClass: 'bg-[hsl(var(--warning-bg))]', borderClass: 'border-[hsl(var(--warning-border))]', textClass: 'text-warning', label: 'CONNECTED' },
  discovering:      { dotClass: 'bg-warning', bgClass: 'bg-[hsl(var(--warning-bg))]', borderClass: 'border-[hsl(var(--warning-border))]', textClass: 'text-warning', label: 'DISCOVERING' },
  live:             { dotClass: 'bg-live',    bgClass: 'bg-[hsl(var(--live-bg))]',    borderClass: 'border-[hsl(var(--live-border))]',    textClass: 'text-live',    label: 'LIVE' },
  no_service:       { dotClass: 'bg-pit',     bgClass: 'bg-[hsl(var(--pit-bg))]',     borderClass: 'border-[hsl(var(--pit-border))]',     textClass: 'text-pit',     label: 'NO WEC SERVICE' },
  showing_previous: { dotClass: 'bg-accent',  bgClass: 'bg-bg2',                      borderClass: 'border-accent',                       textClass: 'text-accent',  label: 'PREVIOUS ROUND' },
  disconnected:     { dotClass: 'bg-danger',  bgClass: 'bg-[hsl(var(--danger-bg))]',  borderClass: 'border-[hsl(var(--danger-border))]',  textClass: 'text-danger',  label: 'RECONNECTING' },
  error:            { dotClass: 'bg-danger',  bgClass: 'bg-[hsl(var(--danger-bg))]',  borderClass: 'border-[hsl(var(--danger-border))]',  textClass: 'text-danger',  label: 'ERROR' },
}

function ConnBadge({ status, serviceName, reconnect }: {
  status:      ConnStatus
  serviceName: string | null
  reconnect:   () => void
}) {
  const cfg     = STATUS_CFG[status]
  const isPulse = status === 'live'

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={cn(
        'disp inline-flex items-center gap-2 px-2.5 py-1 text-[10px] font-bold tracking-[1.5px] border whitespace-nowrap',
        cfg.bgClass, cfg.borderClass, cfg.textClass,
      )}>
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dotClass, isPulse && 'dot-blink')} />
        {cfg.label}
        {serviceName && status === 'live' && (
          <span className="mono text-[9px] font-normal opacity-80">— {serviceName}</span>
        )}
      </span>

      {(status === 'no_service' || status === 'showing_previous' || status === 'error' || status === 'disconnected') && (
        <button onClick={reconnect} className="btn-ghost" style={{ padding: '3px 10px' }}>
          RECONNECT
        </button>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────

export default function Page() {
  const {
    status, serviceName, reconnect,
    cars, raceInfo, stats, messages, carStints, driverStats, isLive,
  } = useTiming71()

  const replay = useReplay()

  const isReplayMode      = replay.selectedMeta !== null && replay.current !== null
  const isShowingPrevious = !isReplayMode && status === 'showing_previous'
  const displayCars     = isReplayMode ? replay.current!.cars     : cars
  const displayRaceInfo = isReplayMode ? replay.current!.raceInfo : raceInfo
  const displayStats    = isReplayMode ? replay.current!.stats    : stats
  const displayMessages = isReplayMode ? replay.current!.messages : messages

  return (
    <div className="min-h-screen bg-bg0 text-fg1 flex flex-col">
      {/* ── Broadcast hero ribbon ── */}
      <Header
        info={displayRaceInfo}
        stats={displayStats}
        isLive={isLive && !isReplayMode}
        showingPrevious={isShowingPrevious}
      />

      {/* ── Tabs (broadcast bar) + connection badge ── */}
      <Tabs defaultValue="dashboard" className="flex flex-col">
        <div className="flex items-stretch bg-bg1 border-b border-line2">
          <TabsList className="flex-1 min-w-0 border-b-0 bg-transparent">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="trackmap">Track</TabsTrigger>
            <TabsTrigger value="drivers">Drivers</TabsTrigger>
            <TabsTrigger value="stints">Stints</TabsTrigger>
            <TabsTrigger value="messages">Control</TabsTrigger>
            <TabsTrigger value="replay">Replay</TabsTrigger>
          </TabsList>
          <div className="flex items-center px-4 gap-2">
            <ConnBadge status={status} serviceName={serviceName} reconnect={reconnect} />
          </div>
        </div>

        {/* ── Flag strip + round banner ── */}
        <FlagBanner flag={displayRaceInfo.flag} />
        {!isReplayMode && <RoundBanner isLive={isLive} showingPrevious={isShowingPrevious} />}

        {/* ── Tab content ── */}
        <div className="flex-1 px-6 py-5 min-h-0">
          {/* Tab 1: Dashboard */}
          <TabsContent value="dashboard" className="flex flex-col gap-3">
            {isReplayMode && replay.selectedMeta && replay.snapshots.length > 0 && (
              <ReplayControls
                meta={replay.selectedMeta}
                snapshots={replay.snapshots}
                currentIdx={replay.currentIdx}
                isPlaying={replay.isPlaying}
                onSeek={replay.seek}
                onPlay={replay.play}
                onPause={replay.pause}
                onClose={replay.clearRace}
              />
            )}
            <StatsBar stats={displayStats} />
            <div className="grid gap-3" style={{ gridTemplateColumns: 'minmax(0,1fr) 420px' }}>
              <div className="flex flex-col gap-3 min-w-0">
                <Leaderboard cars={displayCars} />
                <Legend />
              </div>
              <div className="flex flex-col gap-3 min-h-0">
                <div className="panel flex flex-col min-h-0" style={{ height: 280 }}>
                  <div className="panel-header">LIVE TRACK</div>
                  <div className="flex-1 p-1.5 min-h-0 relative">
                    <TrackMap cars={displayCars} compact isLive={isLive && !isReplayMode} />
                  </div>
                </div>
                <StintOverview carStints={carStints} cars={displayCars} leaderLap={displayStats.leaderLap} />
                <MessageFeed messages={displayMessages} compact />
              </div>
            </div>
          </TabsContent>

          {/* Tab 2: Track Map */}
          <TabsContent value="trackmap">
            <div className="panel flex flex-col" style={{ height: 'calc(100vh - 260px)', minHeight: 520 }}>
              <div className="panel-header">LIVE TRACK</div>
              <div className="flex-1 p-3 min-h-0 relative">
                <TrackMap cars={displayCars} isLive={isLive && !isReplayMode} />
              </div>
            </div>
          </TabsContent>

          {/* Tab 3: Driver Analysis */}
          <TabsContent value="drivers">
            <DriverAnalysis driverStats={driverStats} />
          </TabsContent>

          {/* Tab 4: Stint Analysis */}
          <TabsContent value="stints">
            <StintAnalysis carStints={carStints} totalLaps={displayStats.leaderLap} />
          </TabsContent>

          {/* Tab 5: Messages */}
          <TabsContent value="messages">
            <MessageFeed messages={displayMessages} />
          </TabsContent>

          {/* Tab 6: Replay */}
          <TabsContent value="replay" className="flex flex-col gap-3">
            <div className="panel flex items-center gap-3 px-4 py-3">
              <span className="section-label whitespace-nowrap">PREVIOUS RACE</span>
              <select
                value={replay.selectedMeta?.id ?? ''}
                onChange={e => {
                  const meta = replay.raceList.find(r => r.id === e.target.value)
                  if (meta) replay.selectRace(meta)
                }}
                disabled={replay.listLoading}
                className="mono flex-1 bg-bg2 text-fg0 border border-line2 px-2 py-1.5 text-[11px] outline-none cursor-pointer"
              >
                <option value="" disabled>
                  {replay.listLoading ? '불러오는 중…' : replay.raceList.length === 0 ? '저장된 레이스 없음' : 'SELECT RACE…'}
                </option>
                {Object.entries(
                  replay.raceList.reduce<Record<number, typeof replay.raceList>>((acc, r) => {
                    ;(acc[r.year] ??= []).push(r)
                    return acc
                  }, {})
                )
                  .sort(([a], [b]) => Number(b) - Number(a))
                  .map(([year, races]) => (
                    <optgroup key={year} label={`${year} Season`}>
                      {races
                        .sort((a, b) => a.round - b.round)
                        .map(r => (
                          <option key={r.id} value={r.id}>
                            {r.countryFlag} R{r.round} — {r.name} ({r.duration}) · {r.snapshots} snaps
                          </option>
                        ))}
                    </optgroup>
                  ))}
              </select>
              {replay.selectedMeta && (
                <button onClick={replay.clearRace} className="btn-ghost">✕ CLOSE</button>
              )}
            </div>

            {replay.selectedMeta && replay.snapshots.length > 0 && (
              <ReplayControls
                meta={replay.selectedMeta}
                snapshots={replay.snapshots}
                currentIdx={replay.currentIdx}
                isPlaying={replay.isPlaying}
                onSeek={replay.seek}
                onPlay={replay.play}
                onPause={replay.pause}
                onClose={replay.clearRace}
              />
            )}

            {!replay.selectedMeta && (
              <ReplayBrowser
                raceList={replay.raceList}
                loading={replay.listLoading}
                onSelect={replay.selectRace}
              />
            )}

            {replay.selectedMeta && replay.dataLoading && (
              <div className="py-10 text-center text-[12px] text-fg3">
                레이스 데이터 불러오는 중…
              </div>
            )}

            {isReplayMode && (
              <>
                <StatsBar stats={displayStats} />
                <div className="grid gap-3" style={{ gridTemplateColumns: 'minmax(0,1fr) 420px' }}>
                  <div className="flex flex-col gap-3 min-w-0">
                    <Leaderboard cars={displayCars} />
                    <Legend />
                  </div>
                  <div className="flex flex-col gap-3 min-h-0">
                    <div className="panel flex flex-col min-h-0" style={{ height: 280 }}>
                      <div className="panel-header">LIVE TRACK</div>
                      <div className="flex-1 p-1.5 min-h-0 relative">
                        <TrackMap cars={displayCars} compact isLive={false} circuitKey={replay.selectedMeta?.circuit} />
                      </div>
                    </div>
                    <MessageFeed messages={displayMessages} compact />
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </div>
      </Tabs>

      {/* ── Bottom race-control ticker ── */}
      <Ticker messages={displayMessages} />

      <footer className="mono text-[9px] text-fg4 text-center py-2">
        WEC LIVE DASHBOARD · {isReplayMode
          ? `REPLAY — ${replay.selectedMeta!.name}`
          : isLive ? `LIVE · ${serviceName}` : 'DEMO'}
      </footer>
    </div>
  )
}

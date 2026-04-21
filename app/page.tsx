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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs'
import { cn }          from '@/app/lib/utils'
import { useTiming71, type ConnStatus } from '@/app/hooks/useTiming71'
import { useReplay }   from '@/app/hooks/useReplay'

// ── Connection status badge ────────────────────────────────────────

const STATUS_CFG: Record<ConnStatus, {
  dotClass: string; bgClass: string; borderClass: string; textClass: string; label: string
}> = {
  idle:         { dotClass: 'bg-muted-foreground', bgClass: 'bg-surface1',                   borderClass: 'border-border',                         textClass: 'text-muted-foreground', label: 'IDLE'           },
  connecting:   { dotClass: 'bg-[hsl(var(--warning))]', bgClass: 'bg-[hsl(var(--warning-bg))]', borderClass: 'border-[hsl(var(--warning-border))]', textClass: 'text-[hsl(var(--warning))]', label: 'CONNECTING…'  },
  connected:    { dotClass: 'bg-[hsl(var(--warning))]', bgClass: 'bg-[hsl(var(--warning-bg))]', borderClass: 'border-[hsl(var(--warning-border))]', textClass: 'text-[hsl(var(--warning))]', label: 'CONNECTED'    },
  discovering:  { dotClass: 'bg-[hsl(var(--warning))]', bgClass: 'bg-[hsl(var(--warning-bg))]', borderClass: 'border-[hsl(var(--warning-border))]', textClass: 'text-[hsl(var(--warning))]', label: 'DISCOVERING…' },
  live:         { dotClass: 'bg-[hsl(var(--live))]',    bgClass: 'bg-[hsl(var(--live-bg))]',    borderClass: 'border-[hsl(var(--live-border))]',    textClass: 'text-[hsl(var(--live))]',    label: 'LIVE'          },
  no_service:   { dotClass: 'bg-[hsl(var(--pit))]',     bgClass: 'bg-[hsl(var(--pit-bg))]',     borderClass: 'border-[hsl(var(--pit-border))]',     textClass: 'text-[hsl(var(--pit))]',     label: 'NO WEC SERVICE' },
  disconnected: { dotClass: 'bg-[hsl(var(--danger))]',  bgClass: 'bg-[hsl(var(--danger-bg))]',  borderClass: 'border-[hsl(var(--danger-border))]',  textClass: 'text-[hsl(var(--danger))]',  label: 'RECONNECTING…' },
  error:        { dotClass: 'bg-[hsl(var(--danger))]',  bgClass: 'bg-[hsl(var(--danger-bg))]',  borderClass: 'border-[hsl(var(--danger-border))]',  textClass: 'text-[hsl(var(--danger))]',  label: 'ERROR'          },
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
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] border whitespace-nowrap',
        cfg.bgClass, cfg.borderClass, cfg.textClass
      )}>
        <span className={cn(
          'inline-block w-1.5 h-1.5 rounded-full shrink-0',
          cfg.dotClass,
          isPulse && 'dot-blink'
        )} />
        {cfg.label}
        {serviceName && status === 'live' && ` — ${serviceName}`}
      </span>

      {(status === 'no_service' || status === 'error' || status === 'disconnected') && (
        <button
          onClick={reconnect}
          className="px-2 py-1 text-[9px] text-muted-foreground bg-transparent border border-border rounded-md hover:bg-surface2 transition-colors cursor-pointer"
        >
          재연결
        </button>
      )}

      {status === 'no_service' && (
        <span className="text-[9px] text-muted-foreground">더미 데이터 표시 중</span>
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

  const isReplayMode = replay.selectedMeta !== null && replay.current !== null
  const displayCars     = isReplayMode ? replay.current!.cars     : cars
  const displayRaceInfo = isReplayMode ? replay.current!.raceInfo : raceInfo
  const displayStats    = isReplayMode ? replay.current!.stats    : stats
  const displayMessages = isReplayMode ? replay.current!.messages : messages

  return (
    <div className="min-h-screen bg-background text-foreground p-3 flex flex-col gap-2">
      {/* ── Common header ── */}
      <Header info={displayRaceInfo} isLive={isLive && !isReplayMode} />
      <FlagBanner flag={displayRaceInfo.flag} />
      {!isReplayMode && <RoundBanner isLive={isLive} />}

      {/* ── Tabs + connection badge ── */}
      <Tabs defaultValue="dashboard" className="flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <TabsList className="flex-1 min-w-0">
            <TabsTrigger value="dashboard">대시보드</TabsTrigger>
            <TabsTrigger value="trackmap">트랙맵</TabsTrigger>
            <TabsTrigger value="drivers">드라이버 분석</TabsTrigger>
            <TabsTrigger value="stints">스틴트 분석</TabsTrigger>
            <TabsTrigger value="messages">레이스컨트롤</TabsTrigger>
            <TabsTrigger value="replay" className="data-[state=active]:text-[hsl(var(--pit))]">
              📼 다시보기
            </TabsTrigger>
          </TabsList>
          <ConnBadge status={status} serviceName={serviceName} reconnect={reconnect} />
        </div>

        {/* ── Tab 1: Dashboard ── */}
        <TabsContent value="dashboard" className="flex flex-col gap-2">
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
          <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 280px' }}>
            <div className="flex flex-col gap-2 min-w-0">
              <Leaderboard cars={displayCars} />
              <Legend />
            </div>
            <div className="flex flex-col gap-2">
              <TrackMap    cars={displayCars} compact isLive={isLive && !isReplayMode} />
              <StintOverview carStints={carStints} cars={displayCars} leaderLap={displayStats.leaderLap} />
              <MessageFeed messages={displayMessages} compact />
            </div>
          </div>
        </TabsContent>

        {/* ── Tab 2: Track Map ── */}
        <TabsContent value="trackmap">
          <TrackMap cars={displayCars} isLive={isLive && !isReplayMode} />
        </TabsContent>

        {/* ── Tab 3: Driver Analysis ── */}
        <TabsContent value="drivers">
          <DriverAnalysis driverStats={driverStats} />
        </TabsContent>

        {/* ── Tab 4: Stint Analysis ── */}
        <TabsContent value="stints">
          <StintAnalysis carStints={carStints} totalLaps={displayStats.leaderLap} />
        </TabsContent>

        {/* ── Tab 5: Messages ── */}
        <TabsContent value="messages">
          <MessageFeed messages={displayMessages} />
        </TabsContent>

        {/* ── Tab 6: Replay ── */}
        <TabsContent value="replay" className="flex flex-col gap-2">
          {/* Race selector */}
          <div className="panel flex items-center gap-2 px-4 py-3">
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">이전 레이스</span>
            <select
              value={replay.selectedMeta?.id ?? ''}
              onChange={e => {
                const meta = replay.raceList.find(r => r.id === e.target.value)
                if (meta) replay.selectRace(meta)
              }}
              disabled={replay.listLoading}
              className="flex-1 bg-surface1 text-foreground border border-border rounded px-2 py-1.5 text-[11px] outline-none cursor-pointer"
              style={{ fontFamily: 'monospace' }}
            >
              <option value="" disabled>
                {replay.listLoading ? '불러오는 중…' : replay.raceList.length === 0 ? '저장된 레이스 없음' : '레이스 선택…'}
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
              <button
                onClick={replay.clearRace}
                className="px-2 py-1.5 text-[10px] text-muted-foreground border border-border rounded hover:bg-surface2 transition-colors cursor-pointer whitespace-nowrap"
              >
                ✕ 닫기
              </button>
            )}
          </div>

          {/* Replay controls (when race selected) */}
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

          {/* Before selection: race list */}
          {!replay.selectedMeta && (
            <ReplayBrowser
              raceList={replay.raceList}
              loading={replay.listLoading}
              onSelect={replay.selectRace}
            />
          )}

          {/* Loading state */}
          {replay.selectedMeta && replay.dataLoading && (
            <div className="py-10 text-center text-[12px] text-muted-foreground">
              레이스 데이터 불러오는 중…
            </div>
          )}

          {/* Replay dashboard */}
          {isReplayMode && (
            <>
              <StatsBar stats={displayStats} />
              <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 280px' }}>
                <div className="flex flex-col gap-2 min-w-0">
                  <Leaderboard cars={displayCars} />
                  <Legend />
                </div>
                <div className="flex flex-col gap-2">
                  <TrackMap
                    cars={displayCars}
                    compact
                    isLive={false}
                    circuitKey={replay.selectedMeta?.circuit}
                  />
                  <MessageFeed messages={displayMessages} compact />
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      <footer className="text-[9px] text-[hsl(0_0%_16%)] text-center pb-1">
        WEC Live Dashboard ·{' '}
        {isReplayMode
          ? `REPLAY — ${replay.selectedMeta!.name}`
          : isLive ? `LIVE — ${serviceName}` : 'Demo (dummy data)'}
      </footer>
    </div>
  )
}

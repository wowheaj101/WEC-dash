'use client'

import { useState } from 'react'
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
import { useTiming71, type ConnStatus } from '@/app/hooks/useTiming71'
import { useReplay }   from '@/app/hooks/useReplay'

type Tab = 'dashboard' | 'trackmap' | 'drivers' | 'stints' | 'messages' | 'replay'

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: '대시보드'     },
  { id: 'trackmap',  label: '트랙맵'       },
  { id: 'drivers',   label: '드라이버 분석' },
  { id: 'stints',    label: '스틴트 분석'   },
  { id: 'messages',  label: '레이스컨트롤'  },
  { id: 'replay',    label: '📼 다시보기'   },
]

// ── 연결 상태 배지 ────────────────────────────────────────────────

const STATUS_CFG: Record<ConnStatus, { color: string; bg: string; border: string; label: string }> = {
  idle:         { color: '#555',    bg: '#111',    border: '#222',    label: 'IDLE'           },
  connecting:   { color: '#ffaa00', bg: '#1a1200', border: '#553300', label: 'CONNECTING...'  },
  connected:    { color: '#ffaa00', bg: '#1a1200', border: '#553300', label: 'CONNECTED'      },
  discovering:  { color: '#ffaa00', bg: '#1a1200', border: '#553300', label: 'DISCOVERING...' },
  live:         { color: '#00ff66', bg: '#003300', border: '#005500', label: 'LIVE'            },
  no_service:   { color: '#ff9900', bg: '#1a0e00', border: '#553300', label: 'NO WEC SERVICE'  },
  disconnected: { color: '#ff4444', bg: '#1a0000', border: '#550000', label: 'RECONNECTING...' },
  error:        { color: '#ff4444', bg: '#1a0000', border: '#550000', label: 'ERROR'           },
}

function ConnBadge({ status, serviceName, reconnect }: {
  status:      ConnStatus
  serviceName: string | null
  reconnect:   () => void
}) {
  const cfg     = STATUS_CFG[status]
  const isPulse = status === 'live'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span style={{
        display:      'inline-flex',
        alignItems:   'center',
        gap:          5,
        background:   cfg.bg,
        color:        cfg.color,
        fontSize:     10,
        padding:      '3px 8px',
        borderRadius: 4,
        border:       `0.5px solid ${cfg.border}`,
        whiteSpace:   'nowrap',
      }}>
        <span className={isPulse ? 'dot-blink' : undefined} style={{
          display:      'inline-block',
          width:        6, height: 6,
          borderRadius: '50%',
          background:   cfg.color,
          flexShrink:   0,
        }} />
        {cfg.label}
        {serviceName && status === 'live' && ` — ${serviceName}`}
      </span>

      {(status === 'no_service' || status === 'error' || status === 'disconnected') && (
        <button onClick={reconnect} style={{
          padding:      '3px 8px',
          background:   'transparent',
          color:        '#555',
          border:       '0.5px solid #333',
          borderRadius: 4,
          fontSize:     9,
          cursor:       'pointer',
          fontFamily:   'monospace',
        }}>
          재연결
        </button>
      )}

      {status === 'no_service' && (
        <span style={{ fontSize: 9, color: '#444' }}>더미 데이터 표시 중</span>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────

export default function Page() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  // Live 데이터
  const {
    status, serviceName, reconnect,
    cars, raceInfo, stats, messages, carStints, driverStats, isLive,
  } = useTiming71()

  // Replay
  const replay = useReplay()

  // Replay 모드일 때 표시할 데이터 (현재 스냅샷 or 라이브)
  const isReplayMode = activeTab === 'replay' && replay.selectedMeta !== null && replay.current !== null
  const displayCars     = isReplayMode ? replay.current!.cars     : cars
  const displayRaceInfo = isReplayMode ? replay.current!.raceInfo : raceInfo
  const displayStats    = isReplayMode ? replay.current!.stats    : stats
  const displayMessages = isReplayMode ? replay.current!.messages : messages

  return (
    <div style={{
      minHeight:     '100vh',
      background:    '#0d0d0d',
      padding:       12,
      display:       'flex',
      flexDirection: 'column',
      gap:           8,
      fontFamily:    'monospace',
    }}>
      {/* ── 공통 헤더 ── */}
      <Header info={displayRaceInfo} isLive={isLive && !isReplayMode} />
      <FlagBanner flag={displayRaceInfo.flag} />
      {!isReplayMode && <RoundBanner isLive={isLive} />}

      {/* ── Replay 컨트롤 (선택된 레이스 있을 때만) ── */}
      {activeTab === 'replay' && replay.selectedMeta && replay.snapshots.length > 0 && (
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

      {/* ── 탭 + 연결 상태 ── */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{
          display:      'flex',
          gap:          4,
          background:   '#111',
          padding:      4,
          borderRadius: 8,
          border:       '0.5px solid #1e1e1e',
          flex:         1,
          minWidth:     0,
        }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex:         1,
                padding:      '6px 8px',
                background:   activeTab === tab.id ? '#1e1e1e' : 'transparent',
                color:        activeTab === tab.id
                  ? (tab.id === 'replay' ? '#ff9900' : '#fff')
                  : (tab.id === 'replay' ? '#664400' : '#555'),
                border:       `0.5px solid ${activeTab === tab.id ? '#333' : 'transparent'}`,
                borderRadius: 6,
                fontSize:     11,
                cursor:       'pointer',
                fontFamily:   'monospace',
                whiteSpace:   'nowrap',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <ConnBadge status={status} serviceName={serviceName} reconnect={reconnect} />
      </div>

      {/* ── 탭 1: 대시보드 ── */}
      {activeTab === 'dashboard' && (
        <>
          <StatsBar stats={displayStats} />
          <div style={{
            display:             'grid',
            gridTemplateColumns: '1fr 280px',
            gap:                 8,
            alignItems:          'start',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
              <Leaderboard cars={displayCars} />
              <Legend />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <TrackMap    cars={displayCars} compact isLive={isLive && !isReplayMode} />
              <StintOverview carStints={carStints} cars={displayCars} leaderLap={displayStats.leaderLap} />
              <MessageFeed messages={displayMessages} compact />
            </div>
          </div>
        </>
      )}

      {/* ── 탭 2: 트랙맵 ── */}
      {activeTab === 'trackmap' && (
        <TrackMap cars={displayCars} isLive={isLive && !isReplayMode} />
      )}

      {/* ── 탭 3: 드라이버 분석 ── */}
      {activeTab === 'drivers' && <DriverAnalysis driverStats={driverStats} />}

      {/* ── 탭 4: 스틴트 분석 ── */}
      {activeTab === 'stints' && (
        <StintAnalysis carStints={carStints} totalLaps={displayStats.leaderLap} />
      )}

      {/* ── 탭 5: 메시지 ── */}
      {activeTab === 'messages' && <MessageFeed messages={displayMessages} />}

      {/* ── 탭 6: 다시보기 ── */}
      {activeTab === 'replay' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* 레이스 선택 드롭다운 */}
          <div style={{
            display:      'flex',
            alignItems:   'center',
            gap:          8,
            background:   '#0f0f0f',
            border:       '0.5px solid #1e1e1e',
            borderRadius: 8,
            padding:      '10px 14px',
          }}>
            <span style={{ fontSize: 10, color: '#444', whiteSpace: 'nowrap' }}>이전 레이스</span>
            <select
              value={replay.selectedMeta?.id ?? ''}
              onChange={e => {
                const meta = replay.raceList.find(r => r.id === e.target.value)
                if (meta) replay.selectRace(meta)
              }}
              disabled={replay.listLoading}
              style={{
                flex:          1,
                background:    '#141414',
                color:         replay.selectedMeta ? '#ccc' : '#555',
                border:        '0.5px solid #2a2a2a',
                borderRadius:  4,
                padding:       '5px 8px',
                fontSize:      11,
                fontFamily:    'monospace',
                cursor:        'pointer',
                outline:       'none',
              }}
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
                style={{
                  background:   'transparent',
                  color:        '#555',
                  border:       '0.5px solid #2a2a2a',
                  borderRadius: 4,
                  padding:      '4px 8px',
                  fontSize:     10,
                  cursor:       'pointer',
                  fontFamily:   'monospace',
                  whiteSpace:   'nowrap',
                }}
              >
                ✕ 닫기
              </button>
            )}
          </div>

          {/* 레이스 선택 전: 목록 표시 */}
          {!replay.selectedMeta && (
            <ReplayBrowser
              raceList={replay.raceList}
              loading={replay.listLoading}
              onSelect={replay.selectRace}
            />
          )}

          {/* 레이스 선택 후: 데이터 로딩 중 */}
          {replay.selectedMeta && replay.dataLoading && (
            <div style={{ padding: 40, textAlign: 'center', color: '#444', fontSize: 12 }}>
              레이스 데이터 불러오는 중…
            </div>
          )}

          {/* 레이스 선택 후: 대시보드 표시 */}
          {isReplayMode && (
            <>
              <StatsBar stats={displayStats} />
              <div style={{
                display:             'grid',
                gridTemplateColumns: '1fr 280px',
                gap:                 8,
                alignItems:          'start',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
                  <Leaderboard cars={displayCars} />
                  <Legend />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <TrackMap    cars={displayCars} compact isLive={false}
                    circuitKey={replay.selectedMeta?.circuit} />
                  <MessageFeed messages={displayMessages} compact />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <footer style={{ fontSize: 9, color: '#2a2a2a', textAlign: 'center', paddingBottom: 4 }}>
        WEC Live Dashboard ·{' '}
        {isReplayMode
          ? `REPLAY — ${replay.selectedMeta!.name}`
          : isLive ? `LIVE — ${serviceName}` : 'Demo (dummy data)'}
      </footer>
    </div>
  )
}

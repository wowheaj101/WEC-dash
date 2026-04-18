'use client'

import { useState } from 'react'
import Header         from '@/app/components/Header'
import FlagBanner     from '@/app/components/FlagBanner'
import StatsBar       from '@/app/components/StatsBar'
import Leaderboard    from '@/app/components/Leaderboard'
import Legend         from '@/app/components/Legend'
import TrackMap       from '@/app/components/TrackMap'
import StintOverview  from '@/app/components/StintOverview'
import MessageFeed    from '@/app/components/MessageFeed'
import DriverAnalysis from '@/app/components/DriverAnalysis'
import StintAnalysis  from '@/app/components/StintAnalysis'
import { driverStats, carStints } from '@/app/data/dummyData'
import { useTiming71, type ConnStatus } from '@/app/hooks/useTiming71'

type Tab = 'dashboard' | 'trackmap' | 'drivers' | 'stints' | 'messages'

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: '대시보드'     },
  { id: 'trackmap',  label: '트랙맵'       },
  { id: 'drivers',   label: '드라이버 분석' },
  { id: 'stints',    label: '스틴트 분석'   },
  { id: 'messages',  label: '메시지'        },
]

// ── 연결 상태 배지 ────────────────────────────────────────────────

const STATUS_CFG: Record<ConnStatus, { color: string; bg: string; border: string; label: string }> = {
  idle:         { color: '#555',    bg: '#111',    border: '#222',    label: 'IDLE'          },
  connecting:   { color: '#ffaa00', bg: '#1a1200', border: '#553300', label: 'CONNECTING...' },
  connected:    { color: '#ffaa00', bg: '#1a1200', border: '#553300', label: 'CONNECTED'     },
  discovering:  { color: '#ffaa00', bg: '#1a1200', border: '#553300', label: 'DISCOVERING...' },
  live:         { color: '#00ff66', bg: '#003300', border: '#005500', label: 'LIVE'           },
  no_service:   { color: '#ff9900', bg: '#1a0e00', border: '#553300', label: 'NO WEC SERVICE' },
  disconnected: { color: '#ff4444', bg: '#1a0000', border: '#550000', label: 'RECONNECTING...' },
  error:        { color: '#ff4444', bg: '#1a0000', border: '#550000', label: 'ERROR'          },
}

function ConnBadge({ status, serviceName, reconnect }: {
  status:      ConnStatus
  serviceName: string | null
  reconnect:   () => void
}) {
  const cfg = STATUS_CFG[status]
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
        <span
          className={isPulse ? 'dot-blink' : undefined}
          style={{
            display:      'inline-block',
            width:        6, height: 6,
            borderRadius: '50%',
            background:   cfg.color,
            flexShrink:   0,
          }}
        />
        {cfg.label}
        {serviceName && status === 'live' && ` — ${serviceName}`}
      </span>

      {(status === 'no_service' || status === 'error' || status === 'disconnected') && (
        <button
          onClick={reconnect}
          style={{
            padding:     '3px 8px',
            background:  'transparent',
            color:       '#555',
            border:      '0.5px solid #333',
            borderRadius: 4,
            fontSize:    9,
            cursor:      'pointer',
            fontFamily:  'monospace',
          }}
        >
          재연결
        </button>
      )}

      {(status === 'no_service') && (
        <span style={{ fontSize: 9, color: '#444' }}>
          더미 데이터 표시 중
        </span>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────

export default function Page() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  const {
    status, serviceName, reconnect,
    cars, raceInfo, stats, messages, isLive,
  } = useTiming71()

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
      <Header info={raceInfo} />
      <FlagBanner flag={raceInfo.flag} />

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
                color:        activeTab === tab.id ? '#fff'    : '#555',
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
          <StatsBar stats={stats} />
          <div style={{
            display:             'grid',
            gridTemplateColumns: '1fr 280px',
            gap:                 8,
            alignItems:          'start',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
              <Leaderboard cars={cars} />
              <Legend />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <TrackMap    cars={cars} compact />
              <StintOverview carStints={carStints} cars={cars} leaderLap={stats.leaderLap} />
              <MessageFeed messages={messages} compact />
            </div>
          </div>
        </>
      )}

      {/* ── 탭 2: 트랙맵 ── */}
      {activeTab === 'trackmap' && <TrackMap cars={cars} />}

      {/* ── 탭 3: 드라이버 분석 ── */}
      {activeTab === 'drivers' && <DriverAnalysis driverStats={driverStats} />}

      {/* ── 탭 4: 스틴트 분석 ── */}
      {activeTab === 'stints' && (
        <StintAnalysis carStints={carStints} totalLaps={stats.leaderLap} />
      )}

      {/* ── 탭 5: 메시지 ── */}
      {activeTab === 'messages' && <MessageFeed messages={messages} />}

      <footer style={{ fontSize: 9, color: '#2a2a2a', textAlign: 'center', paddingBottom: 4 }}>
        WEC Live Dashboard · {isLive ? `LIVE — ${serviceName}` : 'Demo (dummy data)'} · Phase 2
      </footer>
    </div>
  )
}

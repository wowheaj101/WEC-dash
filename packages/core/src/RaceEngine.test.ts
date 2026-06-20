import { describe, it, expect } from 'vitest'
import { RaceEngine } from './RaceEngine'
import type { GriiipParticipant, RankItem, GapItem, LapItem } from './types'

const NOW = 1_700_000_000_000

function participant(over: Partial<GriiipParticipant> & { id: number; carNumber: string }): GriiipParticipant {
  return {
    classId: 'HYPERCAR', teamName: 'Toyota', threeLettersName: 'TOY',
    manufacturer: 'Toyota GR010', country: null,
    drivers: [{ displayName: 'Driver', threeLettersName: 'DRV', categoryId: 'P', country: null }],
    ...over,
  }
}
function rank(over: Partial<RankItem> & { pid: number }): RankItem {
  return {
    carNumber: '0', classId: 'HYPERCAR', overallPosition: 1, position: 1,
    lapNumber: 10, sectorNumber: 1, isDeleted: false, elapsedTimeMillis: 1_000_000,
    ...over,
  }
}
function gap(over: Partial<GapItem> & { pid: number }): GapItem {
  return {
    carNumber: '0', classId: 'HYPERCAR', gapToFirstMillis: 0, gapToFirstLaps: 0,
    gapToAheadMillis: 0, gapToAheadLaps: 0, lapNumber: 10, isDeleted: false,
    ...over,
  }
}
function lap(over: Partial<LapItem> & { pid: number; lapTimeMillis: number }): LapItem {
  return {
    carNumber: '0', classId: 'HYPERCAR', lapNumber: 10, isValid: true,
    color: 'Green', isStartedInPit: false, isEndedInPit: false,
    ...over,
  }
}

function seededEngine() {
  const engine = new RaceEngine({ round: 5, sessionName: '6 Hours of Spa', now: () => NOW })
  engine.applyParticipants([
    participant({ id: 1, carNumber: '7', drivers: [{ displayName: 'Kobayashi', threeLettersName: 'KOB', categoryId: 'P', country: null }] }),
    participant({ id: 2, carNumber: '8', drivers: [{ displayName: 'Hartley', threeLettersName: 'HAR', categoryId: 'P', country: null }] }),
  ])
  engine.applyRanks([
    rank({ pid: 1, carNumber: '7', overallPosition: 1, position: 1 }),
    rank({ pid: 2, carNumber: '8', overallPosition: 2, position: 2 }),
  ])
  engine.applyGaps([
    gap({ pid: 1 }),
    gap({ pid: 2, gapToFirstMillis: 1500, gapToAheadMillis: 1500 }),
  ])
  engine.applyLap(lap({ pid: 1, lapTimeMillis: 210_000, color: 'Purple' }))
  engine.applyLap(lap({ pid: 2, lapTimeMillis: 211_000, color: 'Green' }))
  return engine
}

describe('RaceEngine — leaderboard', () => {
  it('builds cars sorted by overall position with gaps and laps', () => {
    const { cars } = seededEngine().snapshot()
    expect(cars.map(c => c.carNum)).toEqual([7, 8])
    expect(cars[0]).toMatchObject({ pos: 1, clsPos: 1, gap: 'Leader', bestLap: '3:30.000', isFastestLap: true, status: 'RUN' })
    expect(cars[1]).toMatchObject({ pos: 2, gap: '+1.500', interval: '+1.500', isFastestLap: false })
  })

  it('does not return cars before any live data arrives', () => {
    const engine = new RaceEngine({ now: () => NOW })
    expect(engine.snapshot().cars).toEqual([])
    expect(engine.receivedLiveData).toBe(false)
  })
})

describe('RaceEngine — stats', () => {
  it('reports overall fastest lap and round', () => {
    const snap = seededEngine().snapshot()
    expect(snap.stats.fastestLap).toMatchObject({ time: '3:30.000', carNum: 7 })
    expect(snap.raceInfo.round).toBe(5)
    expect(snap.raceInfo.name).toBe('6 Hours of Spa')
  })
})

describe('RaceEngine — pit + flags', () => {
  it('tracks pit-in: count, PIT status, and a feed message', () => {
    const engine = seededEngine()
    engine.applyPitIn({ sid: 1, pid: 1, carNumber: '7', classId: 'HYPERCAR', lapNumber: 12, elapsedTimeMillis: 0, ts: new Date(NOW).toISOString() })
    const snap = engine.snapshot()
    expect(snap.stats.totalPitstops).toBe(1)
    expect(snap.cars.find(c => c.carNum === 7)!.status).toBe('PIT')
    expect(snap.messages.at(-1)).toMatchObject({ type: 'pit', carNum: 7 })
    expect(snap.messages.at(-1)!.text).toContain('피트 인')
  })

  it('counts safety cars and flips the flag', () => {
    const engine = seededEngine()
    engine.applyFlag({ sid: 1, flag: 'SafetyCar', lapNumber: 12, sectorNumbers: [] })
    const snap = engine.snapshot()
    expect(snap.raceInfo.flag).toBe('SC')
    expect(snap.stats.safetyCars).toBe(1)
    expect(snap.stats.safetyCarlap).toBe(12)
  })
})

describe('RaceEngine — message ids', () => {
  it('assigns strictly increasing ids even within one tick', () => {
    const engine = seededEngine()
    const pit = (lapNumber: number) => engine.applyPitIn({ sid: 1, pid: 1, carNumber: '7', classId: 'HYPERCAR', lapNumber, elapsedTimeMillis: 0, ts: new Date(NOW).toISOString() })
    pit(12); pit(13); pit(14)
    const ids = engine.getMessages().map(m => m.id)
    for (let i = 1; i < ids.length; i++) expect(ids[i]).toBeGreaterThan(ids[i - 1])
  })
})

describe('RaceEngine — restored messages', () => {
  it('seeds messages and lets live pit events append', () => {
    const engine = seededEngine()
    engine.setMessages([{ id: 1, timestamp: '00:00:00', type: 'general', text: 'restored' }])
    engine.applyPitIn({ sid: 1, pid: 1, carNumber: '7', classId: 'HYPERCAR', lapNumber: 12, elapsedTimeMillis: 0, ts: new Date(NOW).toISOString() })
    const msgs = engine.getMessages()
    expect(msgs[0].text).toBe('restored')
    expect(msgs.at(-1)!.text).toContain('피트 인')
    expect(msgs.length).toBe(2)
  })
})

describe('RaceEngine — participants getter', () => {
  it('exposes the roster for REST result mapping', () => {
    expect(seededEngine().getParticipants().map(p => p.carNumber)).toEqual(['7', '8'])
  })
})

describe('RaceEngine — reset', () => {
  it('clears live state', () => {
    const engine = seededEngine()
    engine.reset()
    const snap = engine.snapshot()
    expect(snap.cars).toEqual([])
    expect(snap.messages).toEqual([])
    expect(engine.receivedLiveData).toBe(false)
  })
})

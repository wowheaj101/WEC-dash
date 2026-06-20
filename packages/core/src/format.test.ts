import { describe, it, expect } from 'vitest'
import {
  formatMs, formatElapsed, formatGap, formatDuration, formatSectorMs,
  mapFlag, mapClass, mapClassStrict, isCarsRestoreValid,
} from './format'
import type { Car } from './types'

describe('formatMs', () => {
  it('formats lap times as m:ss.mmm', () => {
    expect(formatMs(210000)).toBe('3:30.000')
    expect(formatMs(91234)).toBe('1:31.234')
    expect(formatMs(5)).toBe('0:00.005')
  })
  it('returns placeholder for null/zero/negative', () => {
    expect(formatMs(null)).toBe('--:--.---')
    expect(formatMs(undefined)).toBe('--:--.---')
    expect(formatMs(0)).toBe('--:--.---')
    expect(formatMs(-5)).toBe('--:--.---')
  })
})

describe('formatElapsed', () => {
  it('shows hours only when >= 1h', () => {
    expect(formatElapsed(0)).toBe('0:00')
    expect(formatElapsed(90_000)).toBe('1:30')
    expect(formatElapsed(3_661_000)).toBe('1:01:01')
  })
})

describe('formatGap', () => {
  it('handles leader / seconds / laps', () => {
    expect(formatGap(0, 0)).toBe('Leader')
    expect(formatGap(1500, 0)).toBe('+1.500')
    expect(formatGap(12340, 0)).toBe('+12.340')
    expect(formatGap(0, 2)).toBe('+2L')
    expect(formatGap(9999, 1)).toBe('+1L') // laps take priority
  })
})

describe('formatDuration', () => {
  it('always shows hours', () => {
    expect(formatDuration(0)).toBe('0:00:00')
    expect(formatDuration(3_661_000)).toBe('1:01:01')
  })
})

describe('formatSectorMs', () => {
  it('formats seconds to 3dp, placeholder for null/zero', () => {
    expect(formatSectorMs(28456)).toBe('28.456')
    expect(formatSectorMs(null)).toBe('--')
    expect(formatSectorMs(0)).toBe('--')
  })
})

describe('mapFlag', () => {
  it('maps Griiip flags to UI flags', () => {
    expect(mapFlag('Yellow')).toBe('YELLOW')
    expect(mapFlag('SafetyCar')).toBe('SC')
    expect(mapFlag('VirtualSafetyCar')).toBe('SC')
    expect(mapFlag('Red')).toBe('RED')
    expect(mapFlag('Green')).toBe('GREEN')
    expect(mapFlag('whatever')).toBe('GREEN')
  })
})

describe('mapClass / mapClassStrict', () => {
  it('mapClass defaults unknown to LMP2', () => {
    expect(mapClass('HYPERCAR')).toBe('HYPERCAR')
    expect(mapClass('LMGT3')).toBe('LMGT3')
    expect(mapClass('LMP2')).toBe('LMP2')
    expect(mapClass('???')).toBe('LMP2')
  })
  it('mapClassStrict returns undefined for unknown', () => {
    expect(mapClassStrict('HYPERCAR')).toBe('HYPERCAR')
    expect(mapClassStrict('')).toBeUndefined()
    expect(mapClassStrict(null)).toBeUndefined()
    expect(mapClassStrict('???')).toBeUndefined()
  })
})

describe('isCarsRestoreValid', () => {
  const car = (over: Partial<Car>): Car => ({
    pos: 1, clsPos: 1, carClass: 'HYPERCAR', carNum: 1, carNumStr: '1',
    team: 't', drivers: 'd', tire: '?', laps: 0, lastLap: '--', bestLap: '--',
    gap: 'Leader', interval: '--', pitstops: 0, status: 'RUN', isFastestLap: false,
    ...over,
  })
  it('rejects empty', () => {
    expect(isCarsRestoreValid([])).toBe(false)
  })
  it('accepts a single car', () => {
    expect(isCarsRestoreValid([car({})])).toBe(true)
  })
  it('rejects datasets where every car shares clsPos and gap', () => {
    const bad = [car({ carNum: 1, clsPos: 1, gap: 'Leader' }), car({ carNum: 2, clsPos: 1, gap: 'Leader' })]
    expect(isCarsRestoreValid(bad)).toBe(false)
  })
  it('accepts when clsPos or gap varies', () => {
    const good = [car({ carNum: 1, clsPos: 1, gap: 'Leader' }), car({ carNum: 2, clsPos: 2, gap: '+1.000' })]
    expect(isCarsRestoreValid(good)).toBe(true)
  })
})

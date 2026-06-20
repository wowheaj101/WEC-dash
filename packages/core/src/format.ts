import type { Car, CarClass, FlagStatus } from './types'

/** mm:ss.mmm — lap/sector style. Returns a placeholder for null/zero/negative. */
export function formatMs(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return '--:--.---'
  const m   = Math.floor(ms / 60000)
  const s   = Math.floor((ms % 60000) / 1000)
  const rem = ms % 1000
  return `${m}:${String(s).padStart(2, '0')}.${String(rem).padStart(3, '0')}`
}

/** h:mm:ss (or m:ss under an hour) — elapsed/remaining clock style. */
export function formatElapsed(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`
}

/** Leader / +Ns / +NL gap formatting. */
export function formatGap(ms: number, laps: number): string {
  if (laps > 0) return `+${laps}L`
  if (ms <= 0)  return 'Leader'
  return `+${(ms / 1000).toFixed(3)}`
}

export function mapFlag(flag: string): FlagStatus {
  switch (flag) {
    case 'Yellow':           return 'YELLOW'
    case 'SafetyCar':
    case 'VirtualSafetyCar': return 'SC'
    case 'Red':              return 'RED'
    default:                 return 'GREEN'
  }
}

export function mapClass(classId: string): CarClass {
  if (classId === 'HYPERCAR') return 'HYPERCAR'
  if (classId === 'LMGT3')    return 'LMGT3'
  return 'LMP2'
}

/** Strict variant — returns undefined for unknown/empty classId so messages
 *  don't all default to LMP2 when the upstream event carries no class info. */
export function mapClassStrict(classId: string | undefined | null): CarClass | undefined {
  if (classId === 'HYPERCAR') return 'HYPERCAR'
  if (classId === 'LMGT3')    return 'LMGT3'
  if (classId === 'LMP2')     return 'LMP2'
  return undefined
}

/** h:mm:ss — driver total running time style (always shows hours). */
export function formatDuration(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** ss.mmm seconds — sector time style. */
export function formatSectorMs(ms: number | null): string {
  if (ms === null || ms <= 0) return '--'
  return (ms / 1000).toFixed(3)
}

/** True when restored cars[] looks like real standings data.
 *  Discards datasets where every car has the same clsPos or gap (which
 *  happens when REST /results returns finishedAt=1 for in-progress sessions). */
export function isCarsRestoreValid(cars: Car[]): boolean {
  if (cars.length === 0) return false
  if (cars.length === 1) return true
  const uniqueClsPos = new Set(cars.map(c => c.clsPos))
  const uniqueGap    = new Set(cars.map(c => c.gap))
  return uniqueClsPos.size > 1 || uniqueGap.size > 1
}

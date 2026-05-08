import type { WECRound } from '@/app/data/calendar'

export type RoundPhase =
  | 'pre_season'    // 시즌 첫 라운드 전
  | 'upcoming'      // 다음 라운드 주말까지 7일 이상
  | 'race_week'     // 라운드 주말 시작까지 7일 이내 (주말 전)
  | 'active'        // 라운드 주말 진행 중 (프랙티스/퀄리/본경기 포함)
  | 'post_race'     // 본경기 종료 후 24시간 이내
  | 'post_season'   // 시즌 종료

export interface RoundStatus {
  phase:        RoundPhase
  current:      WECRound | null   // 주말 진행 중이거나 가장 최근 완료 라운드
  next:         WECRound | null   // 다음 예정 라운드
  previous:     WECRound | null   // raceEnd < now 인 가장 최근 라운드 (현재 진행 중인 라운드는 제외)
  daysUntilNext: number | null    // 다음 라운드 주말 시작까지 남은 일수 (소수 포함)
}

export function getRoundStatus(
  calendar: WECRound[],
  now: Date = new Date(),
): RoundStatus {
  const sorted = [...calendar].sort(
    (a, b) => new Date(a.weekendStart).getTime() - new Date(b.weekendStart).getTime(),
  )

  const nowMs = now.getTime()

  // 가장 최근 완료된 라운드 (raceEnd < now)
  const previous = [...sorted]
    .reverse()
    .find(r => new Date(r.raceEnd).getTime() < nowMs) ?? null

  for (let i = 0; i < sorted.length; i++) {
    const round       = sorted[i]
    const weekendMs   = new Date(round.weekendStart).getTime()
    const endMs       = new Date(round.raceEnd).getTime()
    const postEndMs   = endMs + 24 * 60 * 60 * 1000  // 레이스 종료 후 24h

    // 라운드 주말 진행 중 (프랙티스 시작 ~ 본경기 종료)
    if (nowMs >= weekendMs && nowMs <= endMs) {
      return {
        phase:         'active',
        current:       round,
        next:          sorted[i + 1] ?? null,
        previous,
        daysUntilNext: null,
      }
    }

    if (nowMs > endMs && nowMs <= postEndMs) {
      return {
        phase:         'post_race',
        current:       round,
        next:          sorted[i + 1] ?? null,
        previous,
        daysUntilNext: sorted[i + 1]
          ? (new Date(sorted[i + 1].weekendStart).getTime() - nowMs) / 86_400_000
          : null,
      }
    }

    if (nowMs < weekendMs) {
      const daysUntil = (weekendMs - nowMs) / 86_400_000
      const phase: RoundPhase = daysUntil <= 7 ? 'race_week' : (i === 0 ? 'pre_season' : 'upcoming')
      return {
        phase,
        current:       i > 0 ? sorted[i - 1] : null,
        next:          round,
        previous,
        daysUntilNext: daysUntil,
      }
    }
  }

  // 마지막 라운드도 지난 경우
  return {
    phase:         'post_season',
    current:       sorted[sorted.length - 1] ?? null,
    next:          null,
    previous,
    daysUntilNext: null,
  }
}

export function formatDaysUntil(days: number): string {
  if (days < 1)      return `${Math.floor(days * 24)}시간 후`
  if (days < 2)      return '내일'
  return `D-${Math.ceil(days)}`
}

export interface Countdown {
  d: number
  h: number
  m: number
  s: number
  totalMs: number
}

export function getCountdown(raceStart: string, now: Date = new Date()): Countdown {
  const totalMs = new Date(raceStart).getTime() - now.getTime()
  if (totalMs <= 0) return { d: 0, h: 0, m: 0, s: 0, totalMs }

  const totalSecs = Math.floor(totalMs / 1000)
  const s = totalSecs % 60
  const totalMins = Math.floor(totalSecs / 60)
  const m = totalMins % 60
  const totalHours = Math.floor(totalMins / 60)
  const h = totalHours % 24
  const d = Math.floor(totalHours / 24)

  return { d, h, m, s, totalMs }
}

export function formatCountdown(cd: Countdown, mode: 'days' | 'hms' | 'auto' = 'auto'): string {
  const { d, h, m, s, totalMs } = cd
  if (totalMs <= 0) return 'NOW'

  const pad = (n: number) => String(n).padStart(2, '0')

  const underOneHour = totalMs < 3_600_000
  if (mode === 'hms' || (mode === 'auto' && underOneHour)) {
    const totalMins = d * 24 * 60 + h * 60 + m
    return `${pad(totalMins)}:${pad(s)}`
  }

  if (d > 0) return `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

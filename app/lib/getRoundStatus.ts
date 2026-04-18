import type { WECRound } from '@/app/data/calendar'

export type RoundPhase =
  | 'pre_season'    // 시즌 첫 라운드 전
  | 'upcoming'      // 다음 라운드까지 7일 이상
  | 'race_week'     // 레이스 7일 이내 (레이스 전)
  | 'active'        // 레이스 진행 중
  | 'post_race'     // 레이스 종료 후 24시간 이내
  | 'post_season'   // 시즌 종료

export interface RoundStatus {
  phase:        RoundPhase
  current:      WECRound | null   // 진행 중이거나 가장 최근 완료 라운드
  next:         WECRound | null   // 다음 예정 라운드
  daysUntilNext: number | null    // 다음 라운드까지 남은 일수 (소수 포함)
}

export function getRoundStatus(
  calendar: WECRound[],
  now: Date = new Date(),
): RoundStatus {
  const sorted = [...calendar].sort(
    (a, b) => new Date(a.raceStart).getTime() - new Date(b.raceStart).getTime(),
  )

  const nowMs = now.getTime()

  for (let i = 0; i < sorted.length; i++) {
    const round     = sorted[i]
    const startMs   = new Date(round.raceStart).getTime()
    const endMs     = new Date(round.raceEnd).getTime()
    const postEndMs = endMs + 24 * 60 * 60 * 1000  // 레이스 종료 후 24h

    if (nowMs >= startMs && nowMs <= endMs) {
      return {
        phase:         'active',
        current:       round,
        next:          sorted[i + 1] ?? null,
        daysUntilNext: null,
      }
    }

    if (nowMs > endMs && nowMs <= postEndMs) {
      return {
        phase:         'post_race',
        current:       round,
        next:          sorted[i + 1] ?? null,
        daysUntilNext: sorted[i + 1]
          ? (new Date(sorted[i + 1].raceStart).getTime() - nowMs) / 86_400_000
          : null,
      }
    }

    if (nowMs < startMs) {
      const daysUntil = (startMs - nowMs) / 86_400_000
      const phase: RoundPhase = daysUntil <= 7 ? 'race_week' : (i === 0 ? 'pre_season' : 'upcoming')
      return {
        phase,
        current:       i > 0 ? sorted[i - 1] : null,
        next:          round,
        daysUntilNext: daysUntil,
      }
    }
  }

  // 마지막 라운드도 지난 경우
  return {
    phase:         'post_season',
    current:       sorted[sorted.length - 1] ?? null,
    next:          null,
    daysUntilNext: null,
  }
}

export function formatDaysUntil(days: number): string {
  if (days < 1)      return `${Math.floor(days * 24)}시간 후`
  if (days < 2)      return '내일'
  return `D-${Math.ceil(days)}`
}

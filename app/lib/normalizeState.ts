import type { Car, CarClass, FlagStatus, RaceInfo, Stats, Status, Tire } from '@/app/types/race'
import type { ColMap, T71Manifest } from './parseManifest'

// Timing71 raw cell: 단순 값 또는 [값, 메타플래그] 튜플
// 메타플래그: "pb" = 개인 베스트(초록), "sb" = 세션 베스트(보라)
type RawCell = string | number | [string | number, string] | null | undefined

export interface T71RawState {
  cars:     RawCell[][]
  session:  T71Session
  messages?: RawMessage[]
}

export interface T71Session {
  timeElapsed?: number | string
  timeRemain?:  number | string
  flagState?:   string
  trackData?:   number[]
  fastestLap?:  [string, number]  // [laptime, carNum]
}

export type RawMessage = [string, string, string, number?]  // [timestamp, category, text, carNum?]

// ── Cell helpers ──────────────────────────────────────────────────

function rawVal(cell: RawCell): string {
  if (cell === null || cell === undefined) return '—'
  if (Array.isArray(cell)) return String(cell[0] ?? '—')
  return String(cell)
}

function metaFlag(cell: RawCell): string {
  if (Array.isArray(cell)) return String(cell[1] ?? '')
  return ''
}

function isSB(cell: RawCell): boolean { return metaFlag(cell) === 'sb' }

// ── Formatting helpers ────────────────────────────────────────────

function fmtHMS(totalSec: number): string {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = Math.floor(totalSec % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// 랩타임이 이미 "M:SS.mmm" 형식이면 그대로, 초 숫자이면 변환
function fmtLapTime(raw: string): string {
  if (!raw || raw === '—') return '—'
  if (/^\d+:\d/.test(raw)) return raw   // 이미 형식화됨
  const sec = parseFloat(raw)
  if (isNaN(sec) || sec <= 0) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toFixed(3).padStart(6, '0')}`
}

// 갭: 초 숫자 → "+MM:SS.s" 또는 "LEAD"
function fmtGap(raw: string): string {
  if (!raw || raw === '0' || raw === '—') return 'LEAD'
  if (raw.toUpperCase().includes('LAP')) return raw  // "+1 Lap" 형식 그대로
  if (raw.startsWith('+') || raw.startsWith('-')) return raw  // 이미 형식화됨
  const sec = parseFloat(raw)
  if (isNaN(sec) || sec === 0) return 'LEAD'
  const abs = Math.abs(sec)
  const m   = Math.floor(abs / 60)
  const s   = abs % 60
  const sign = sec < 0 ? '-' : '+'
  return m > 0
    ? `${sign}${m}:${s.toFixed(1).padStart(4, '0')}`
    : `${sign}${s.toFixed(1)}`
}

// ── Type mappers ──────────────────────────────────────────────────

function mapStatus(raw: string): Status {
  switch (raw.toUpperCase()) {
    case 'RUN':  return 'RUN'
    case 'PIT':  return 'PIT'
    case 'OUT':  return 'OUT'
    case 'STOP': return 'STOP'
    case 'FIN':  return 'OFF'
    default:     return 'RUN'
  }
}

function mapClass(raw: string): CarClass {
  const u = raw.toUpperCase()
  if (u.includes('HYPERCAR') || u === 'H') return 'HYPERCAR'
  if (u.includes('LMP2')     || u === 'L2') return 'LMP2'
  if (u.includes('LMGT3')    || u.includes('GT3') || u === 'L3') return 'LMGT3'
  return 'HYPERCAR'
}

function mapTire(raw: string): Tire {
  switch (raw.toUpperCase()) {
    case 'S': case 'SOFT':         return 'S'
    case 'M': case 'MEDIUM':       return 'M'
    case 'H': case 'HARD':         return 'H'
    case 'W': case 'WET':          return 'W'
    case 'I': case 'INTER': case 'INTERMEDIATE': return 'I'
    default:                        return 'S'
  }
}

function mapFlag(raw: string): FlagStatus {
  switch (raw.toUpperCase()) {
    case 'SC':       case 'SAFETY CAR': return 'SC'
    case 'YELLOW':   case 'FCY':        return 'YELLOW'
    case 'RED':                          return 'RED'
    case 'CHEQUERED':case 'CHECKERED':  return 'GREEN'
    default:                             return 'GREEN'
  }
}

// ── Main exports ──────────────────────────────────────────────────

/**
 * Timing71 raw cars 배열 → Car[] 변환
 * colMap을 사용해 컬럼 이름으로 값을 조회한다.
 */
export function normalizeCars(rawCars: RawCell[][], colMap: ColMap): Car[] {
  const get = (car: RawCell[], name: string): RawCell => {
    const idx = colMap[name]
    return idx !== undefined ? car[idx] : undefined
  }

  // 세션 베스트 랩 보유 차량 찾기
  let fastestCarNum = -1
  rawCars.forEach(car => {
    if (isSB(get(car, 'Best') ?? get(car, 'Last'))) {
      fastestCarNum = parseInt(rawVal(get(car, 'Num'))) || fastestCarNum
    }
  })

  return rawCars.map((rawCar, posIdx) => {
    const g = (name: string) => get(rawCar, name)

    const carNumRaw = rawVal(g('Num'))
    const carNum    = parseInt(carNumRaw) || posIdx + 1

    const lastCell  = g('Last') ?? g('LastLap')
    const bestCell  = g('Best') ?? g('BestLap')
    const gapCell   = g('C.Gap') ?? g('Gap')
    const intCell   = g('C.Int') ?? g('Int')

    const status    = mapStatus(rawVal(g('State')))
    const pitstops  = parseInt(rawVal(g('Pits'))) || 0
    const laps      = parseInt(rawVal(g('Laps'))) || 0
    const clsPos    = parseInt(rawVal(g('PIC')))  || (posIdx + 1)

    const lastLap   = fmtLapTime(rawVal(lastCell))
    const bestLap   = fmtLapTime(rawVal(bestCell))
    const isFastestLap = isSB(bestCell) || carNum === fastestCarNum

    return {
      pos:         posIdx + 1,
      clsPos,
      carClass:    mapClass(rawVal(g('Class'))),
      carNum,
      team:        rawVal(g('Team') ?? g('TeamName')) || `Car #${carNum}`,
      drivers:     rawVal(g('Driver') ?? g('CurrentDriver')) || '—',
      tire:        mapTire(rawVal(g('Tyre') ?? g('Tire'))),
      laps,
      lastLap:     status === 'PIT' ? '—' : lastLap,
      bestLap,
      gap:         fmtGap(rawVal(gapCell)),
      interval:    fmtGap(rawVal(intCell)),
      pitstops,
      status,
      isFastestLap,
    } satisfies Car
  })
}

/**
 * Timing71 session 객체 → RaceInfo 변환
 */
export function normalizeSession(
  session: T71Session,
  manifest: Pick<T71Manifest, 'name' | 'trackDataSpec'>,
): RaceInfo {
  const elapsed = Math.max(0, Number(session.timeElapsed ?? 0))
  const remain  = Math.max(0, Number(session.timeRemain  ?? 0))
  const total   = elapsed + remain

  const td    = session.trackData ?? []
  const tSpec = manifest.trackDataSpec ?? []
  const airIdx   = tSpec.findIndex(s => /air/i.test(s))
  const trackIdx = tSpec.findIndex(s => /track/i.test(s))
  const humIdx   = tSpec.findIndex(s => /humid/i.test(s))

  return {
    name:      manifest.name || 'WEC Race',
    round:     0,
    elapsed:   fmtHMS(elapsed),
    remaining: fmtHMS(remain),
    total:     fmtHMS(total),
    flag:      mapFlag(session.flagState ?? 'GREEN'),
    weather: {
      air:       airIdx   >= 0 ? Math.round(td[airIdx]   ?? 0) : 0,
      track:     trackIdx >= 0 ? Math.round(td[trackIdx] ?? 0) : 0,
      humidity:  humIdx   >= 0 ? Math.round(td[humIdx]   ?? 0) : 0,
      condition: 'unknown',
    },
  }
}

/**
 * Car[] 배열에서 Stats 계산
 */
export function computeStats(cars: Car[], session: T71Session): Stats {
  const leaderLap   = Math.max(0, ...cars.map(c => c.laps))
  const totalPits   = cars.reduce((s, c) => s + c.pitstops, 0)
  const fastest     = cars.find(c => c.isFastestLap)

  return {
    leaderLap,
    totalPitstops: totalPits,
    fastestLap: {
      time:   fastest?.bestLap ?? '—',
      carNum: fastest?.carNum  ?? 0,
      team:   fastest?.team    ?? '—',
    },
    safetyCars:   0,
    safetyCarlap: 0,
  }
}

/**
 * 두 state를 머지 (incremental update 처리).
 * Timing71은 변경된 car만 보내므로 null 슬롯은 이전 값 유지.
 */
export function mergeState(prev: T71RawState, update: Partial<T71RawState>): T71RawState {
  const cars = prev.cars.map((prevCar, i) => {
    const upd = update.cars?.[i]
    if (!upd) return prevCar
    // cell-level merge
    return prevCar.map((cell, j) => (update.cars![i][j] !== undefined ? update.cars![i][j] : cell))
  })

  // 새 차량이 추가된 경우
  if (update.cars && update.cars.length > prev.cars.length) {
    for (let i = prev.cars.length; i < update.cars.length; i++) {
      if (update.cars[i]) cars.push(update.cars[i])
    }
  }

  return {
    cars,
    session:  { ...prev.session,  ...(update.session  ?? {}) },
    messages: [...(prev.messages ?? []), ...(update.messages ?? [])],
  }
}

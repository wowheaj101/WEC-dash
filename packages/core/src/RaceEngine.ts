import type {
  Car, RaceInfo, Stats, Message, CarStint, StintEntry, DriverStat,
  LapHistoryEntry, FlagStatus, RaceState,
  GriiipParticipant, RankItem, GapItem, LapItem, ClockItem, FlagItem,
  RaceLogItem, PitItem, LiveScheduleSession,
} from './types'
import {
  formatMs, formatElapsed, formatGap, formatDuration, formatSectorMs,
  mapFlag, mapClass, mapClassStrict, isCarsRestoreValid,
} from './format'

// ── Config ────────────────────────────────────────────────────────

export interface RaceEngineConfig {
  /** Calendar round number shown in RaceInfo.round. */
  round?:           number
  /** Session display name (RaceInfo.name). Also set via setSessionName(). */
  sessionName?:     string
  /** Placeholder weather; the app overlays real weather from useWeather. */
  weatherFallback?: { air: number; track: number; humidity: number; condition: string }
  /** Total session length (seconds) when schedule.lengthLimit is missing. */
  totalSecondsFallback?: number
  /** Cap lap-history entries per car so a 24 h race doesn't blow memory. */
  maxLapHistory?:   number
  /** Cap retained messages. */
  maxMessages?:     number
  /** Injectable clock for deterministic tests. Defaults to Date.now. */
  now?:             () => number
}

const DEFAULT_WEATHER = { air: 0, track: 0, humidity: 0, condition: 'unknown' }
const DEFAULT_TOTAL_SECONDS = 21600  // 6 h
const DEFAULT_MAX_LAP_HISTORY = 1000
const DEFAULT_MAX_MESSAGES = 50

// ── Internal state ────────────────────────────────────────────────

interface LapState {
  lastLapMs: number | null
  bestLapMs: number | null
  lastColor: 'sb' | 'pb' | null
  bestColor: 'sb' | 'pb' | null
  inPit:     boolean
}

/**
 * Framework-agnostic WEC timing state machine.
 *
 * Feed it the same event shapes the SignalR client emits (applyRanks, applyGaps,
 * applyLap, …); read a fully-normalized RaceState via snapshot(). Holds no React
 * and no calendar/dummy-data imports — round/name/weather come from config so the
 * web hook and the ingest worker can both drive it.
 *
 * Faithfully mirrors the logic previously inlined in useTiming71.ts. The one
 * intentional change: buildStats reuses the cars[] computed by snapshot() instead
 * of rebuilding them (removes the per-tick double computation).
 */
export class RaceEngine {
  private participants = new Map<number, GriiipParticipant>()
  private ranks        = new Map<number, RankItem>()
  private gaps         = new Map<number, GapItem>()
  private laps         = new Map<number, LapState>()
  private pitCount     = new Map<number, number>()
  private clock:    ClockItem | null = null
  private schedule: LiveScheduleSession | null = null
  private flag:     FlagStatus = 'GREEN'
  private sessionName = ''
  private scCount = 0
  private scLap   = 0

  private stints     = new Map<number, StintEntry[]>()
  private pitInTs    = new Map<number, number>()
  private stintLaps  = new Map<number, number[]>()

  private sectorEnterTs  = new Map<number, { sector: number; ts: number }>()
  private sectorDuration = new Map<number, [number, number, number]>()
  private sectorBest     = new Map<number, [number | null, number | null, number | null]>()

  private lapHistory = new Map<number, LapHistoryEntry[]>()

  private messages: Message[] = []
  private restoredCars: Car[] = []
  private msgId = 0
  private hasLiveData = false

  private readonly cfg: Required<Omit<RaceEngineConfig, 'round' | 'sessionName' | 'weatherFallback'>>
    & Pick<RaceEngineConfig, 'round'>
    & { weatherFallback: NonNullable<RaceEngineConfig['weatherFallback']> }

  constructor(config: RaceEngineConfig = {}) {
    this.sessionName = config.sessionName ?? ''
    this.cfg = {
      round:                config.round,
      weatherFallback:      config.weatherFallback ?? DEFAULT_WEATHER,
      totalSecondsFallback: config.totalSecondsFallback ?? DEFAULT_TOTAL_SECONDS,
      maxLapHistory:        config.maxLapHistory ?? DEFAULT_MAX_LAP_HISTORY,
      maxMessages:          config.maxMessages ?? DEFAULT_MAX_MESSAGES,
      now:                  config.now ?? Date.now,
    }
  }

  // ── External setters ───────────────────────────────────────────

  setSessionName(name: string): void { this.sessionName = name }
  setRound(round: number): void { this.cfg.round = round }
  /** REST /results or restored snapshot cars used as fallback in buildCars. */
  setRestoredCars(cars: Car[]): void { this.restoredCars = cars }
  /** Seed the message feed from a restored snapshot. Live events append after. */
  setMessages(messages: Message[]): void { this.messages = messages.slice(-this.cfg.maxMessages) }
  /** Current participant roster (for REST results → Car[] mapping in the host). */
  getParticipants(): GriiipParticipant[] { return Array.from(this.participants.values()) }
  get receivedLiveData(): boolean { return this.hasLiveData }

  /** Reset all live state (mirrors startConnection ref reset). Config is kept. */
  reset(): void {
    this.participants.clear()
    this.ranks.clear()
    this.gaps.clear()
    this.laps.clear()
    this.pitCount.clear()
    this.stints.clear()
    this.pitInTs.clear()
    this.stintLaps.clear()
    this.sectorEnterTs.clear()
    this.sectorDuration.clear()
    this.sectorBest.clear()
    this.lapHistory.clear()
    this.clock = null
    this.schedule = null
    this.flag = 'GREEN'
    this.scCount = 0
    this.scLap = 0
    this.messages = []
    this.restoredCars = []
    this.hasLiveData = false
  }

  // ── Monotonic message id (Date.now collisions break MessageFeed sort) ──

  private nextMsgId(): number {
    const now = this.cfg.now()
    this.msgId = Math.max(this.msgId + 1, now * 1000)
    return this.msgId
  }

  private pushMessage(msg: Message): void {
    this.messages = [...this.messages.slice(-(this.cfg.maxMessages - 1)), msg]
  }

  // ── Apply events ───────────────────────────────────────────────

  applySchedule(schedule: LiveScheduleSession): void {
    this.schedule = schedule
    this.flag = mapFlag(schedule.currentFlag)
  }

  applyParticipants(participants: GriiipParticipant[]): void {
    this.participants = new Map(participants.map(p => [p.id, p]))
    for (const p of participants) {
      this.stints.set(p.id, [{ startLap: 1, endLap: null, tire: '?' }])
    }
  }

  applyRanks(items: RankItem[]): void {
    this.hasLiveData = true
    const now = this.cfg.now()
    for (const item of items) {
      const prev = this.ranks.get(item.pid)
      this.ranks.set(item.pid, item)

      // Detect sector transition (new sectorNumber or new lap)
      const prevEnter = this.sectorEnterTs.get(item.pid)
      const sectorChanged = !prevEnter
        || prevEnter.sector !== item.sectorNumber
        || (prev && prev.lapNumber !== item.lapNumber)
      if (sectorChanged && item.sectorNumber) {
        if (prevEnter && prevEnter.sector >= 1 && prevEnter.sector <= 3) {
          const elapsed = now - prevEnter.ts
          if (elapsed > 3_000 && elapsed < 600_000) {
            const idx = prevEnter.sector - 1
            const durs = this.sectorDuration.get(item.pid) ?? [0, 0, 0] as [number, number, number]
            durs[idx] = durs[idx] === 0 ? elapsed : Math.round(durs[idx] * 0.7 + elapsed * 0.3)
            this.sectorDuration.set(item.pid, durs)

            if (item.isDeleted !== true) {
              const bests = this.sectorBest.get(item.pid) ?? [null, null, null] as [number | null, number | null, number | null]
              if (bests[idx] === null || elapsed < (bests[idx] as number)) {
                bests[idx] = elapsed
                this.sectorBest.set(item.pid, bests)
              }
            }
          }
        }
        this.sectorEnterTs.set(item.pid, { sector: item.sectorNumber, ts: now })
      }
    }
  }

  applyGaps(items: GapItem[]): void {
    for (const item of items) this.gaps.set(item.pid, item)
  }

  applyLap(item: LapItem): void {
    const prev = this.laps.get(item.pid) ?? {
      lastLapMs: null, bestLapMs: null,
      lastColor: null, bestColor: null, inPit: false,
    } as LapState

    const lastColor: 'sb' | 'pb' | null = item.color === 'Purple' ? 'sb'
      : item.color === 'Green' ? 'pb' : null

    // Session-best across all cars (compared before inserting this lap)
    let overallBest = Infinity
    this.laps.forEach(ls => {
      if (ls.bestLapMs && ls.bestLapMs < overallBest) overallBest = ls.bestLapMs
    })
    const isSB = item.lapTimeMillis < overallBest

    const bestLapMs = (!prev.bestLapMs || item.lapTimeMillis < prev.bestLapMs)
      ? item.lapTimeMillis : prev.bestLapMs

    this.laps.set(item.pid, {
      lastLapMs: item.lapTimeMillis,
      bestLapMs,
      lastColor,
      bestColor: isSB ? 'sb' : (bestLapMs === item.lapTimeMillis ? 'pb' : prev.bestColor),
      inPit:     prev.inPit,
    })

    const isCleanLap = item.isValid !== false && !item.isStartedInPit && !item.isEndedInPit && item.lapTimeMillis > 0
    if (isCleanLap) {
      const buf = this.stintLaps.get(item.pid) ?? []
      buf.push(item.lapTimeMillis)
      this.stintLaps.set(item.pid, buf)
    }

    if (item.lapTimeMillis > 0 && item.lapNumber > 0) {
      const hist = this.lapHistory.get(item.pid) ?? []
      hist.push({ lap: item.lapNumber, ms: item.lapTimeMillis, valid: isCleanLap })
      if (hist.length > this.cfg.maxLapHistory) hist.shift()
      this.lapHistory.set(item.pid, hist)
    }
  }

  applyClock(item: ClockItem): void {
    this.clock = item
  }

  applyFlag(item: FlagItem): void {
    const newFlag = mapFlag(item.flag)
    if ((item.flag === 'SafetyCar' || item.flag === 'VirtualSafetyCar') && this.flag !== 'SC') {
      this.scCount++
      this.scLap = item.lapNumber
    }
    this.flag = newFlag
  }

  applyRaceLog(item: RaceLogItem): void {
    const text = item.message ?? item.text ?? ''
    if (!text) return
    const participant = item.pid ? this.participants.get(item.pid) : undefined
    const carNumRaw = participant?.carNumber ?? item.carNumber
    const carNum    = carNumRaw ? parseInt(carNumRaw) : NaN
    const hasCar    = Number.isFinite(carNum) && carNum > 0
    const classId   = participant?.classId ?? item.classId
    const carClass  = hasCar ? mapClassStrict(classId) : undefined
    this.pushMessage({
      id:        this.nextMsgId(),
      timestamp: this.formatTs(item.ts),
      type:      'general',
      carNum:    hasCar ? carNum : undefined,
      carClass,
      text,
    })
  }

  applyPitIn(item: PitItem): void {
    const ls = this.laps.get(item.pid)
    if (ls) this.laps.set(item.pid, { ...ls, inPit: true })
    this.pitCount.set(item.pid, (this.pitCount.get(item.pid) ?? 0) + 1)

    const stints = this.stints.get(item.pid) ?? []
    if (stints.length > 0 && stints[stints.length - 1].endLap === null) {
      const open = stints[stints.length - 1]
      open.endLap = item.lapNumber
      const buf = this.stintLaps.get(item.pid) ?? []
      if (buf.length > 0) {
        const avgMs = buf.reduce((a, b) => a + b, 0) / buf.length
        open.avgLap = formatMs(avgMs)
      }
      this.stintLaps.set(item.pid, [])
    }
    this.stints.set(item.pid, stints)
    this.pitInTs.set(item.pid, item.ts ? new Date(item.ts).getTime() : this.cfg.now())

    const participant = this.participants.get(item.pid)
    if (participant) {
      const carNumStr = participant.carNumber || item.carNumber || ''
      const carNum    = carNumStr ? parseInt(carNumStr) : NaN
      if (!Number.isFinite(carNum) || carNum <= 0) return
      const carClass = mapClassStrict(participant.classId || item.classId)
      this.pushMessage({
        id:        this.nextMsgId(),
        timestamp: this.formatTs(item.ts),
        type:      'pit',
        carNum,
        carClass,
        text:      `#${carNumStr} ${participant.teamName} 피트 인`,
      })
    }
  }

  applyPitOut(item: PitItem): void {
    const ls = this.laps.get(item.pid)
    if (ls) this.laps.set(item.pid, { ...ls, inPit: false })

    const stints = this.stints.get(item.pid) ?? []
    const inTs   = this.pitInTs.get(item.pid)
    const outTs  = item.ts ? new Date(item.ts).getTime() : this.cfg.now()
    if (inTs && stints.length > 0) {
      const closed = stints[stints.length - 1]
      if (closed.endLap !== null) {
        closed.pitDuration = ((outTs - inTs) / 1000).toFixed(1)
      }
      this.pitInTs.delete(item.pid)
    }
    stints.push({ startLap: item.lapNumber + 1, endLap: null, tire: '?' })
    this.stints.set(item.pid, stints)

    const participant = this.participants.get(item.pid)
    if (participant) {
      const carNumStr = participant.carNumber || item.carNumber || ''
      const carNum    = carNumStr ? parseInt(carNumStr) : NaN
      if (!Number.isFinite(carNum) || carNum <= 0) return
      const carClass = mapClassStrict(participant.classId || item.classId)
      this.pushMessage({
        id:        this.nextMsgId(),
        timestamp: this.formatTs(item.ts),
        type:      'pit',
        carNum,
        carClass,
        text:      `#${carNumStr} ${participant.teamName} 피트 아웃`,
      })
    }
  }

  private formatTs(ts: string): string {
    return new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  // ── Build normalized views ─────────────────────────────────────

  buildCars(): Car[] {
    const participants = Array.from(this.participants.values())
    if (participants.length === 0) return []

    let overallBest = Infinity
    this.laps.forEach(ls => {
      if (ls.bestLapMs && ls.bestLapMs < overallBest) overallBest = ls.bestLapMs
    })

    const restoredByCarNum = isCarsRestoreValid(this.restoredCars)
      ? new Map(this.restoredCars.map(c => [c.carNumStr, c]))
      : new Map<string, Car>()

    const mapped = participants.map((p): Car => {
      const rank = this.ranks.get(p.id)
      const gap  = this.gaps.get(p.id)
      const laps = this.laps.get(p.id)
      const pits = this.pitCount.get(p.id) ?? 0
      const sectorBests = this.sectorBest.get(p.id)
      const restored = restoredByCarNum.get(p.carNumber)

      const hasLiveStatus = !!(rank || laps)
      const status = rank?.isDeleted ? 'OUT'
        : (laps?.inPit ? 'PIT' : (hasLiveStatus ? 'RUN' : (restored?.status ?? 'RUN')))

      const sectorEnter = this.sectorEnterTs.get(p.id)
      const sectorDurs  = this.sectorDuration.get(p.id)
      const sectorNum   = rank?.sectorNumber
      const sectorEnterTs = sectorEnter && sectorEnter.sector === sectorNum ? sectorEnter.ts : undefined
      const sectorDurationMs = sectorDurs && sectorNum
        ? sectorDurs[Math.max(0, Math.min(2, sectorNum - 1))] || undefined
        : undefined

      return {
        pos:          rank?.overallPosition ?? restored?.pos    ?? 1,
        clsPos:       rank?.position        ?? restored?.clsPos ?? 1,
        carClass:     mapClass(p.classId),
        carNum:       parseInt(p.carNumber) || 0,
        carNumStr:    p.carNumber,
        team:         p.teamName,
        drivers:      p.drivers.map(d => d.threeLettersName).join(' / '),
        manufacturer: p.manufacturer || restored?.manufacturer,
        tire:         restored?.tire ?? '?',
        laps:         rank?.lapNumber ?? restored?.laps ?? 0,
        lastLap:      laps?.lastLapMs ? formatMs(laps.lastLapMs) : (restored?.lastLap ?? '--:--.---'),
        bestLap:      laps?.bestLapMs ? formatMs(laps.bestLapMs) : (restored?.bestLap ?? '--:--.---'),
        gap:          gap ? formatGap(gap.gapToFirstMillis, gap.gapToFirstLaps) : (restored?.gap ?? 'Leader'),
        interval:     gap ? formatGap(gap.gapToAheadMillis, gap.gapToAheadLaps) : (restored?.interval ?? '--'),
        pitstops:     pits || (restored?.pitstops ?? 0),
        status,
        isFastestLap: !!(laps?.bestLapMs && laps.bestLapMs === overallBest) || (!laps && (restored?.isFastestLap ?? false)),
        lastColor:    laps?.lastColor ?? restored?.lastColor,
        bestColor:    laps?.bestColor ?? restored?.bestColor,
        sectorNum:    rank?.sectorNumber ?? restored?.sectorNum,
        s1Ms:         sectorBests?.[0] ?? restored?.s1Ms ?? null,
        s2Ms:         sectorBests?.[1] ?? restored?.s2Ms ?? null,
        s3Ms:         sectorBests?.[2] ?? restored?.s3Ms ?? null,
        sectorEnterTs,
        sectorDurationMs,
      } as Car
    })

    return mapped
      .filter(c => c.carNum > 0)
      .sort((a, b) => a.pos - b.pos)
  }

  buildRaceInfo(): RaceInfo {
    const clock    = this.clock
    const schedule = this.schedule
    const total    = schedule?.lengthLimit?.timeLimitSeconds ?? this.cfg.totalSecondsFallback
    const totalMs  = total * 1000

    let elapsed = clock?.elapsedTimeMillisNow ?? 0
    if (elapsed === 0 || (clock && this.cfg.now() - new Date(clock.startTime).getTime() > elapsed + 5000)) {
      const startTimeStr = clock?.startTime ?? schedule?.clock?.startTime
      if (startTimeStr) {
        const startMs = new Date(startTimeStr).getTime()
        if (Number.isFinite(startMs) && startMs > 0) {
          elapsed = Math.max(elapsed, this.cfg.now() - startMs)
        }
      }
    }
    const remaining = Math.max(0, totalMs - elapsed)

    return {
      name:      this.sessionName,
      round:     this.cfg.round ?? 0,
      elapsed:   formatElapsed(elapsed),
      total:     `${Math.round(total / 3600)}h`,
      remaining: formatElapsed(remaining),
      flag:      this.flag,
      weather:   this.cfg.weatherFallback,
    }
  }

  buildCarStints(): CarStint[] {
    return Array.from(this.participants.values())
      .map((p): CarStint => ({
        carNum:    parseInt(p.carNumber) || 0,
        carNumStr: p.carNumber,
        carClass:  mapClass(p.classId),
        team:      p.teamName,
        stints:    this.stints.get(p.id) ?? [{ startLap: 1, endLap: null, tire: '?' }],
      }))
      .filter(c => c.carNum > 0)
      .sort((a, b) => a.carNum - b.carNum)
  }

  buildDriverStats(): DriverStat[] {
    const participants = Array.from(this.participants.values())
    if (participants.length === 0) return []

    let globalBestMs = Infinity
    this.laps.forEach(ls => {
      if (ls.bestLapMs && ls.bestLapMs < globalBestMs) globalBestMs = ls.bestLapMs
    })

    return participants
      .map((p): DriverStat => {
        const lapState = this.laps.get(p.id)
        const rankItem = this.ranks.get(p.id)
        const bestMs   = lapState?.bestLapMs ?? null
        const isSessionBest = !!(bestMs && bestMs === globalBestMs)
        const totalMs  = rankItem?.elapsedTimeMillis ?? 0
        const primaryDriver = p.drivers[0]

        const sb = this.sectorBest.get(p.id)
        const allSectorsKnown = sb && sb[0] !== null && sb[1] !== null && sb[2] !== null
        const optimalMs = allSectorsKnown ? (sb![0]! + sb![1]! + sb![2]!) : null
        const gap = (bestMs && optimalMs && bestMs >= optimalMs) ? bestMs - optimalMs : null

        return {
          carNum:         parseInt(p.carNumber) || 0,
          carNumStr:      p.carNumber,
          carClass:       mapClass(p.classId),
          team:           p.teamName,
          driver:         primaryDriver?.displayName || primaryDriver?.threeLettersName || p.threeLettersName,
          bestLap:        formatMs(bestMs),
          bestLapMs:      bestMs,
          s1:             formatSectorMs(sb?.[0] ?? null),
          s2:             formatSectorMs(sb?.[1] ?? null),
          s3:             formatSectorMs(sb?.[2] ?? null),
          optimalLap:     formatMs(optimalMs),
          optimalLapMs:   optimalMs,
          gapToOptimalMs: gap,
          totalTime:      formatDuration(totalMs),
          isSessionBest,
        }
      })
      .filter(d => d.carNum > 0)
      .sort((a, b) => a.carNum - b.carNum)
  }

  /** Stats. Pass the cars[] from buildCars() to avoid recomputing them. */
  buildStats(cars: Car[] = this.buildCars()): Stats {
    const leaderLap = this.schedule?.leaderLap ?? 0

    let totalPitstops = 0
    this.pitCount.forEach(n => { totalPitstops += n })

    let fastestMs = Infinity
    let fastestCar: Car | undefined
    const participantList = Array.from(this.participants.values())
    cars.forEach(car => {
      const pid = participantList.find(p => p.carNumber === car.carNumStr)?.id ?? 0
      const ls  = this.laps.get(pid)
      if (ls?.bestLapMs && ls.bestLapMs < fastestMs) {
        fastestMs  = ls.bestLapMs
        fastestCar = car
      }
    })

    return {
      leaderLap,
      totalPitstops,
      fastestLap: {
        time:   formatMs(fastestMs === Infinity ? null : fastestMs),
        carNum: fastestCar?.carNum ?? 0,
        team:   fastestCar?.team  ?? '',
      },
      safetyCars:   this.scCount,
      safetyCarlap: this.scLap,
    }
  }

  buildLapHistory(): Record<string, LapHistoryEntry[]> {
    const out: Record<string, LapHistoryEntry[]> = {}
    this.lapHistory.forEach((hist, pid) => {
      const p = this.participants.get(pid)
      if (!p || hist.length === 0) return
      out[p.carNumber] = hist
    })
    return out
  }

  getMessages(): Message[] {
    return this.messages
  }

  /** Full normalized snapshot. Computes cars once and reuses for stats. */
  snapshot(): RaceState {
    const cars = this.buildCars()
    return {
      cars,
      raceInfo:    this.buildRaceInfo(),
      stats:       this.buildStats(cars),
      carStints:   this.buildCarStints(),
      driverStats: this.buildDriverStats(),
      messages:    this.messages,
      lapHistory:  this.buildLapHistory(),
    }
  }
}

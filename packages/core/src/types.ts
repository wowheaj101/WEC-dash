// ── UI types (canonical) ──────────────────────────────────────────
// Mirror of the web app's app/types/race.ts. During Phase 0 the web app
// keeps its own copy; a later step makes app/types/race.ts re-export these.

export type CarClass   = 'HYPERCAR' | 'LMP2' | 'LMGT3'
export type Status     = 'RUN' | 'PIT' | 'OUT' | 'OFF' | 'STOP'
export type Tire       = 'S' | 'M' | 'H' | 'W' | 'I' | '?'
export type FlagStatus = 'GREEN' | 'YELLOW' | 'SC' | 'RED'

export interface Car {
  pos:           number
  clsPos:        number
  carClass:      CarClass
  carNum:        number
  /** Original car number string preserving leading zeros (e.g. "007" vs "7"). Use as React key. */
  carNumStr:     string
  team:          string
  drivers:       string
  /** Vehicle/manufacturer model (e.g. "Toyota TS010 Hybrid", "BMW M Hybrid V8") */
  manufacturer?: string
  tire:          Tire
  laps:          number
  lastLap:       string
  bestLap:       string
  gap:           string
  interval:      string
  pitstops:      number
  status:        Status
  isFastestLap:  boolean
  lastColor?:    'sb' | 'pb'
  bestColor?:    'sb' | 'pb'
  sectorNum?:    number
  /** Best sector times (ms) — null when not measured yet */
  s1Ms?:         number | null
  s2Ms?:         number | null
  s3Ms?:         number | null
  /** Absolute ts (ms) when the car entered its current sector — used for TrackMap interpolation */
  sectorEnterTs?:    number
  /** Rolling average duration of the car's current sector in ms */
  sectorDurationMs?: number
}

export interface RaceInfo {
  name:      string
  round:     number
  elapsed:   string
  total:     string
  remaining: string
  flag:      FlagStatus
  weather:   { air: number; track: number; humidity: number; condition: string }
}

export interface Stats {
  leaderLap:     number
  totalPitstops: number
  fastestLap:    { time: string; carNum: number; team: string }
  safetyCars:    number
  safetyCarlap:  number
}

export interface Message {
  id:        number
  timestamp: string
  type:      'pit' | 'driver_change' | 'safety_car' | 'incident' | 'fastest' | 'general'
  carNum?:   number
  carClass?: CarClass
  text:      string
}

export interface DriverStat {
  carNum:         number
  carNumStr:      string
  carClass:       CarClass
  team:           string
  driver:         string
  bestLap:        string
  bestLapMs:      number | null
  s1:             string
  s2:             string
  s3:             string
  optimalLap:     string
  optimalLapMs:   number | null
  gapToOptimalMs: number | null
  totalTime:      string
  isSessionBest:  boolean
}

export interface LapHistoryEntry {
  lap:   number
  ms:    number
  valid: boolean
}

export interface StintEntry {
  startLap:     number
  endLap:       number | null
  tire:         Tire
  avgLap?:      string
  pitDuration?: string
}

export interface CarStint {
  carNum:    number
  carNumStr: string
  carClass:  CarClass
  team:      string
  stints:    StintEntry[]
}

/** Full normalized state the engine emits per tick. */
export interface RaceState {
  cars:        Car[]
  raceInfo:    RaceInfo
  stats:       Stats
  carStints:   CarStint[]
  driverStats: DriverStat[]
  messages:    Message[]
  lapHistory:  Record<string, LapHistoryEntry[]>
}

// ── Griiip SignalR input types ────────────────────────────────────
// Mirror of the web app's app/lib/griiipClient.ts event types. The engine
// consumes these; the ingest worker will feed the same shapes from Node.

export interface GriiipDriver {
  displayName:      string
  threeLettersName: string
  categoryId:       string
  country:          { codeTwo: string } | null
}

export interface GriiipParticipant {
  id:               number   // sessionParticipantId (pid)
  carNumber:        string
  classId:          string
  teamName:         string
  threeLettersName: string
  drivers:          GriiipDriver[]
  manufacturer:     string
  country:          { codeTwo: string } | null
}

export interface RankItem {
  pid:               number
  carNumber:         string
  classId:           string
  overallPosition:   number
  position:          number
  lapNumber:         number
  sectorNumber:      number
  isDeleted:         boolean
  elapsedTimeMillis: number
}

export interface GapItem {
  pid:              number
  carNumber:        string
  classId:          string
  gapToFirstMillis: number
  gapToFirstLaps:   number
  gapToAheadMillis: number
  gapToAheadLaps:   number
  lapNumber:        number
  isDeleted:        boolean
}

export interface LapItem {
  pid:            number
  carNumber:      string
  classId:        string
  lapNumber:      number
  lapTimeMillis:  number
  isValid:        boolean
  color:          'Green' | 'Yellow' | 'Purple'
  isStartedInPit: boolean
  isEndedInPit:   boolean
}

export interface ClockItem {
  sid:                  number
  increment:            number
  elapsedTimeMillisNow: number
  elapsedTimeMillis:    number
  startTime:            string
}

export interface FlagItem {
  sid:           number
  flag:          string
  lapNumber:     number
  sectorNumbers: number[]
}

export interface RaceLogItem {
  sid:               number
  pid:               number
  carNumber:         string
  classId:           string
  message?:          string
  text?:             string
  ts:                string
  elapsedTimeMillis: number
}

export interface PitItem {
  sid:               number
  pid:               number
  carNumber:         string
  classId:           string
  lapNumber:         number
  elapsedTimeMillis: number
  ts:                string
}

export interface LiveScheduleSession {
  sid:         number
  leaderLap:   number
  currentFlag: string
  isStarted:   boolean
  clock:       ClockItem
  lengthLimit: { timeLimitSeconds: number }
}

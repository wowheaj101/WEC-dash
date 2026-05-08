export type CarClass  = 'HYPERCAR' | 'LMP2' | 'LMGT3'
export type Status    = 'RUN' | 'PIT' | 'OUT' | 'OFF' | 'STOP'
export type Tire      = 'S' | 'M' | 'H' | 'W' | 'I' | '?'
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
  leaderLap:    number
  totalPitstops: number
  fastestLap:   { time: string; carNum: number; team: string }
  safetyCars:   number
  safetyCarlap: number
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
  carNum:        number
  carNumStr:     string
  carClass:      CarClass
  team:          string
  driver:        string
  bestLap:       string
  bestLapMs:     number | null   // for sorting + chart
  s1:            string
  s2:            string
  s3:            string
  /** Sum of best sectors. From REST `optimalLapTime`. Live: best-sector-sum if all 3 known. */
  optimalLap:    string
  optimalLapMs:  number | null
  /** bestLap - optimalLap (ms). Positive = pace lost in best lap. null when missing. */
  gapToOptimalMs: number | null
  totalTime:     string
  isSessionBest: boolean
}

export interface LapHistoryEntry {
  lap:    number
  ms:     number
  /** false if invalid lap (Yellow/SC) or in/out lap. */
  valid:  boolean
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

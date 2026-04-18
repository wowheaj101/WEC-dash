export type CarClass  = 'HYPERCAR' | 'LMP2' | 'LMGT3'
export type Status    = 'RUN' | 'PIT' | 'OUT' | 'OFF' | 'STOP'
export type Tire      = 'S' | 'M' | 'H' | 'W' | 'I'
export type FlagStatus = 'GREEN' | 'YELLOW' | 'SC' | 'RED'

export interface Car {
  pos:           number
  clsPos:        number
  carClass:      CarClass
  carNum:        number
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
  carClass:      CarClass
  team:          string
  driver:        string
  bestLap:       string
  s1:            string
  s2:            string
  s3:            string
  totalTime:     string
  isSessionBest: boolean
}

export interface StintEntry {
  startLap:     number
  endLap:       number | null
  tire:         Tire
  avgLap?:      string
  pitDuration?: string
}

export interface CarStint {
  carNum:   number
  carClass: CarClass
  team:     string
  stints:   StintEntry[]
}

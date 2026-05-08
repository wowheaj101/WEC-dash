import type { Car, RaceInfo, Stats, Message, CarStint, DriverStat } from './race'

export interface RaceSnapshot {
  idx:          number   // 순번
  ts:           number   // Unix ms
  cars:         Car[]
  raceInfo:     RaceInfo
  stats:        Stats
  messages:     Message[]
  /** Added in #6-3 (2026-05-09). Older snapshots may not include these — use `?? []` on read. */
  carStints?:   CarStint[]
  driverStats?: DriverStat[]
}

export interface RaceMeta {
  id:          string   // "2026-r2"
  year:        number
  round:       number
  name:        string
  circuit:     string
  countryFlag: string
  duration:    string
  date:        string   // "2026-04-19"
  snapshots:   number   // 저장된 스냅샷 수
  updatedAt:   number   // 마지막 업데이트 Unix ms
}

export interface RaceData {
  meta:      RaceMeta
  snapshots: RaceSnapshot[]
}

export interface RaceIndex {
  races: RaceMeta[]
}

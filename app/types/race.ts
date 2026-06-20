// Canonical UI types now live in @wec/core (shared by the web app and the
// ingest worker). This module re-exports them so the many existing
// `@/app/types/race` imports keep working unchanged.
export type {
  CarClass, Status, Tire, FlagStatus,
  Car, RaceInfo, Stats, Message,
  DriverStat, LapHistoryEntry, StintEntry, CarStint,
} from '@wec/core'

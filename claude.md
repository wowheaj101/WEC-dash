# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Dev server (auto-increments port if 3000 is in use)
npm run build    # Production build
npm run lint     # ESLint via next lint
```

No test framework is configured.

## Architecture

**WEC Live Timing Dashboard** — Next.js 14 (App Router) + TypeScript + Tailwind CSS. Connects directly from the browser to Griiip's SignalR hub (the backend behind `livetiming.fiawec.com`). No custom backend server; deployment target is Vercel free tier.

### Data flow

```
Browser
  → GET https://insights.griiip.com/meta/sessions-schedule-live
      (find live WEC session by seriesID === 10)
  → GET https://insights.griiip.com/meta/sessions/${sid}/participants
      (load car/driver/team roster once per session)
  → @microsoft/signalr  →  https://insights.griiip.com/live-session-stream
      (Azure SignalR Service, hub: sessionstreamhub)
  → invoke("JoinGroup", "SID-${sid}-${channel}") for each channel
  → listen on "lv-${channel}" events (1-second incremental updates)
```

**Channels subscribed:**
| Channel | Event | Content |
|---|---|---|
| `ranks` | `lv-ranks` | `{ items: [{ pid, overallPosition, position, lapNumber, sectorNumber, isDeleted }] }` |
| `gaps` | `lv-gaps` | `{ items: [{ pid, gapToFirstMillis, gapToFirstLaps, gapToAheadMillis, gapToAheadLaps }] }` |
| `laps` | `lv-laps` | `{ pid, lapTimeMillis, lapNumber, isValid, color, isStartedInPit, isEndedInPit }` |
| `session-clock` | `lv-session-clock` | `{ elapsedTimeMillisNow, startTime, increment }` |
| `race-flags` | `lv-race-flags` | `{ flag, lapNumber, sectorNumbers }` |
| `race-log` | `lv-race-log` | `{ message, text, ts, pid, carNumber }` |
| `pit-in` | `lv-pit-in` | `{ pid, carNumber, classId, lapNumber, ts }` |
| `pit-out` | `lv-pit-out` | `{ pid, carNumber, classId, lapNumber, ts }` |

### Key files

| File | Role |
|---|---|
| `app/lib/griiipClient.ts` | `GriiipClient` class — session discovery, participant loading, SignalR lifecycle, channel join/leave. Uses `@microsoft/signalr` via dynamic `import()` to stay SSR-safe. |
| `app/hooks/useTiming71.ts` | React hook that orchestrates `GriiipClient`. Maintains Map-based state (`rankRef`, `gapRef`, `lapRef`, `pitCountRef`). Flushes to React on every update. On connect, fetches last Blob snapshot to restore state and continue `snapshotIdxRef`. Falls back to `app/data/dummyData.ts` only when `status === 'no_service'`. Auto-reconnects after 30 s. |
| `app/types/race.ts` | Single source of truth for UI types: `Car`, `RaceInfo`, `Stats`, `Message`, `DriverStat`, `CarStint`. `Car` has optional `lastColor`/`bestColor` (`'sb' \| 'pb'`) and `sectorNum` (current sector 1–3) from Griiip `ranks` channel. |
| `app/data/trackPaths.ts` | SVG circuit outlines for all 7 WEC venues. `CircuitSVG` interface includes `path`, `pitLane`, `sf`, `sectors`, and `sectorPoints` — three `[x,y]` coords (one per sector) used by `TrackMap` for car dot placement. |
| `app/components/TrackMap.tsx` | Renders SVG circuit + car dots. Car positions are sector-based: each car is placed near `circuit.sectorPoints[sectorNum-1]` and spread in a small grid when multiple cars share a sector. Works for all circuits (not Spa-only). Pit-lane cars cluster near the S/F line. |
| `app/lib/getRoundStatus.ts` | Calendar phase logic (`active`, `race_week`, `upcoming`, etc.) used by `Header` and `RoundBanner`. |
| `app/components/RoundBanner.tsx` | Shows round info. When `phase === 'active'` but not live, shows an orange "재연결 중" banner instead of hiding. |
| `app/components/Header.tsx` | Uses `current` round (not `next`) when `phase === 'active'`, even if not live. |
| `app/data/calendar.ts` | `CURRENT_SEASON` — 2026 WEC calendar. Update each season. |
| `app/api/timing71/relays/route.ts` | Legacy proxy — no longer used for connection but kept for compatibility. |

### Tabs (`page.tsx`)

`page.tsx` holds all tab state (`Tab` union) and passes data from `useTiming71()` down to components.

| Tab ID | Label | Components rendered |
|---|---|---|
| `dashboard` | 대시보드 | `Leaderboard` + `TrackMap` (compact) + `StintOverview` + `MessageFeed` (compact) |
| `trackmap` | 트랙맵 | `TrackMap` (full) |
| `drivers` | 드라이버 분석 | `DriverAnalysis` |
| `stints` | 스틴트 분석 | `StintAnalysis` |
| `messages` | 레이스컨트롤 | `MessageFeed` (full) |
| `replay` | 📼 다시보기 | `ReplayBrowser` + `ReplayControls` + dashboard view |

### Griiip API quirks

- **Session ID is an integer** (`sid: 18110`), not the UUID from `dvr.timing71.org`. Always discover via `/meta/sessions-schedule-live` → match `event.season.seriesID === 10`.
- **`ranks` sends one car per message** (incremental) — merge into `Map<pid, RankItem>` before rendering.
- **`position`** = class position; **`overallPosition`** = overall position. Gap display uses class-relative values from `gaps` channel.
- **`laps` color**: `"Purple"` = session best (`sb`), `"Green"` = personal best (`pb`), `"Yellow"` = slow/invalid.
- **Griiip does not provide weather** — `useWeather` hook always uses Open-Meteo based on circuit GPS from the calendar.
- **`@microsoft/signalr`** dynamic import required (SSR-unsafe). `next.config.js` webpack fallbacks (`fs`, `net`, `tls`, etc.) remain for safety.
- **WEC seriesID = 10** in Griiip's schema (`event.season.seriesID`).
- **No service**: if `/meta/sessions-schedule-live` returns no WEC session, `status === 'no_service'` and dummy data is shown. Initial state uses empty arrays — dummy data is injected only at this point.
- **Snapshot restore on connect**: `startConnection()` fetches `/api/races/${year}/${round}` before connecting to SignalR. If a saved `RaceData` exists, the latest snapshot is restored immediately (cars, raceInfo, stats, messages) and `snapshotIdxRef` continues from `latest.idx + 1` to avoid overwriting prior snapshots on refresh.

### Design system

- Monospace font everywhere; dark background `#0a0a0a`.
- Class colors: Hypercar `#ff4040` · LMP2 `#3399ff` · LMGT3 `#33cc44` · fastest lap `#bb55ff` · pit row bg `#160f00`.
- Gap/interval display is always class-relative, never overall.
- `TrackMap` uses `sectorNum` from `Car` (mapped from `RankItem.sectorNumber`) to place car dots near each circuit's `sectorPoints[sectorNum-1]`. Cars in the same sector are spread in a 3-wide grid. Pit cars cluster near S/F. Full GPS-based interpolation is not yet implemented.

---

> Full project spec (goals, WEC data reference, phased roadmap) was previously in this file.
> See `git log` for the original content if needed.

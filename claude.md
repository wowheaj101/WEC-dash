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

**WEC Live Timing Dashboard** — Next.js 14 (App Router) + TypeScript + Tailwind CSS. Connects directly from the browser to Timing71's WAMP WebSocket. No backend server; deployment target is Vercel free tier.

### Data flow

```
Browser
  → GET /api/timing71/relays          (Next.js Route Handler, CORS proxy)
  → picks lowest-connection relay URL
  → autobahn-browser WAMP WebSocket   (wss://relay.timing71.org/ws, realm: "timing")
  → subscribe "livetiming.directory"  → discover WEC service UUID
  → subscribe "livetiming.service.<UUID>" → 1 s incremental state updates
```

### Key files

| File | Role |
|---|---|
| `app/lib/timing71.ts` | `Timing71Client` class — WAMP lifecycle, relay selection, DIRECTORY subscription, WEC service discovery. Uses `autobahn-browser` via dynamic `import()` to stay SSR-safe. |
| `app/lib/parseManifest.ts` | `buildColMap()` — converts `colSpec: [[name, flagBitmask], ...]` → `{ columnName → arrayIndex }`. Must re-run on every manifest because column order differs per race. |
| `app/lib/normalizeState.ts` | Converts Timing71 raw data → typed UI models. `mergeState()` handles incremental updates (only changed cells are sent; `null` = unchanged). Raw cells: `string \| number \| [value, metaFlag] \| null`. `"sb"` = session best (purple), `"pb"` = personal best. |
| `app/hooks/useTiming71.ts` | React hook that orchestrates the above. Falls back to `app/data/dummyData.ts` when `status === 'no_service'` or before connecting. Auto-reconnects after 30 s on disconnect. |
| `app/types/race.ts` | Single source of truth for UI types: `Car`, `RaceInfo`, `Stats`, `Message`, `DriverStat`, `CarStint`. |
| `app/api/timing71/relays/route.ts` | Thin CORS proxy for `timing71.org/relays`. The WAMP connection itself is browser-direct. |

### Tabs (`page.tsx`)

`page.tsx` holds all tab state (`Tab` union) and passes data from `useTiming71()` down to components.

| Tab | Components rendered |
|---|---|
| `dashboard` | `Leaderboard` + `TrackMap` (compact) + `StintOverview` + `MessageFeed` (compact) |
| `trackmap` | `TrackMap` (full) |
| `drivers` | `DriverAnalysis` |
| `stints` | `StintAnalysis` |
| `messages` | `MessageFeed` (full) |

### Timing71 quirks

- **`colSpec` is per-race** — always wait for the manifest message before parsing car rows. Columns like `Num`, `State`, `Class`, `Laps`, `Last`, `Best`, `Gap`, `C.Gap`, `Pits`, `Tyre` may appear in any order or under alternate names.
- **Gap columns**: prefer `C.Gap` / `C.Int` (class-relative) over `Gap` / `Int` (overall).
- **`autobahn-browser`** must be used, not `autobahn`. The Node.js `autobahn` package pulls in `fs` and `vertx` which break webpack. `next.config.js` adds `resolve.fallback` for `fs`, `net`, `tls`, `dns`, `child_process`.
- **WEC coverage is not guaranteed** — Timing71 may not cover every race weekend. When `status === 'no_service'`, dummy data is shown automatically.

### Design system

- Monospace font everywhere; dark background `#0a0a0a`.
- Class colors: Hypercar `#ff4040` · LMP2 `#3399ff` · LMGT3 `#33cc44` · fastest lap `#bb55ff` · pit row bg `#160f00`.
- Gap/interval display is always class-relative, never overall.
- `TrackMap` interpolates car positions from sector crossing times — Timing71 provides no GPS coordinates.

---

> Full project spec (goals, WEC data reference, phased roadmap) was previously in this file.
> See `git log` for the original content if needed.

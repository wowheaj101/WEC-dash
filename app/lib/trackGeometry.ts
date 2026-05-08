import type { CircuitSVG } from '@/app/data/trackPaths'

export type Point = [number, number]

/**
 * Compute linearly-interpolated coordinate along a sector segment.
 *
 * Medium-term heuristic: we don't have true GPS; use three anchor points —
 * previous sector center → current sector center → next sector center —
 * and linearly interpolate based on `t` ∈ [0, 1] representing progress
 * through the current sector.
 *
 * `t` near 0 → just entered the sector (close to previous sector anchor).
 * `t` near 1 → about to exit the sector (close to next sector anchor).
 */
export function sampleSectorPath(
  circuit: CircuitSVG,
  sector:  1 | 2 | 3,
  t:       number,
): Point {
  const clamped = Math.max(0, Math.min(1, t))
  const s = sector - 1
  const prev = circuit.sectorPoints[(s + 2) % 3]
  const cur  = circuit.sectorPoints[s]
  const next = circuit.sectorPoints[(s + 1) % 3]

  // Two-segment linear: prev → cur (for t<0.5) then cur → next (for t>=0.5)
  if (clamped < 0.5) {
    const k = clamped * 2
    return [prev[0] + (cur[0] - prev[0]) * k, prev[1] + (cur[1] - prev[1]) * k]
  }
  const k = (clamped - 0.5) * 2
  return [cur[0] + (next[0] - cur[0]) * k, cur[1] + (next[1] - cur[1]) * k]
}

/**
 * Spread multiple cars around a base position in a compact grid.
 * Used when several cars share a sector and we want them distinguishable.
 */
export function spreadAroundPoint(
  base:   Point,
  index:  number,
  gap:    number = 11,
  cols:   number = 3,
): Point {
  const col = index % cols
  const row = Math.floor(index / cols)
  return [
    base[0] + (col - (cols - 1) / 2) * gap,
    base[1] + (row - 1) * gap,
  ]
}

/**
 * Returns pit-lane start coordinate.
 * Parses the "M x,y ..." path to extract the first point.
 */
export function parsePitLaneStart(pitLane: string): Point {
  const m = pitLane.trim().match(/M\s*([\d.]+)[ ,]([\d.]+)/)
  if (!m) return [0, 0]
  return [parseFloat(m[1]), parseFloat(m[2])]
}

export interface CarDotInput {
  key:         string | number
  classPos:    number
  sectorNum:   number | null | undefined
  isPit:       boolean
  /** ms since sector entered (for interpolation); optional */
  sectorElapsedMs?: number
  /** estimated sector duration in ms (optional) */
  sectorDurationMs?: number
}

export interface CarDotOutput {
  key: string | number
  /** Final [x, y] in SVG units */
  pos: Point
}

/**
 * Compute dot positions for a full field of cars.
 *
 * Algorithm (medium-term):
 *   1. Pit cars → cluster near pit-lane start (grid offset).
 *   2. On-track cars → group by sector, sort each group by class position
 *      so the leader sits closest to the sector anchor point.
 *   3. If `sectorElapsedMs` + `sectorDurationMs` provided, compute t and
 *      interpolate using `sampleSectorPath`, then offset by class rank.
 *
 * Stateless + deterministic — safe to call every tick.
 */
export function layoutCars(
  circuit: CircuitSVG,
  cars:    CarDotInput[],
): CarDotOutput[] {
  const pitStart = parsePitLaneStart(circuit.pitLane)

  // 1. Split pit vs. track
  const pitCars:   CarDotInput[] = []
  const bySector:  Record<1 | 2 | 3, CarDotInput[]> = { 1: [], 2: [], 3: [] }

  for (const c of cars) {
    if (c.isPit) { pitCars.push(c); continue }
    const s = Math.max(1, Math.min(3, c.sectorNum ?? 1)) as 1 | 2 | 3
    bySector[s].push(c)
  }

  // 2. Sort each sector bucket by class position (leader first)
  for (const s of [1, 2, 3] as const) {
    bySector[s].sort((a, b) => (a.classPos || 999) - (b.classPos || 999))
  }

  const out: CarDotOutput[] = []

  // 3. Pit cars → cluster around pit-lane start
  pitCars.forEach((c, i) => {
    const col = i % 4
    const row = Math.floor(i / 4)
    out.push({
      key: c.key,
      pos: [pitStart[0] + (col - 1.5) * 9, pitStart[1] - 14 + row * 9],
    })
  })

  // 4. On-track — place each sector's leader near anchor, followers spread
  for (const s of [1, 2, 3] as const) {
    const group = bySector[s]
    group.forEach((c, rank) => {
      let anchor: Point
      if (c.sectorElapsedMs != null && c.sectorDurationMs && c.sectorDurationMs > 0) {
        const t = c.sectorElapsedMs / c.sectorDurationMs
        anchor = sampleSectorPath(circuit, s, t)
      } else {
        anchor = circuit.sectorPoints[s - 1]
      }
      out.push({ key: c.key, pos: spreadAroundPoint(anchor, rank) })
    })
  }

  return out
}

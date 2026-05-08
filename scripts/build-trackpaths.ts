/**
 * Read tmp/normalized/_paths.json and generate the body of trackPaths.ts
 * with the new path data + sensible bbox-derived defaults for sf/pitLane/
 * sectors/sectorPoints. Corners + DRS zones are left as empty arrays —
 * they were calibrated to the old hand-drawn paths and need re-marking
 * per circuit in a follow-up pass.
 *
 * The script writes to tmp/normalized/trackPaths.generated.ts. Compare
 * with the current trackPaths.ts and merge manually (we don't overwrite
 * the source file automatically).
 *
 * Usage:
 *   npx tsx scripts/build-trackpaths.ts
 */
import { promises as fs } from 'fs'
import path from 'path'

const TARGET_W = 480
const TARGET_H = 380

interface NormalizedEntry {
  d:          string
  bbox:       { minX: number; minY: number; maxX: number; maxY: number }
  sourceSvg:  string
  sourcePath: string
}

// VAR_NAME for each circuit key (matches existing trackPaths.ts naming)
const VAR_BY_KEY: Record<string, string> = {
  'Circuit de Spa-Francorchamps':       'SPA',
  'Autodromo Enzo e Dino Ferrari':      'IMOLA',
  'Circuit de la Sarthe':               'LE_MANS',
  'Interlagos Circuit':                 'INTERLAGOS',
  'Circuit of the Americas':            'COTA',
  'Fuji Speedway':                      'FUJI',
  'Lusail International Circuit':       'LUSAIL',
  'Bahrain International Circuit':      'BAHRAIN',
}

/**
 * Re-walk the normalized d to find the bbox actually rendered
 * (paths.json bbox is in source coords; we want viewBox coords here).
 */
function pathBBox(d: string): { minX: number; minY: number; maxX: number; maxY: number } {
  const re = /([MmLlHhVvCcSsQqTtAaZz])|(-?\d*\.?\d+(?:[eE][+-]?\d+)?)/g
  let cmd = ''
  let cx = 0, cy = 0, sx = 0, sy = 0
  const args: number[] = []
  let isFirst = true
  const bb = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }

  const flush = () => {
    if (!cmd) return
    const C = cmd.toUpperCase()
    const isRel = cmd === cmd.toLowerCase()
    const visit = (x: number, y: number) => {
      if (x < bb.minX) bb.minX = x
      if (y < bb.minY) bb.minY = y
      if (x > bb.maxX) bb.maxX = x
      if (y > bb.maxY) bb.maxY = y
    }
    const xy = (i: number, treatAbs: boolean): [number, number] => {
      const x = treatAbs ? args[i] : (isRel ? cx + args[i] : args[i])
      const y = treatAbs ? args[i + 1] : (isRel ? cy + args[i + 1] : args[i + 1])
      return [x, y]
    }
    switch (C) {
      case 'M': case 'L': case 'T': {
        for (let i = 0; i < args.length; i += 2) {
          const treatAbs = !isRel || (C === 'M' && isFirst && i === 0)
          const [x, y] = xy(i, treatAbs)
          if (C === 'M' && i === 0) { sx = x; sy = y }
          visit(x, y); cx = x; cy = y
        }
        break
      }
      case 'H': for (const v of args) { const x = isRel ? cx + v : v; visit(x, cy); cx = x } break
      case 'V': for (const v of args) { const y = isRel ? cy + v : v; visit(cx, y); cy = y } break
      case 'C': {
        for (let i = 0; i < args.length; i += 6) {
          const [x1, y1] = xy(i, !isRel)
          const [x2, y2] = xy(i + 2, !isRel)
          const [x,  y]  = xy(i + 4, !isRel)
          visit(x1, y1); visit(x2, y2); visit(x, y); cx = x; cy = y
        }
        break
      }
      case 'S': case 'Q': {
        for (let i = 0; i < args.length; i += 4) {
          const [x1, y1] = xy(i, !isRel)
          const [x,  y]  = xy(i + 2, !isRel)
          visit(x1, y1); visit(x, y); cx = x; cy = y
        }
        break
      }
      case 'A': {
        for (let i = 0; i < args.length; i += 7) {
          const [x, y] = xy(i + 5, !isRel)
          visit(x, y); cx = x; cy = y
        }
        break
      }
      case 'Z': cx = sx; cy = sy; break
    }
    args.length = 0
    isFirst = false
  }

  let m: RegExpExecArray | null
  while ((m = re.exec(d)) !== null) {
    if (m[1]) {
      flush()
      cmd = m[1]
    } else if (m[2] !== undefined) {
      args.push(parseFloat(m[2]))
    }
  }
  flush()
  return bb
}

interface Defaults {
  pathLine:        string
  pitLaneLine:     string
  sf:              string
  sectors:         string
  sectorPoints:    string
}

function buildDefaults(d: string, bbox: { minX: number; minY: number; maxX: number; maxY: number }): Defaults {
  // Place sf line at the topmost edge of the bbox, centered horizontally.
  const cx = (bbox.minX + bbox.maxX) / 2
  const cy = (bbox.minY + bbox.maxY) / 2
  const w  = bbox.maxX - bbox.minX
  const h  = bbox.maxY - bbox.minY

  const r = (n: number) => Math.round(n * 100) / 100
  const ri = (n: number) => Math.round(n)

  const sfX = ri(cx)
  const sfY = ri(bbox.minY)

  const sf = `[${sfX - 6}, ${sfY - 4}, ${sfX + 6}, ${sfY + 4}]`

  const pitLaneStart = ri(sfX - w * 0.18)
  const pitLaneEnd   = ri(sfX + w * 0.18)
  const pitLaneY     = ri(sfY - 6)
  const pitLane = `\`M ${pitLaneStart},${pitLaneY} L ${pitLaneEnd},${pitLaneY}\``

  // Two sector dividers approximately 1/3 and 2/3 around the visual box.
  const s1x = ri(bbox.maxX - 6)
  const s1y = ri(cy)
  const s2x = ri(bbox.minX + 6)
  const s2y = ri(cy)
  const sectors = `[
    [${s1x - 4}, ${s1y - 4}, ${s1x + 4}, ${s1y + 4}],
    [${s2x - 4}, ${s2y - 4}, ${s2x + 4}, ${s2y + 4}],
  ]`

  // Three sector anchors — top-right, bottom-left, top-left of the bbox.
  const p1 = `[${ri(bbox.maxX - w * 0.15)}, ${ri(bbox.minY + h * 0.25)}]`
  const p2 = `[${ri(bbox.minX + w * 0.20)}, ${ri(bbox.maxY - h * 0.25)}]`
  const p3 = `[${ri(cx)}, ${ri(bbox.minY + h * 0.10)}]`
  const sectorPoints = `[${p1}, ${p2}, ${p3}]`

  // Wrap the d as a multi-line template literal.
  const wrapped = '`' + d.replace(/\\/g, '\\\\').replace(/`/g, '\\`') + '`'

  return {
    pathLine:     wrapped,
    pitLaneLine:  pitLane,
    sf,
    sectors,
    sectorPoints,
  }
}

function entry(varName: string, key: string, def: Defaults, sourceSvg: string): string {
  return `// ── ${key} ─────────────────────────────────────
// Source: trackSVG/${sourceSvg}
const ${varName}: CircuitSVG = {
  path: ${def.pathLine},
  pitLane: ${def.pitLaneLine},
  sf:      ${def.sf},
  sectors: ${def.sectors},
  sectorPoints: ${def.sectorPoints},
  // corners + drs reset — re-mark per circuit in Phase 2.5.
}`
}

async function main() {
  const json = JSON.parse(
    await fs.readFile(path.resolve('tmp', 'normalized', '_paths.json'), 'utf-8'),
  ) as Record<string, NormalizedEntry>

  const blocks: string[] = []
  const exportPairs: string[] = []

  for (const [key, e] of Object.entries(json)) {
    const v = VAR_BY_KEY[key]
    if (!v) {
      console.warn(`No VAR_BY_KEY for "${key}" — skipping`)
      continue
    }
    const realBBox = pathBBox(e.d)
    const def = buildDefaults(e.d, realBBox)
    blocks.push(entry(v, key, def, e.sourceSvg))
    exportPairs.push(`  '${key}': ${v},`)
  }

  const out = `// AUTO-GENERATED by scripts/build-trackpaths.ts — review then merge into app/data/trackPaths.ts
// Source SVGs: trackSVG/, normalized via scripts/normalize-tracks.ts
// viewBox: 0 0 ${TARGET_W} ${TARGET_H}
import type { CircuitSVG } from '@/app/data/trackPaths'

${blocks.join('\n\n')}

export const CIRCUIT_SVG_GENERATED: Record<string, CircuitSVG> = {
${exportPairs.join('\n')}
}
`
  const outPath = path.resolve('tmp', 'normalized', 'trackPaths.generated.ts')
  await fs.writeFile(outPath, out)
  console.log(`Wrote ${outPath}`)
  console.log(`\n${blocks.length} circuits generated. Review and merge into app/data/trackPaths.ts.`)
}

main().catch(e => { console.error(e); process.exit(1) })

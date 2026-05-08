/**
 * For each known {sourceSvg, pathId}, run Inkscape to extract just that path
 * (with all parent transforms applied) into a standalone plain SVG, then
 * normalize the path's coordinate space into our 480×380 dashboard viewBox.
 *
 * Output:
 *   tmp/normalized/<key>.svg     — single-path SVG in viewBox 0 0 480 380
 *   tmp/normalized/<key>.png     — rendered preview
 *   tmp/normalized/_paths.json   — { circuitKey: { d, bbox, sourceSvg, sourcePath } }
 *
 * Usage:
 *   npx tsx scripts/normalize-tracks.ts
 */
import { promises as fs } from 'fs'
import { spawnSync } from 'child_process'
import path from 'path'

const INKSCAPE = process.env.INKSCAPE_PATH || 'C:\\Program Files\\Inkscape\\bin\\inkscape.exe'
const SRC_DIR  = path.resolve('trackSVG')
const OUT_DIR  = path.resolve('tmp', 'normalized')

const TARGET_W = 480
const TARGET_H = 380
const MARGIN   = 24  // viewBox px on each side

interface TrackSource {
  /** Calendar circuit key (must match `app/data/calendar.ts`) */
  circuitKey: string
  sourceSvg:  string
  pathId:     string
}

const TRACKS: TrackSource[] = [
  { circuitKey: 'Circuit de Spa-Francorchamps',
    sourceSvg:  'Spa-Francorchamps_of_Belgium.svg',
    pathId:     'path2840' },
  { circuitKey: 'Autodromo Enzo e Dino Ferrari',
    sourceSvg:  'Imola_2009.svg',
    pathId:     'path2582' },
  { circuitKey: 'Bahrain International Circuit',
    sourceSvg:  'Bahrain_International_Circuit--Grand_Prix_Layout.svg',
    pathId:     'path4003' },
  { circuitKey: 'Fuji Speedway',
    sourceSvg:  'Fuji.svg',
    pathId:     'path2609' },
  { circuitKey: 'Lusail International Circuit',
    sourceSvg:  'Lusail_International_Circuit_2023.svg',
    pathId:     'path2406' },
  { circuitKey: 'Interlagos Circuit',
    sourceSvg:  'Autódromo_José_Carlos_Pace_(AKA_Interlagos)_track_map.svg',
    pathId:     'path2840' },
  { circuitKey: 'Circuit of the Americas',
    sourceSvg:  'Austin_circuit.svg',
    pathId:     'path3774' },
]

// ── Path d-string parsing → numeric coords for bbox + transform ──

interface Token {
  cmd:  string  // single letter: M, m, L, l, H, h, V, v, C, c, S, s, Q, q, T, t, A, a, Z, z
  args: number[]
}

function tokenizePath(d: string): Token[] {
  const out: Token[] = []
  // Capture command letter + run of numbers (with sign and decimals/exponents)
  const re = /([MmLlHhVvCcSsQqTtAaZz])|(-?\d*\.?\d+(?:[eE][+-]?\d+)?)/g
  let cur: Token | null = null
  let m: RegExpExecArray | null
  while ((m = re.exec(d)) !== null) {
    if (m[1]) {
      if (cur) out.push(cur)
      cur = { cmd: m[1], args: [] }
    } else if (m[2] !== undefined) {
      cur?.args.push(parseFloat(m[2]))
    }
  }
  if (cur) out.push(cur)
  return out
}

/** Walk the path and call `visit` for every *absolute-coordinate* (x, y) it touches. */
function walkPath(d: string, visit: (x: number, y: number) => void): void {
  const tokens = tokenizePath(d)
  let cx = 0, cy = 0       // current point
  let sx = 0, sy = 0       // subpath start
  for (const t of tokens) {
    const a = t.args
    const isRel = t.cmd === t.cmd.toLowerCase()
    const C = t.cmd.toUpperCase()

    const consumeXY = (i: number): [number, number] => {
      const x = a[i], y = a[i + 1]
      return isRel ? [cx + x, cy + y] : [x, y]
    }

    switch (C) {
      case 'M':
      case 'L':
      case 'T':
        for (let i = 0; i < a.length; i += 2) {
          const [x, y] = consumeXY(i)
          if (C === 'M' && i === 0) { sx = x; sy = y }
          visit(x, y)
          cx = x; cy = y
        }
        break
      case 'H':
        for (const v of a) {
          const x = isRel ? cx + v : v
          visit(x, cy); cx = x
        }
        break
      case 'V':
        for (const v of a) {
          const y = isRel ? cy + v : v
          visit(cx, y); cy = y
        }
        break
      case 'C':
        for (let i = 0; i < a.length; i += 6) {
          const [x1, y1] = consumeXY(i)
          const [x2, y2] = consumeXY(i + 2)
          const [x,  y]  = consumeXY(i + 4)
          visit(x1, y1); visit(x2, y2); visit(x, y)
          cx = x; cy = y
        }
        break
      case 'S':
      case 'Q':
        for (let i = 0; i < a.length; i += 4) {
          const [x1, y1] = consumeXY(i)
          const [x,  y]  = consumeXY(i + 2)
          visit(x1, y1); visit(x, y)
          cx = x; cy = y
        }
        break
      case 'A':
        for (let i = 0; i < a.length; i += 7) {
          // skip rx, ry, rotation, large-arc, sweep
          const [x, y] = consumeXY(i + 5)
          visit(x, y)
          cx = x; cy = y
        }
        break
      case 'Z':
        cx = sx; cy = sy
        break
    }
  }
}

interface BBox { minX: number; minY: number; maxX: number; maxY: number }

function pathBBox(d: string): BBox {
  const bb: BBox = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  walkPath(d, (x, y) => {
    if (x < bb.minX) bb.minX = x
    if (y < bb.minY) bb.minY = y
    if (x > bb.maxX) bb.maxX = x
    if (y > bb.maxY) bb.maxY = y
  })
  return bb
}

/** Apply linear transform x' = sx*x + tx, y' = sy*y + ty to absolute coords in d.
 *  Relative segments stay relative (their deltas only need scaling, not translation).
 *
 *  SVG quirk: the FIRST command's first pair, even if lowercase 'm', is implicitly
 *  absolute (per the spec). Anything after that is interpreted by case as written.
 */
function transformPath(d: string, sx: number, sy: number, tx: number, ty: number): string {
  const tokens = tokenizePath(d)
  const out: string[] = []

  for (let ti = 0; ti < tokens.length; ti++) {
    const t = tokens[ti]
    const C = t.cmd.toUpperCase()
    const isRel = t.cmd === t.cmd.toLowerCase()
    const a = [...t.args]
    const isFirstCmd = ti === 0

    switch (C) {
      case 'M':
      case 'L':
      case 'T':
        for (let i = 0; i < a.length; i += 2) {
          // First pair of the first `m` is implicitly absolute → apply translation.
          // Otherwise honor case: uppercase = absolute (translate), lowercase = relative (no translate).
          const treatAbs = !isRel || (C === 'M' && isFirstCmd && i === 0)
          a[i]     = a[i] * sx + (treatAbs ? tx : 0)
          a[i + 1] = a[i + 1] * sy + (treatAbs ? ty : 0)
        }
        break
      case 'H':
        for (let i = 0; i < a.length; i++) {
          a[i] = a[i] * sx + (isRel ? 0 : tx)
        }
        break
      case 'V':
        for (let i = 0; i < a.length; i++) {
          a[i] = a[i] * sy + (isRel ? 0 : ty)
        }
        break
      case 'C':
        for (let i = 0; i < a.length; i += 6) {
          for (let j = 0; j < 6; j += 2) {
            a[i + j]     = a[i + j]     * sx + (isRel ? 0 : tx)
            a[i + j + 1] = a[i + j + 1] * sy + (isRel ? 0 : ty)
          }
        }
        break
      case 'S':
      case 'Q':
        for (let i = 0; i < a.length; i += 4) {
          for (let j = 0; j < 4; j += 2) {
            a[i + j]     = a[i + j]     * sx + (isRel ? 0 : tx)
            a[i + j + 1] = a[i + j + 1] * sy + (isRel ? 0 : ty)
          }
        }
        break
      case 'A':
        // rx, ry scale by |sx|, |sy| (assuming uniform scale we use sx==sy here)
        for (let i = 0; i < a.length; i += 7) {
          a[i]     = a[i]     * Math.abs(sx)         // rx
          a[i + 1] = a[i + 1] * Math.abs(sy)         // ry
          // rotation, large-arc, sweep flags unchanged at i+2, i+3, i+4
          a[i + 5] = a[i + 5] * sx + (isRel ? 0 : tx) // x
          a[i + 6] = a[i + 6] * sy + (isRel ? 0 : ty) // y
        }
        break
    }

    const argStr = a.map(v => +v.toFixed(2)).join(' ')
    out.push(t.cmd + (argStr ? ' ' + argStr : ''))
  }

  return out.join(' ')
}

// ── Extraction pipeline ─────────────────────────────────────────

function safeKey(circuitKey: string): string {
  return circuitKey.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
}

async function extractPath(src: TrackSource): Promise<{ d: string; bbox: BBox }> {
  const srcPath = path.join(SRC_DIR, src.sourceSvg)
  // Use circuitKey-based name so two source SVGs with the same path id don't collide.
  const tmpFlat = path.join(OUT_DIR, `_flat_${safeKey(src.circuitKey)}.svg`)

  // Use Inkscape to export only the target id, with transforms applied.
  const r = spawnSync(INKSCAPE, [
    srcPath,
    `--export-id=${src.pathId}`,
    '--export-id-only',
    '--export-area-drawing',
    '--export-type=svg',
    '--export-plain-svg',
    `--export-filename=${tmpFlat}`,
  ], { stdio: 'pipe', encoding: 'utf-8' })

  if (r.status !== 0) {
    throw new Error(`Inkscape failed for ${src.sourceSvg}: ${r.stderr}`)
  }

  const flat = await fs.readFile(tmpFlat, 'utf-8')
  // The exported SVG has just one rendered <path>; the first match outside <defs>
  // is what we want. Inkscape preserves <defs> with clip paths etc, so strip those.
  const stripped = flat
    .replace(/<defs\b[\s\S]*?<\/defs>/g, '')
    .replace(/<clipPath\b[\s\S]*?<\/clipPath>/g, '')
  const m = /<path\b[^>]*\bd="([^"]+)"/.exec(stripped)
  if (!m) throw new Error(`No <path d="..."> in flattened SVG for ${src.circuitKey}`)

  const d = m[1]
  const bbox = pathBBox(d)
  return { d, bbox }
}

function normalizeToViewBox(d: string, bbox: BBox): string {
  const srcW = bbox.maxX - bbox.minX
  const srcH = bbox.maxY - bbox.minY
  const fitW = TARGET_W - 2 * MARGIN
  const fitH = TARGET_H - 2 * MARGIN
  const s = Math.min(fitW / srcW, fitH / srcH)
  // Center within margin
  const tx = (TARGET_W - srcW * s) / 2 - bbox.minX * s
  const ty = (TARGET_H - srcH * s) / 2 - bbox.minY * s
  return transformPath(d, s, s, tx, ty)
}

async function renderPreview(circuitKey: string, normalizedD: string): Promise<void> {
  const safe = circuitKey.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
  const svgPath = path.join(OUT_DIR, `${safe}.svg`)
  const pngPath = path.join(OUT_DIR, `${safe}.png`)

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TARGET_W} ${TARGET_H}" width="${TARGET_W}" height="${TARGET_H}">
  <rect width="100%" height="100%" fill="#0d0f12"/>
  <text x="8" y="14" fill="#888" font-family="monospace" font-size="9">${circuitKey}</text>
  <path d="${normalizedD}" fill="none" stroke="#e21e19" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`
  await fs.writeFile(svgPath, svg)

  spawnSync(INKSCAPE, [
    svgPath,
    '--export-type=png',
    `--export-filename=${pngPath}`,
    `--export-width=${TARGET_W * 2}`,
  ], { stdio: 'pipe' })
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true })

  const summary: Record<string, { d: string; bbox: BBox; sourceSvg: string; sourcePath: string }> = {}

  for (const src of TRACKS) {
    process.stdout.write(`  ${src.circuitKey.padEnd(36)} … `)
    try {
      const { d, bbox } = await extractPath(src)
      const normalized = normalizeToViewBox(d, bbox)
      await renderPreview(src.circuitKey, normalized)
      summary[src.circuitKey] = {
        d:          normalized,
        bbox,
        sourceSvg:  src.sourceSvg,
        sourcePath: src.pathId,
      }
      console.log(`OK  bbox=${(bbox.maxX - bbox.minX).toFixed(0)}×${(bbox.maxY - bbox.minY).toFixed(0)}, d=${normalized.length} chars`)
    } catch (e) {
      console.log(`FAIL  ${(e as Error).message}`)
    }
  }

  await fs.writeFile(
    path.join(OUT_DIR, '_paths.json'),
    JSON.stringify(summary, null, 2),
  )
  console.log(`\nPreviews + paths.json written to ${OUT_DIR}`)
}

main().catch(e => { console.error(e); process.exit(1) })

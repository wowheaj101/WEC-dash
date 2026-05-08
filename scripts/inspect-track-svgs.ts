/**
 * For each SVG in trackSVG/, list every <path> outside <defs>/<clipPath>/<pattern>
 * with its id, fill, stroke, stroke-width, and d-length. The track outline is
 * usually one of the longest visible paths with a thick black stroke and gray
 * fill (asphalt).
 *
 * Usage:
 *   npx tsx scripts/inspect-track-svgs.ts
 */
import { promises as fs } from 'fs'
import path from 'path'

const SRC_DIR = path.resolve('trackSVG')

interface PathRow {
  id:          string
  fill:        string
  stroke:      string
  strokeWidth: string
  dLength:     number
}

function stripDefs(svg: string): string {
  // Remove <defs>...</defs> and <clipPath>...</clipPath> contents so we
  // only look at visible paths.
  return svg
    .replace(/<defs\b[\s\S]*?<\/defs>/g, '')
    .replace(/<clipPath\b[\s\S]*?<\/clipPath>/g, '')
    .replace(/<pattern\b[\s\S]*?<\/pattern>/g, '')
}

function getAttr(tag: string, name: string): string {
  const re = new RegExp(`\\b${name}="([^"]*)"`)
  const m = re.exec(tag)
  if (m) return m[1]
  // Try inside style="..."
  const sm = /\bstyle="([^"]*)"/.exec(tag)
  if (sm) {
    const styleRe = new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`)
    const m2 = styleRe.exec(sm[1])
    if (m2) return m2[1].trim()
  }
  return ''
}

function listPaths(svg: string): PathRow[] {
  const cleaned = stripDefs(svg)
  const out: PathRow[] = []
  const pathRe = /<path\b([^>]*)\/?>/g
  let m: RegExpExecArray | null
  while ((m = pathRe.exec(cleaned)) !== null) {
    const tag = m[0]
    const dMatch = /\bd="([^"]+)"/.exec(tag)
    if (!dMatch) continue
    out.push({
      id:          getAttr(tag, 'id') || '(no id)',
      fill:        getAttr(tag, 'fill'),
      stroke:      getAttr(tag, 'stroke'),
      strokeWidth: getAttr(tag, 'stroke-width'),
      dLength:     dMatch[1].length,
    })
  }
  return out
}

async function main() {
  const files = (await fs.readdir(SRC_DIR)).filter(f => f.toLowerCase().endsWith('.svg'))
  for (const f of files) {
    const svg = await fs.readFile(path.join(SRC_DIR, f), 'utf-8')
    const paths = listPaths(svg).sort((a, b) => b.dLength - a.dLength)
    console.log(`\n=== ${f} (${paths.length} visible paths) ===`)
    console.log('  rank   d_chars   fill                     stroke               sw      id')
    paths.slice(0, 12).forEach((p, i) => {
      console.log(
        `  ${String(i + 1).padStart(2)}   ${String(p.dLength).padStart(7)}   ${p.fill.padEnd(24)}  ${p.stroke.padEnd(20)}  ${p.strokeWidth.padEnd(6)}  ${p.id}`
      )
    })
    if (paths.length > 12) console.log(`  … ${paths.length - 12} more`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })

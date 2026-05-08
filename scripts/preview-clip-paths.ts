/**
 * For each extracted SVG in tmp/extracted/, dump each <clipPath> path
 * into a standalone preview SVG so we can visually identify which
 * clip path (if any) is the track outline.
 *
 * Output: tmp/clip-previews/<circuit>__<idx>.svg
 *
 * Open in a browser or VSCode SVG preview to see each path's shape.
 *
 * Usage:
 *   npx tsx scripts/preview-clip-paths.ts
 */
import { promises as fs } from 'fs'
import path from 'path'

const SRC_DIR = path.resolve('tmp', 'extracted')
const OUT_DIR = path.resolve('tmp', 'clip-previews')

interface ClipPath {
  id: string
  d:  string
}

function parseClipPaths(svg: string): ClipPath[] {
  const out: ClipPath[] = []
  const clipRe = /<clipPath\b([^>]*)>([\s\S]*?)<\/clipPath>/g
  let m: RegExpExecArray | null
  while ((m = clipRe.exec(svg)) !== null) {
    const attrs = m[1]
    const inner = m[2]
    const idMatch = /\bid="([^"]+)"/.exec(attrs)
    const id = idMatch ? idMatch[1] : `clip-${out.length}`
    const dMatch = /\bd="([^"]+)"/.exec(inner)
    if (dMatch) out.push({ id, d: dMatch[1] })
  }
  return out
}

function parseViewBox(svg: string): { w: number; h: number } | null {
  // Prefer the topmost <image>'s scale transform — that's the page size.
  const scaleMatch = /transform="scale\(([\d.eE+-]+),([\d.eE+-]+)\)"/.exec(svg)
  if (scaleMatch) {
    return { w: parseFloat(scaleMatch[1]), h: parseFloat(scaleMatch[2]) }
  }
  const vb = /viewBox="([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)"/.exec(svg)
  if (vb) return { w: parseFloat(vb[3]), h: parseFloat(vb[4]) }
  return null
}

function renderPreview(circuit: string, idx: number, total: number, clip: ClipPath, page: { w: number; h: number }): string {
  // Clip paths in the source live in the [0,1] unit space; scale them by the
  // page dimensions so the rendered preview matches the original page.
  const w = 800
  const h = Math.round(w * (page.h / page.w))
  const sx = w / page.w
  const sy = h / page.h
  // Inner transform: first scale unit → page, then page → preview.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect width="100%" height="100%" fill="#0d0f12"/>
  <text x="10" y="20" fill="#888" font-family="monospace" font-size="11">${circuit} — clip[${idx}/${total - 1}] id=${clip.id} (d_chars=${clip.d.length})</text>
  <g transform="scale(${sx * page.w}, ${sy * page.h})">
    <path d="${clip.d}" fill="#e21e19" fill-rule="evenodd" stroke="none" opacity="0.85"/>
  </g>
</svg>
`
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true })

  const files = (await fs.readdir(SRC_DIR)).filter(f => f.endsWith('.svg'))
  if (files.length === 0) {
    console.warn(`No SVGs found in ${SRC_DIR}. Run npm run extract:tracks first.`)
    return
  }

  for (const file of files) {
    const circuit = file.replace(/\.svg$/, '')
    const svg = await fs.readFile(path.join(SRC_DIR, file), 'utf-8')
    const clips = parseClipPaths(svg)
    const page  = parseViewBox(svg) ?? { w: 1122.56, h: 793.6 }

    if (clips.length === 0) {
      console.log(`${circuit}: no clip paths`)
      continue
    }

    // Sort clips by d length descending — the track outline is usually one of the longest.
    clips.sort((a, b) => b.d.length - a.d.length)

    for (let i = 0; i < clips.length; i++) {
      const out = renderPreview(circuit, i, clips.length, clips[i], page)
      const outName = `${circuit}__${String(i).padStart(2, '0')}_${clips[i].id}.svg`
      await fs.writeFile(path.join(OUT_DIR, outName), out)
    }
    console.log(`${circuit}: ${clips.length} preview(s) written`)
  }

  console.log(`\nOpen ${OUT_DIR} in VSCode or a browser. Smallest-index files = longest clip paths.`)
}

main().catch(e => { console.error(e); process.exit(1) })

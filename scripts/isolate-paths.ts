/**
 * For each SVG in trackSVG/, write the top-N visible paths as their own
 * isolated SVG (preserving original viewBox + width/height + parent styles).
 * Output: tmp/path-isolated/<base>__<rank>__<id>.svg
 *
 * Then render each to PNG so we can visually identify the track-outline path.
 *
 * Usage:
 *   npx tsx scripts/isolate-paths.ts
 */
import { promises as fs } from 'fs'
import path from 'path'

const SRC_DIR = path.resolve('trackSVG')
const OUT_DIR = path.resolve('tmp', 'path-isolated')
const TOP_N   = 5

interface PathInfo {
  rank:   number
  id:     string
  d:      string
  attrs:  string  // raw attribute string from <path ...>
}

function getAttr(tag: string, name: string): string {
  const m = new RegExp(`\\b${name}="([^"]*)"`).exec(tag)
  return m ? m[1] : ''
}

function listPaths(svg: string): PathInfo[] {
  const cleaned = svg
    .replace(/<defs\b[\s\S]*?<\/defs>/g, '')
    .replace(/<clipPath\b[\s\S]*?<\/clipPath>/g, '')
    .replace(/<pattern\b[\s\S]*?<\/pattern>/g, '')

  const list: PathInfo[] = []
  const re = /<path\b([^>]*)\/?>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(cleaned)) !== null) {
    const attrs = m[1]
    const dMatch = /\bd="([^"]+)"/.exec(attrs)
    if (!dMatch) continue
    list.push({
      rank: 0,
      id:   getAttr(m[0], 'id') || '_',
      d:    dMatch[1],
      attrs,
    })
  }
  list.sort((a, b) => b.d.length - a.d.length)
  list.forEach((p, i) => { p.rank = i + 1 })
  return list
}

function getRootAttrs(svg: string): { width: string; height: string; viewBox: string } {
  const root = /<svg\b([^>]*)>/.exec(svg)
  const attrs = root?.[1] ?? ''
  return {
    width:   getAttr(`<svg ${attrs}>`, 'width'),
    height:  getAttr(`<svg ${attrs}>`, 'height'),
    viewBox: getAttr(`<svg ${attrs}>`, 'viewBox'),
  }
}

function buildIsolated(root: { width: string; height: string; viewBox: string }, info: PathInfo, label: string): string {
  const w  = root.width  || '800'
  const h  = root.height || '600'
  const vb = root.viewBox ? `viewBox="${root.viewBox}"` : ''

  // Render the path with a strong stroke so it's visible regardless of original styling.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" ${vb}>
  <rect width="100%" height="100%" fill="#0d0f12"/>
  <text x="10" y="20" fill="#888" font-family="monospace" font-size="11">${label}</text>
  <path d="${info.d}" fill="none" stroke="#e21e19" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true })

  const files = (await fs.readdir(SRC_DIR)).filter(f => f.toLowerCase().endsWith('.svg'))
  for (const f of files) {
    const svg = await fs.readFile(path.join(SRC_DIR, f), 'utf-8')
    const root = getRootAttrs(svg)
    const list = listPaths(svg).slice(0, TOP_N)

    const base = f.replace(/\.svg$/i, '').replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 30)
    for (const p of list) {
      const out = buildIsolated(root, p, `${f}  rank=${p.rank}/${TOP_N}  id=${p.id}  d_chars=${p.d.length}`)
      const outName = `${base}__${String(p.rank).padStart(2, '0')}_${p.id}.svg`
      await fs.writeFile(path.join(OUT_DIR, outName), out)
    }
    console.log(`${f}: top-${TOP_N} written`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })

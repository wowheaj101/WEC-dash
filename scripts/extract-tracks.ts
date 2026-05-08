/**
 * Convert every PDF in `circuitPDF/` to a plain SVG via Inkscape CLI.
 * Output goes to `tmp/extracted/<name>.svg` (gitignored).
 *
 * Usage:
 *   npx tsx scripts/extract-tracks.ts
 *
 * Requires Inkscape installed:
 *   winget install Inkscape.Inkscape
 *
 * The extracted SVG retains all paths from the PDF (track outline plus
 * corner markers, scale bars, text, etc.). Picking the actual track-outline
 * `<path>` and normalizing its viewBox to `0 0 480 380` is a follow-up step
 * — see CLAUDE.md / to-do.md #3 Phase 2.
 */
import { promises as fs } from 'fs'
import { spawnSync } from 'child_process'
import path from 'path'

const INKSCAPE_CANDIDATES = [
  process.env.INKSCAPE_PATH,
  'C:\\Program Files\\Inkscape\\bin\\inkscape.exe',
  'C:\\Program Files (x86)\\Inkscape\\bin\\inkscape.exe',
  'inkscape',
].filter(Boolean) as string[]

const PDF_DIR = path.resolve('circuitPDF')
const OUT_DIR = path.resolve('tmp', 'extracted')

function findInkscape(): string {
  for (const candidate of INKSCAPE_CANDIDATES) {
    const r = spawnSync(candidate, ['--version'], { stdio: 'pipe' })
    if (r.status === 0) return candidate
  }
  throw new Error(
    'Inkscape not found. Install it (winget install Inkscape.Inkscape) ' +
    'or set INKSCAPE_PATH to the full path of inkscape.exe.',
  )
}

async function listPdfs(): Promise<string[]> {
  const entries = await fs.readdir(PDF_DIR)
  return entries
    .filter(e => e.toLowerCase().endsWith('.pdf'))
    .sort()
}

function safeName(pdfName: string): string {
  return pdfName
    .replace(/\.pdf$/i, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .toLowerCase()
}

async function extract(inkscape: string, pdf: string): Promise<{ ok: boolean; bytes: number; ms: number; out: string }> {
  const inPath  = path.join(PDF_DIR, pdf)
  const outPath = path.join(OUT_DIR, `${safeName(pdf)}.svg`)

  const t0 = Date.now()
  const result = spawnSync(inkscape, [
    inPath,
    '--export-type=svg',
    '--export-plain-svg',
    `--export-filename=${outPath}`,
  ], { stdio: 'pipe', encoding: 'utf-8' })
  const ms = Date.now() - t0

  if (result.status !== 0) {
    process.stderr.write(`  stderr: ${(result.stderr || '').trim()}\n`)
    return { ok: false, bytes: 0, ms, out: outPath }
  }

  const stat = await fs.stat(outPath).catch(() => null)
  return { ok: !!stat, bytes: stat?.size ?? 0, ms, out: outPath }
}

async function main() {
  const inkscape = findInkscape()
  console.log(`Inkscape: ${inkscape}`)

  await fs.mkdir(OUT_DIR, { recursive: true })

  const pdfs = await listPdfs()
  if (pdfs.length === 0) {
    console.warn(`No PDFs found in ${PDF_DIR}`)
    return
  }

  console.log(`Extracting ${pdfs.length} PDF(s) → ${OUT_DIR}\n`)

  let okCount = 0
  for (const pdf of pdfs) {
    process.stdout.write(`  ${pdf.padEnd(36)} … `)
    const r = await extract(inkscape, pdf)
    if (r.ok) {
      okCount++
      console.log(`OK  ${(r.bytes / 1024).toFixed(1)} KB  ${r.ms} ms  →  ${path.basename(r.out)}`)
    } else {
      console.log(`FAIL  ${r.ms} ms`)
    }
  }

  console.log(`\nDone: ${okCount}/${pdfs.length} succeeded.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})

import { NextResponse }     from 'next/server'
import { appendSnapshot }   from '@/app/lib/raceStore'
import type { RaceMeta, RaceSnapshot } from '@/app/types/replay'

export interface SnapshotPayload {
  year:        number
  round:       number
  name:        string
  circuit:     string
  countryFlag: string
  duration:    string
  snapshot:    RaceSnapshot
}

const MAX_BODY_BYTES = 512 * 1024  // 512 KB

export async function POST(req: Request) {
  try {
    // Same-origin check: reject cross-origin writes
    const origin = req.headers.get('origin')
    const host   = req.headers.get('host')
    if (origin && host && !origin.includes(host)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    // Body size guard
    const contentLength = req.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'payload too large' }, { status: 413 })
    }

    const body = (await req.json()) as SnapshotPayload
    const { year, round, name, circuit, countryFlag, duration, snapshot } = body

    // Input validation
    if (!Number.isInteger(year) || year < 2020 || year > 2035) {
      return NextResponse.json({ error: 'invalid year' }, { status: 400 })
    }
    if (!Number.isInteger(round) || round < 1 || round > 15) {
      return NextResponse.json({ error: 'invalid round' }, { status: 400 })
    }
    if (!name || !circuit || !snapshot || !Array.isArray(snapshot.cars)) {
      return NextResponse.json({ error: 'invalid payload' }, { status: 400 })
    }

    const meta: RaceMeta = {
      id: `${year}-r${round}`, year, round, name, circuit,
      countryFlag, duration,
      date:      new Date(snapshot.ts).toISOString().slice(0, 10),
      snapshots: 0,            // appendSnapshot recomputes the real count
      updatedAt: Date.now(),
    }

    const snapshots = await appendSnapshot(meta, snapshot)

    return NextResponse.json({ ok: true, snapshots })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const stack   = err instanceof Error ? err.stack   : undefined
    console.error('[snapshot] ERROR:', message, stack)
    return NextResponse.json({
      ok: false,
      error: message,
      hasToken: !!(process.env.SUPABASE_URL || process.env.BLOB_READ_WRITE_TOKEN),
    }, { status: 500 })
  }
}

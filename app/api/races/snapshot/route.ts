import { NextResponse }  from 'next/server'
import { head, put }    from '@vercel/blob'
import { upsertIndex }  from '@/app/lib/raceStore'
import type { RaceData, RaceMeta, RaceSnapshot } from '@/app/types/replay'

export interface SnapshotPayload {
  year:        number
  round:       number
  name:        string
  circuit:     string
  countryFlag: string
  duration:    string
  snapshot:    RaceSnapshot
}

function racePath(year: number, round: number) {
  return `wec-dashboard/races/${year}/r${round}.json`
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SnapshotPayload
    const { year, round, name, circuit, countryFlag, duration, snapshot } = body

    const path = racePath(year, round)

    let data: RaceData = {
      meta: {
        id: `${year}-r${round}`, year, round, name, circuit,
        countryFlag, duration,
        date:      new Date(snapshot.ts).toISOString().slice(0, 10),
        snapshots: 0,
        updatedAt: Date.now(),
      },
      snapshots: [],
    }

    const existing = await head(path).catch(() => null)
    if (existing) {
      const res = await fetch(existing.url, { cache: 'no-store' })
      data = (await res.json()) as RaceData
    }

    const idx = data.snapshots.findIndex(s => s.idx === snapshot.idx)
    if (idx >= 0) data.snapshots[idx] = snapshot
    else data.snapshots.push(snapshot)

    data.snapshots.sort((a, b) => a.idx - b.idx)

    const meta: RaceMeta = {
      ...data.meta,
      snapshots: data.snapshots.length,
      updatedAt: Date.now(),
    }
    data.meta = meta

    await put(path, JSON.stringify(data), {
      access:          'private',
      contentType:     'application/json',
      addRandomSuffix: false,
    })

    await upsertIndex(meta)

    return NextResponse.json({ ok: true, snapshots: data.snapshots.length })
  } catch (err) {
    console.error('[snapshot]', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

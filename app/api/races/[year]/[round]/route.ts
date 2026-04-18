import { NextResponse } from 'next/server'
import { getRace }     from '@/app/lib/raceStore'

export async function GET(
  _req: Request,
  { params }: { params: { year: string; round: string } },
) {
  const data = await getRace(Number(params.year), Number(params.round))
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(data)
}

import { NextResponse } from 'next/server'
import { getIndex }    from '@/app/lib/raceStore'

export async function GET() {
  const index = await getIndex()
  return NextResponse.json(index)
}

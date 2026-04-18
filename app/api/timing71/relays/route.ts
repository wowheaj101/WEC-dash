import { NextResponse } from 'next/server'

// Proxy to avoid potential CORS issues from browser
export async function GET() {
  try {
    const res = await fetch('https://www.timing71.org/relays', {
      headers: { Accept: 'application/json' },
      next:    { revalidate: 0 },
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json([
      { url: 'wss://relay.timing71.org/ws', connections: 0 },
    ])
  }
}

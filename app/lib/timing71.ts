/**
 * Timing71 WAMP WebSocket 클라이언트
 *
 * 연결 흐름:
 *  1. /api/timing71/relays 에서 릴레이 서버 목록 취득 (연결 수 최소 선택)
 *  2. autobahn-js 로 WAMP 연결 (realm: "timing")
 *  3. livetiming.directory 구독 → WEC 서비스 UUID 찾기
 *  4. livetiming.service.<UUID> 구독 → 1초마다 state 수신
 *  5. analysis 토픽 구독 (선택)
 *
 * autobahn은 SSR에서 동작하지 않으므로 반드시 useEffect 안에서 connect()를 호출할 것.
 */

import type autobahn                from 'autobahn'
import type { T71Manifest } from './parseManifest'
import type { T71RawState }  from './normalizeState'

type ABSession      = autobahn.Session
type ABSubscription = autobahn.Subscription
type ABConnection   = autobahn.Connection

// ── Relay 선택 ────────────────────────────────────────────────────

interface RelayEntry {
  url:         string
  connections: number
}

async function pickRelay(): Promise<string> {
  try {
    const res  = await fetch('/api/timing71/relays')
    const list = (await res.json()) as RelayEntry[]
    if (!Array.isArray(list) || list.length === 0) throw new Error('empty')
    list.sort((a, b) => (a.connections ?? 0) - (b.connections ?? 0))
    return list[0].url
  } catch {
    return 'wss://relay.timing71.org/ws'
  }
}

// ── 콜백 인터페이스 ───────────────────────────────────────────────

export interface T71Callbacks {
  onConnected:    () => void
  onDisconnected: (reason: string) => void
  /** WEC 서비스 발견 시 호출 */
  onServiceFound: (uuid: string, name: string) => void
  /** 서비스 없음 (레이스 오프시즌 등) */
  onNoService:    () => void
  /** manifest 수신 (colSpec 포함) */
  onManifest:     (manifest: T71Manifest) => void
  /** state 업데이트 수신 */
  onState:        (state: Partial<T71RawState>, isInitial: boolean) => void
}

// ── WEC 서비스 식별 ───────────────────────────────────────────────

// DIRECTORY에서 수신하는 서비스 목록의 예상 형태
interface DirectoryService {
  name?:        string
  description?: string
  provider?:    string
}

function isWEC(entry: DirectoryService): boolean {
  const text = [entry.name, entry.description, entry.provider]
    .filter(Boolean).join(' ').toUpperCase()
  return text.includes('WEC') || text.includes('WORLD ENDURANCE')
}

// ── Timing71Client ────────────────────────────────────────────────

export class Timing71Client {
  private connection: ABConnection | null  = null
  private session:    ABSession    | null  = null
  private subs:       ABSubscription[]    = []
  private destroyed                       = false

  constructor(private readonly cb: T71Callbacks) {}

  async connect(): Promise<void> {
    if (this.destroyed) return

    const relayUrl = await pickRelay()

    // autobahn은 브라우저 전용 → dynamic import (SSR 제외)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ab = await import('autobahn-browser') as any
    const AB: typeof import('autobahn') = ab.default ?? ab

    const conn = new AB.Connection({
      url:                 relayUrl,
      realm:               'timing',
      max_retries:         20,
      max_retry_delay:     30,
      initial_retry_delay: 2,
      retry_delay_growth:  1.5,
    })

    this.connection = conn

    conn.onopen = (session) => {
      if (this.destroyed) return
      this.session = session
      this.cb.onConnected()
      this.subscribeDirectory(session)
    }

    conn.onclose = (reason) => {
      this.session = null
      this.subs    = []
      if (!this.destroyed) this.cb.onDisconnected(reason)
      // false → 자동 재연결 허용 (autobahn 내장 retry)
      return false
    }

    conn.open()
  }

  disconnect(): void {
    this.destroyed = true
    try { this.connection?.close() } catch { /* ignore */ }
    this.connection = null
    this.session    = null
    this.subs       = []
  }

  // ── DIRECTORY 구독 ──────────────────────────────────────────────

  private async subscribeDirectory(session: ABSession): Promise<void> {
    const sub = await session.subscribe(
      'livetiming.directory',
      (args) => {
        if (this.destroyed || !args) return
        this.handleDirectory(session, args)
      },
    )
    this.subs.push(sub)
  }

  private handleDirectory(session: ABSession, args: unknown[]): void {
    // DIRECTORY 메시지 형태: args[0] = { services: { [uuid]: { name, ... } } }
    // 또는 args[0] = { [uuid]: { name, ... } }
    const payload = args[0] as Record<string, unknown> | null
    if (!payload) return

    const services: Record<string, DirectoryService> =
      (payload['services'] as Record<string, DirectoryService>) ?? payload as Record<string, DirectoryService>

    let found: [string, DirectoryService] | null = null

    for (const [uuid, svc] of Object.entries(services)) {
      if (typeof svc === 'object' && svc !== null && isWEC(svc)) {
        found = [uuid, svc]
        break
      }
    }

    if (found) {
      const [uuid, svc] = found
      const name = svc.name ?? svc.description ?? 'WEC'
      this.cb.onServiceFound(uuid, name)
      this.subscribeService(session, uuid)
    } else {
      this.cb.onNoService()
    }
  }

  // ── 서비스 state 구독 ───────────────────────────────────────────

  private isInitialState = true

  private async subscribeService(session: ABSession, uuid: string): Promise<void> {
    this.isInitialState = true

    const stateSub = await session.subscribe(
      `livetiming.service.${uuid}`,
      (args) => {
        if (this.destroyed || !args) return
        this.handleServiceMessage(args)
      },
    )
    this.subs.push(stateSub)

    // analysis 구독 (선택적, 실패해도 무방)
    for (const channel of ['driver', 'stint', 'session'] as const) {
      try {
        const sub = await session.subscribe(
          `livetiming.analysis/${uuid}/${channel}`,
          () => { /* 추후 분석 데이터 처리 */ },
        )
        this.subs.push(sub)
      } catch { /* 토픽이 없는 경우 무시 */ }
    }
  }

  private handleServiceMessage(args: unknown[]): void {
    const msg = args[0] as Record<string, unknown> | null
    if (!msg) return

    // manifest가 포함된 경우 (보통 첫 번째 메시지)
    if (msg['manifest']) {
      this.cb.onManifest(msg['manifest'] as T71Manifest)
    }

    // state 데이터 추출
    const rawState = (msg['state'] ?? msg) as Partial<T71RawState>
    if (rawState) {
      this.cb.onState(rawState, this.isInitialState)
      this.isInitialState = false
    }
  }
}

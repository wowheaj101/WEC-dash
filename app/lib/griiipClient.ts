/**
 * Griiip/FIAWEC SignalR live timing client
 *
 * Connection flow:
 *  1. GET /meta/sessions-schedule-live  → find live WEC session by seriesID
 *  2. GET /meta/sessions/${sid}/participants  → car/driver info
 *  3. SignalR connect to /live-session-stream (Azure SignalR Service)
 *  4. JoinGroup("SID-${sid}-${channel}") for each channel
 *  5. Listen on "lv-${channel}" events
 */

const API_ROOT  = '/api/griiip'
const HUB_URL   = 'https://insights.griiip.com/live-session-stream'
const WEC_SERIES_ID = 10

const CHANNELS = [
  'ranks',
  'gaps',
  'laps',
  'session-clock',
  'race-flags',
  'race-log',
  'pit-in',
  'pit-out',
] as const

// ── REST types ────────────────────────────────────────────────────

export interface GriiipDriver {
  displayName:      string
  threeLettersName: string
  categoryId:       string
  country:          { codeTwo: string } | null
}

export interface GriiipParticipant {
  id:               number   // sessionParticipantId (pid)
  carNumber:        string
  classId:          string
  teamName:         string
  threeLettersName: string
  drivers:          GriiipDriver[]
  manufacturer:     string
  country:          { codeTwo: string } | null
}

// ── SignalR event types ───────────────────────────────────────────

export interface RankItem {
  pid:             number
  carNumber:       string
  classId:         string
  overallPosition: number
  position:        number   // class position
  lapNumber:       number
  sectorNumber:    number
  isDeleted:       boolean
  elapsedTimeMillis: number
}

export interface GapItem {
  pid:              number
  carNumber:        string
  classId:          string
  gapToFirstMillis: number
  gapToFirstLaps:   number
  gapToAheadMillis: number
  gapToAheadLaps:   number
  lapNumber:        number
  isDeleted:        boolean
}

export interface LapItem {
  pid:             number
  carNumber:       string
  classId:         string
  lapNumber:       number
  lapTimeMillis:   number
  isValid:         boolean
  color:           'Green' | 'Yellow' | 'Purple'
  isStartedInPit:  boolean
  isEndedInPit:    boolean
}

export interface ClockItem {
  sid:                  number
  increment:            number
  elapsedTimeMillisNow: number
  elapsedTimeMillis:    number
  startTime:            string
}

export interface FlagItem {
  sid:            number
  flag:           string
  lapNumber:      number
  sectorNumbers:  number[]
}

export interface RaceLogItem {
  sid:              number
  pid:              number
  carNumber:        string
  classId:          string
  message?:         string
  text?:            string
  ts:               string
  elapsedTimeMillis: number
}

export interface PitItem {
  sid:              number
  pid:              number
  carNumber:        string
  classId:          string
  lapNumber:        number
  elapsedTimeMillis: number
  ts:               string
}

export interface LiveScheduleSession {
  sid:               number
  leaderLap:         number
  currentFlag:       string
  isStarted:         boolean
  clock:             ClockItem
  lengthLimit:       { timeLimitSeconds: number }
}

// ── Callbacks ─────────────────────────────────────────────────────

export interface GriiipCallbacks {
  onConnected:    () => void
  onDisconnected: (reason: string) => void
  onServiceFound: (sid: number, name: string) => void
  onNoService:    () => void
  onSchedule:     (session: LiveScheduleSession) => void
  onParticipants: (participants: GriiipParticipant[]) => void
  onRanks:        (items: RankItem[]) => void
  onGaps:         (items: GapItem[]) => void
  onLap:          (item: LapItem) => void
  onClock:        (item: ClockItem) => void
  onFlag:         (item: FlagItem) => void
  onRaceLog:      (item: RaceLogItem) => void
  onPitIn:        (item: PitItem) => void
  onPitOut:       (item: PitItem) => void
}

// ── Session discovery ─────────────────────────────────────────────

async function findWECSession(): Promise<{ sid: number; name: string; schedule: LiveScheduleSession } | null> {
  const scheduleRes  = await fetch(`${API_ROOT}/meta/sessions-schedule-live`)
  const scheduleList = (await scheduleRes.json()) as LiveScheduleSession[]
  if (!Array.isArray(scheduleList) || scheduleList.length === 0) return null

  for (const item of scheduleList) {
    if (!item.sid) continue
    try {
      const metaRes = await fetch(`${API_ROOT}/meta/sessions/${item.sid}`)
      const meta    = await metaRes.json() as {
        event?: { name?: string; season?: { seriesID?: number } }
      }
      const seriesId  = meta?.event?.season?.seriesID
      const eventName = (meta?.event?.name ?? '').toUpperCase()
      if (seriesId === WEC_SERIES_ID || eventName.includes('WEC') || eventName.includes('ENDURANCE')) {
        return { sid: item.sid, name: meta.event?.name ?? 'WEC', schedule: item }
      }
    } catch { /* try next */ }
  }
  return null
}

// ── Client ────────────────────────────────────────────────────────

export class GriiipClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private hub:     any | null = null
  private destroyed            = false

  constructor(private readonly cb: GriiipCallbacks) {}

  async connect(): Promise<void> {
    if (this.destroyed) return

    // 1. Find WEC session
    let found: Awaited<ReturnType<typeof findWECSession>>
    try {
      found = await findWECSession()
    } catch {
      found = null
    }

    if (!found) {
      this.cb.onNoService()
      return
    }

    const { sid, name, schedule } = found
    this.cb.onServiceFound(sid, name)
    this.cb.onSchedule(schedule)

    // 2. Load participants
    try {
      const res          = await fetch(`${API_ROOT}/meta/sessions/${sid}/participants`)
      const participants = (await res.json()) as GriiipParticipant[]
      this.cb.onParticipants(participants)
    } catch { /* non-fatal */ }

    if (this.destroyed) return

    // 3. Connect SignalR (browser-only, dynamic import)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const signalR = await import('@microsoft/signalr') as any
    const { HubConnectionBuilder, LogLevel } = signalR

    const hub = new HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build()

    this.hub = hub

    hub.onclose((err: unknown) => {
      if (!this.destroyed) this.cb.onDisconnected(err ? 'error' : 'closed')
    })

    hub.onreconnecting(() => {
      if (!this.destroyed) this.cb.onDisconnected('reconnecting')
    })

    hub.onreconnected(() => {
      if (!this.destroyed) this.cb.onConnected()
    })

    // 4. Register event handlers
    hub.on('lv-ranks',        (data: { items: RankItem[] })  => { if (!this.destroyed && data?.items) this.cb.onRanks(data.items) })
    hub.on('lv-gaps',         (data: { items: GapItem[] })   => { if (!this.destroyed && data?.items) this.cb.onGaps(data.items) })
    hub.on('lv-laps',         (data: LapItem)                => { if (!this.destroyed && data)        this.cb.onLap(data) })
    hub.on('lv-session-clock',(data: ClockItem)              => { if (!this.destroyed && data)        this.cb.onClock(data) })
    hub.on('lv-race-flags',   (data: FlagItem)               => { if (!this.destroyed && data)        this.cb.onFlag(data) })
    hub.on('lv-race-log',     (data: RaceLogItem)            => { if (!this.destroyed && data)        this.cb.onRaceLog(data) })
    hub.on('lv-pit-in',       (data: PitItem)                => { if (!this.destroyed && data)        this.cb.onPitIn(data) })
    hub.on('lv-pit-out',      (data: PitItem)                => { if (!this.destroyed && data)        this.cb.onPitOut(data) })

    try {
      await hub.start()
    } catch (err) {
      this.hub = null
      throw new Error(`SignalR connection failed: ${err instanceof Error ? err.message : String(err)}`)
    }

    if (this.destroyed) { hub.stop(); return }

    this.cb.onConnected()

    // 5. Join all channels
    const channelErrors: string[] = []
    for (const ch of CHANNELS) {
      try {
        await hub.invoke('JoinGroup', `SID-${sid}-${ch}`)
      } catch (err) {
        channelErrors.push(ch)
        console.warn(`[SignalR] Failed to join channel ${ch}:`, err)
      }
    }

    if (channelErrors.length === CHANNELS.length) {
      throw new Error(`Failed to join any SignalR channels (tried ${channelErrors.join(', ')})`)
    }
  }

  disconnect(): void {
    this.destroyed = true
    this.hub?.stop().catch(() => {})
    this.hub = null
  }
}

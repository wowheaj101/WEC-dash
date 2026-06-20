# WEC Live Timing — 백엔드 마이그레이션 플랜 (Render + Supabase)

> 작성일: 2026-06-18
> 대상: 현재 "풀 클라이언트(Vercel only)" 구조 → "단일 ingest 백엔드 + 권위 상태 + 클라 fan-out" 구조
> 호스팅: **프론트 = Vercel**, **백엔드 ingest = Render**, **DB/Realtime = Supabase**

---

## 0. 왜 바꾸는가 (현재 구조의 한계)

| # | 문제 | 영향 |
|---|---|---|
| A | 모든 뷰어가 각자 스냅샷을 Blob에 write (클라가 `/api/races/snapshot` 호출, 각자 `snapshotIdxRef`) | **동시 접속 시 idx 충돌·last-writer-wins로 녹화 손상.** 탭 2개만 열어도 깨짐 (최우선 버그) |
| B | 스냅샷 저장이 전체 race blob 통째 read-modify-write | 레이스가 길어질수록 매 저장이 무거워짐 |
| C | 뷰어마다 독립 SignalR 연결 + 전체 정규화 | Griiip 부담 + 클라 CPU 낭비 + 뷰어 간 상태 불일치 |
| D | `/api/griiip/:path*` 가 열린 오픈 프록시 | 누구나 Vercel을 통해 insights.griiip.com 프록시 가능 |
| E | "진실의 단일 소스" 없음 | 서버측 알림/집계/온보드캠(#5) 같은 기능 불가 |

**핵심 통찰:** 정규화 엔진이 `useTiming71.ts`(React 훅)에 박혀 있다. 이걸 프레임워크 비종속 `RaceEngine`으로 빼는 것이 모든 변경의 출발점이다.

---

## 1. 타겟 아키텍처

```
            Griiip SignalR (insights.griiip.com/live-session-stream)
                        │  ← 단 하나의 연결
                        ▼
   ┌─────────────────────────────────────────────────┐
   │  Render Web Service  (apps/ingest, 상시 실행)      │
   │   • findWECSession (세션 탐색, 서버로 이동)         │
   │   • GriiipClient (단일 연결)                        │
   │   • RaceEngine (정규화 1회만 수행) ← packages/core │
   │   • 1Hz: Supabase Realtime Broadcast 로 live state │
   │   • 30~120s: Supabase Postgres 에 스냅샷 영구 기록  │
   │   • GET /healthz (keep-alive ping 대상)            │
   └─────────────────────────────────────────────────┘
              │ service_role key (write)        │ broadcast
              ▼                                  ▼
   ┌──────────────────────┐         ┌──────────────────────────┐
   │ Supabase Postgres     │         │ Supabase Realtime         │
   │  races / snapshots /  │         │  channel `race:{id}`      │
   │  live_state           │         │  (ephemeral live push)    │
   └──────────────────────┘         └──────────────────────────┘
              │ anon key (read, RLS)            │ subscribe (receive-only)
              ▼                                  ▼
   ┌─────────────────────────────────────────────────┐
   │  Vercel  (Next.js 프론트, 기존 WEC-dash)           │
   │   • useTiming71 → Supabase Realtime 구독 (얇아짐)  │
   │   • /api/races/* → raceStore(Supabase) 로 교체     │
   │   • Griiip 직접 연결 / CORS 프록시 / 클라 write 제거 │
   └─────────────────────────────────────────────────┘
              ▲
              │ 브라우저는 Griiip 에 직접 붙지 않음 (구독·렌더만)
            뷰어 다수
```

**역할 분담 원칙**
- **Render** = 항상 살아있어야 하는 SignalR 연결 + 무거운 정규화 컴퓨팅.
- **Supabase** = 영속 저장(스냅샷/다시보기) + Realtime fan-out(WS 서버를 직접 만들 필요 없음).
- **Vercel** = 프론트엔드 호스팅 그대로.

> **결정 완료 — 라이브 전송 = Supabase Realtime (Broadcast).** Firebase 대비: 이미 DB가 Supabase이므로 Firebase를 추가하면 라이브(Firebase)·영속 스냅샷(Supabase)이 갈리는 split-brain이 되고 벤더·SDK·보안모델이 2벌이 된다. 또 Firestore 1Hz write는 무료 일일 20K write를 초과한다. Supabase Broadcast는 **DB write 없는 ephemeral pub/sub**이라 라이브를 무료로 처리하고, 영속 스냅샷은 30~120s insert로 분리한다. Firebase가 유리한 경우(오프라인-퍼스트 모바일/구글 생태계/Supabase 미사용)는 본 프로젝트에 해당 없음.
>
> ⚠️ **이 선택의 귀결:** 클라가 Render에 붙지 않으므로 **Render 워커는 순수 백그라운드**다 → 깨울 HTTP 트래픽이 없어 **cron `/healthz` ping이 sleep을 막는 유일한 수단(필수)**. (§2 참조)
>
> *대안(자체 SSE, 미채택):* Render가 SSE/WS를 직접 제공하고 클라가 Render에 붙는 방식. 뷰어 접속이 free 티어를 깨워 유지에 유리하지만 fan-out·재연결을 직접 구현해야 함.

---

## 2. 호스팅 & 비용 (현실 제약 — 먼저 결정할 것)

| 서비스 | 티어 | 제약 | 권장 |
|---|---|---|---|
| **Vercel** | Free | 프론트만. 영향 없음 | 그대로 |
| **Render Web Service** | Free | **15분 무트래픽 시 sleep, 콜드스타트 ~50s.** 순수 백그라운드(클라가 안 붙는 구조)면 깨울 주체가 없음 | 레이스 주말에 keep-alive ping 또는 Starter |
| Render Web Service | Starter ~$7/mo | 상시 실행, sleep 없음 | **레이스 기간 권장** |
| Render Background Worker | ~$7/mo~ | free 없음. HTTP 불필요한 순수 ingest에 개념상 적합 | 예산 허용 시 |
| **Supabase** | Free | DB 500MB, **7일 무활동 시 프로젝트 일시정지** | 주1회 keep-alive 쿼리 / 또는 Pro |
| Supabase | Pro $25/mo | 일시정지 없음, 8GB | 운영 안정성 필요 시 |

**✅ 결정 완료 — Render = Free + cron keep-alive ($0).**

**Keep-alive 전략 (필수 — 이 토폴로지에선 선택 아님)**
- Supabase Realtime 채택 ⇒ 클라가 Render에 안 붙음 ⇒ Render 워커는 **순수 백그라운드**. 깨워줄 HTTP 트래픽이 없으므로 **cron의 `/healthz` ping이 sleep을 막는 유일한 수단**.
- **외부 cron**(cron-job.org / GitHub Actions / UptimeRobot)이 **레이스 윈도우 동안 5~10분마다** `/healthz` ping.
- **콜드스타트(~50s) 유실 방지:** cron을 **세션 시작 ~30분 전부터** 돌려 그린플래그 때 워커가 warm 상태가 되게 한다. (WEC 캘린더 `app/data/calendar.ts` 기반으로 cron 스케줄 구성)
- Supabase free 7일 일시정지 방지: 같은 cron에서 주1회 가벼운 `select`.
- ⚠️ **잔여 리스크:** free + cold start는 예기치 못한 재시작 시 그 사이 라이브 틱이 유실될 수 있음(Griiip은 과거 백필 불가). 녹화 신뢰성이 더 중요해지면 §8 표대로 레이스 기간만 Starter로 승격하는 옵션은 열어둔다.

> **✅ 결정 ①:** Render = **Free + cron keep-alive**.
> **✅ 결정 ②:** 라이브 전송 = **Supabase Realtime (Broadcast)** (Firebase 미채택 — §1 참조).

---

## 3. 데이터 모델 (Supabase Postgres)

기존 타입(`app/types/replay.ts`)을 그대로 매핑한다.

```sql
-- 레이스 메타 (RaceMeta)
create table races (
  id            text primary key,         -- "2026-r2"
  year          int  not null,
  round         int  not null,
  name          text not null,
  circuit       text not null,
  country_flag  text,
  duration      text,
  date          date,
  status        text not null default 'live',  -- 'live' | 'finished'
  snapshot_count int  not null default 0,
  updated_at    timestamptz not null default now()
);

-- 영속 스냅샷 (RaceSnapshot) — 다시보기 소스
create table snapshots (
  race_id  text not null references races(id) on delete cascade,
  idx      int  not null,                 -- 서버가 발급 (충돌 없음)
  ts       bigint not null,               -- Unix ms
  payload  jsonb  not null,               -- { cars, raceInfo, stats, messages }
  primary key (race_id, idx)
);
create index on snapshots (race_id, ts);

-- 라이브 현재 상태 (late-join 용 단일 행 스냅샷)
create table live_state (
  race_id    text primary key references races(id) on delete cascade,
  payload    jsonb not null,              -- 최신 RaceState 전체
  updated_at timestamptz not null default now()
);

-- RLS: 클라(anon)는 읽기만, 쓰기는 service_role(Render/Next API)만
alter table races      enable row level security;
alter table snapshots  enable row level security;
alter table live_state enable row level security;
create policy "public read races"      on races      for select using (true);
create policy "public read snapshots"  on snapshots  for select using (true);
create policy "public read live_state" on live_state for select using (true);
-- write 정책 없음 → anon write 차단. service_role 은 RLS 우회.
```

**라이브 전송 모델**
- ingest가 1Hz로 `live_state` upsert + Realtime Broadcast(`channel race:{id}`, event `state`, payload=RaceState).
- 신규 뷰어: `live_state` 1회 read(즉시 화면) → 채널 subscribe(이후 1Hz 갱신).
- 영속 스냅샷은 30~120s마다 `snapshots` insert (충돌 없는 단일 writer).

---

## 4. 리포지토리 구조 (모노레포 전환)

**✅ 채택 — npm workspaces** (pnpm 미설치 + npm 11이 워크스페이스 기본 지원 → 새 도구 도입 마찰 회피). 루트 `package.json`에 `"workspaces": ["packages/*"]`.

**현재(Phase 0 적용 완료) 레이아웃** — 위험을 줄이려 웹 앱은 `WEC-dash/` 루트에 그대로 두고 `packages/core`만 추가:

```
WEC-dash/                    ← git 루트 = 워크스페이스 루트 = 웹 앱(Next.js, Vercel)
├─ package.json              workspaces:["packages/*"], deps:{ "@wec/core":"*" }
├─ next.config.js            transpilePackages:['@wec/core']
├─ tsconfig.json             paths:{"@wec/core":...}, exclude:["packages"]
├─ app/ …                    (웹 앱 — 미변경)
└─ packages/
   └─ core/                  ★ 프레임워크 비종속 (@wec/core)
      ├─ src/types.ts        공유 UI 타입 + Griiip 입력 타입
      ├─ src/format.ts       formatMs/formatGap/mapFlag/mapClass …
      ├─ src/RaceEngine.ts   정규화 상태머신 (build* 로직 이전)
      ├─ src/index.ts        배럴
      └─ src/*.test.ts       Vitest 골든 테스트 (20개 통과)
```

**다음 목표 레이아웃 (Phase 2, ingest 추가 시):** `WEC-dash/app` → `apps/web/`로 이동하고 `apps/ingest/`(Render 워커)를 추가해 `apps/* + packages/*` 대칭 구조로 전환. 이때 Vercel Root Directory를 `apps/web`로 변경해야 함(대시보드 설정).

> 웹 앱 대규모 이동을 Phase 0에서 미룬 이유: 50+ 파일 이동 + Vercel 설정 변경은 빌드 검증 없이 위험. 코어 공유라는 핵심 가치는 현재 레이아웃으로 이미 달성됨(웹·워커 모두 `@wec/core` import 가능).

---

## 5. 단계별 마이그레이션

각 단계는 **독립 배포 가능**하고 **롤백 가능**하도록 설계한다.

### Phase 0 — `RaceEngine` 추출 (백엔드 없이, 동작 변화 0)
**목표:** 정규화 로직을 React에서 분리. 이것만 해도 테스트·재사용성 확보.

**Part 1 — `packages/core` 추출 + 검증 ✅ 완료**
- npm workspace 골격 + `@wec/core` 패키지 생성(§4).
- `RaceEngine` 추출 — `useTiming71.ts`의 `buildCars`/`buildStats`/`buildRaceInfo`/`buildCarStints`/`buildDriverStats`/`buildLapHistory` + ref 누적 로직(`applyRanks`/`applyGaps`/`applyLap`/`applyClock`/`applyFlag`/`applyRaceLog`/`applyPitIn`/`applyPitOut`)을 React/calendar 비종속으로 이전. 라운드·세션명·날씨는 config 주입, `now()` 주입으로 결정적 테스트 가능.
  ```ts
  class RaceEngine {
    applyParticipants/applyRanks/applyGaps/applyLap/applyClock/applyFlag/applyRaceLog/applyPitIn/applyPitOut/applySchedule
    setSessionName/setRound/setRestoredCars/reset
    snapshot(): RaceState  // { cars, raceInfo, stats, carStints, driverStats, messages, lapHistory }
  }
  ```
- **품질 개선 반영:** 🟠 `buildStats`가 `buildCars`를 다시 호출하던 이중 계산 제거(snapshot이 cars 1회 계산 후 재사용). 🔴 메시지 단조 id는 이미 적용돼 있어 그대로 이식.
- **테스트:** Vitest 20개(포맷터 13 + RaceEngine 7) 통과. `npm run test:core`.
- **검증:** core 타입체크 통과 · 루트 `npm install`(워크스페이스) 정상 · 웹 `next build` `✓ Compiled successfully`(배선이 기존 빌드를 깨지 않음 확인).

**Part 2 — `useTiming71` 통합 (다음 단계, 빌드 검증 가능)**
- `useTiming71.ts`가 GriiipClient 콜백 → `engine.apply*` → `engine.snapshot()`을 사용하도록 교체. 로컬 build* 함수와 중복 포맷터 제거.
- 🟠 `flush`를 매 이벤트 → **1Hz 배치**(rAF 또는 고정 tick)로 변경.
- `app/types/race.ts`를 `@wec/core` 재export로 전환(기존 `@/app/types/race` import 호환).
- **완료 기준:** 기존 UI 동일 동작 + `next build` 통과. 배포는 Vercel 그대로.
- **롤백:** 코어 import만 되돌리면 됨.

> 참고: 원격 코드에는 REST 정규화(`griiipResults.ts`)도 존재 → Part 2 또는 별도 단계에서 동일 엔진/포맷터로 수렴시킬 것.

### Phase 1 — Supabase 셋업 + `raceStore` 교체 (다시보기 경로부터)
**목표:** 저장 계층을 Blob/로컬파일 → Supabase로. 프론트 API 표면(`/api/races/*`)은 유지.

- Supabase 프로젝트 생성, §3 DDL 실행.
- `app/lib/raceStore.ts` 를 Supabase 구현으로 교체 (`getIndex`/`getRace`/`upsert*` 시그니처 유지 → `useReplay`/`page.tsx` 무변경).
- 기존 `app/data/races/*.json` 샘플을 Supabase로 1회 임포트하는 스크립트(`scripts/seed-supabase.ts`).
- 환경변수: Next API 라우트에서 `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`(서버 전용).
- **완료 기준:** 다시보기 탭이 Supabase 데이터로 정상 동작.
- **롤백:** `raceStore`를 Blob 버전으로 되돌림(인터페이스 동일).

### Phase 2 — Render ingest 워커 (라이브 단일 소스)
**목표:** 서버가 Griiip에 단일 연결, 정규화, Supabase에 기록·broadcast.

- `apps/ingest` 작성:
  - `findWECSession`(현 `griiipClient.ts:151`) + `GriiipClient`를 Node에서 실행(`@microsoft/signalr`는 Node 네이티브 동작, 동적 import 불필요).
  - 콜백 → `RaceEngine.apply*` → 1Hz로 `live_state` upsert + Realtime broadcast → 주기적 `snapshots` insert(서버가 `idx` 발급 ⇒ **문제 A/B 해소**).
  - 레이스 종료 감지 시 `races.status='finished'`.
  - `GET /healthz` (keep-alive — 이 토폴로지에선 sleep 방지의 유일 수단, §2).
- Render Web Service 생성: Root Directory=`apps/ingest`, build/start 명령, env(`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) 설정.
- keep-alive cron(§2) 구성: 레이스 윈도우 5~10분 간격 + **세션 시작 ~30분 전부터** 시작(콜드스타트 warm-up), 주1회 Supabase ping.
- **품질 개선:**
  - 🟡 재연결 로직 일원화: SignalR `withAutomaticReconnect` 를 정본으로, 현 `useTiming71.ts:607`의 30초 수동 재연결은 서버로 흡수.
  - 🟡 세션 오인식 방지: `findWECSession`에 세션 상태(FP/예선/결승) 검증 추가.
- **완료 기준:** 워커가 라이브 중 `live_state`/`snapshots`를 채움. 클라는 아직 기존 방식이어도 무방(병행).
- **롤백:** 워커를 끄면 클라는 기존 직접 연결로 계속 동작(아직 안 끊었으므로).

### Phase 3 — 클라 전환: Supabase 구독 (feature flag)
**목표:** `useTiming71`을 얇은 구독자로 교체. Griiip 직접 연결 제거.

- `useTiming71.ts` 재작성:
  ```ts
  // 현재 라이브 레이스 조회 → 없으면 직전 finished → 없으면 dummy
  const supabase = createClient(URL, ANON_KEY)
  // 1) 현재 상태 즉시 표시
  const { data } = await supabase.from('live_state').select('payload').eq('race_id', id).single()
  if (data) setState(data.payload)
  // 2) 라이브 구독
  supabase.channel(`race:${id}`)
    .on('broadcast', { event: 'state' }, ({ payload }) => setState(payload))
    .subscribe()
  ```
  - `no_service`/`showing_previous`/dummy fallback 로직은 "Supabase에 live 레이스가 있나?" 쿼리 기반으로 재구현(기존 `onNoService` 분기 대체).
  - GriiipClient import·`saveSnapshot` interval·snapshot POST 전부 제거.
- **`NEXT_PUBLIC_USE_BACKEND` 플래그**로 신/구 경로 토글 → 라이브 레이스에서 비교 검증 후 전환.
- 클라는 **anon key**만 사용(read-only, RLS). service_role은 절대 클라 노출 금지.
- **완료 기준:** 플래그 ON 상태에서 라이브가 Supabase 경로로 정상 표시. 뷰어 여러 명이 동일 상태.
- **롤백:** 플래그 OFF.

### Phase 4 — 정리 & 하드닝
- 🟢 `next.config.js`의 `/api/griiip/:path*` rewrite(오픈 프록시, **문제 D**) **제거**.
- 🟢 클라발 `/api/races/snapshot` POST 라우트 제거(또는 service_role 인증 필수화). 더 이상 브라우저가 write 안 함 ⇒ **문제 A 완전 종결**.
- 🟢 Supabase RLS 재점검(write 정책 없음 확인), Realtime 채널 수신전용 확인.
- 🔵 CI: typecheck + ESLint + `pnpm test`(코어) 파이프라인.
- 🔵 에러 바운더리 추가(탭 렌더 에러가 앱 전체를 죽이지 않게).
- 🟠 Leaderboard 행 `React.memo`(carNum 키, 변한 행만 리렌더).
- 데이터 정합성: 기존 Vercel Blob 데이터 → Supabase 마이그레이션 마무리, Blob 의존 제거.

---

## 6. 품질 개선 체크리스트 (어느 Phase에 끼우는지)

| 우선 | 항목 | 위치 | Phase |
|---|---|---|---|
| 🔴 | 멀티 클라이언트 스냅샷 write 경쟁 해소(단일 writer) | ingest | 2→4 |
| 🔴 | 메시지 `id` 충돌 제거 | core | 0 |
| 🔴 | 타이어 하드코딩 `'S'` — 가짜 데이터 명시/제거 | core/UI | 0 |
| 🟠 | flush 1Hz 배치 + 이중 `buildCars` 제거 | core | 0 |
| 🟠 | Leaderboard 행 메모이제이션 | web | 4 |
| 🟡 | 재연결 로직 일원화 | ingest | 2 |
| 🟡 | 세션 오인식 방지 | core/ingest | 2 |
| 🟡 | 에러 바운더리 | web | 4 |
| 🟢 | 오픈 CORS 프록시 제거 | web | 4 |
| 🟢 | snapshot POST 인증/제거 | web | 4 |
| 🔵 | Vitest + CI(typecheck/lint/test) | repo | 0→4 |
| 🔵 | 드라이버 분석 섹터 `s1/s2/s3` placeholder 처리 | core/UI | 0 |

---

## 7. 환경변수 / 시크릿

| 변수 | 위치 | 비고 |
|---|---|---|
| `SUPABASE_URL` | Render, Vercel(서버) | 공통 |
| `SUPABASE_SERVICE_ROLE_KEY` | **Render, Vercel API 라우트만** | 절대 클라 노출 금지 |
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel(클라) | 공개 OK |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel(클라) | RLS 전제 read-only |
| `NEXT_PUBLIC_USE_BACKEND` | Vercel | 신/구 경로 토글 |
| `BLOB_READ_WRITE_TOKEN` | (단계적 제거) | Phase 4에서 폐기 |

---

## 8. 리스크 & 대응

| 리스크 | 대응 |
|---|---|
| Render free sleep로 세션 시작 데이터 유실 | 레이스 기간 Starter 승격 또는 cron keep-alive(§2) |
| Supabase free 7일 일시정지 | 주1회 keep-alive 쿼리 / Pro 승격 |
| Realtime 1Hz 부하 / 메시지 크기 | payload는 delta 또는 필수 필드만; broadcast는 비영속(저장은 별도 30~120s) |
| Griiip 스키마/엔드포인트 변경 | `RaceEngine` 골든 테스트로 회귀 감지; ingest 로그·알림 |
| service_role 키 유출 | 클라 번들에 절대 미포함, Render/Vercel 서버 env만 |
| 마이그레이션 중 다시보기 데이터 단절 | Phase 1에서 Blob→Supabase 1회 임포트 후 검증, 양립 기간 유지 |

---

## 9. 작업 순서 요약 (체크리스트)

- [x] **결정①** Render = Free + cron keep-alive / **결정②** 라이브 = Supabase Realtime Broadcast
- [x] Phase 0 Part 1: npm workspace + `@wec/core`(RaceEngine·포맷터·타입) 추출, Vitest 20개, 이중계산 픽스 — core 테스트 + 웹 빌드 검증 완료
- [ ] Phase 0 Part 2: `useTiming71`을 `@wec/core`로 교체 + flush 1Hz 배치 + `app/types/race.ts` 재export
- [ ] Phase 1: Supabase 생성+DDL, `raceStore` Supabase 교체, 샘플 데이터 seed
- [ ] Phase 2: `apps/ingest` 작성, Render 배포, keep-alive, 단일 writer 기록 시작
- [ ] Phase 3: `useTiming71` Supabase 구독으로 교체(플래그), 라이브 비교 검증
- [ ] Phase 4: 오픈 프록시·클라 write 제거, RLS 점검, CI, 메모이제이션, 에러 바운더리

---

### 부록 — 비용 시나리오
- **최소($0):** Vercel free + Render free(+cron keep-alive) + Supabase free(+주1 ping). 레이스 시작 콜드스타트 리스크 감수.
- **권장(~$7/mo):** 레이스 기간만 Render Starter, 나머지 free. 녹화 신뢰성 확보.
- **운영(~$32/mo):** Render Starter + Supabase Pro. 일시정지/sleep 없음.

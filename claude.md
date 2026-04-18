# WEC 라이브 타이밍 대시보드 — 프로젝트 계획서

> FIA WEC(세계 내구레이스 선수권) 실시간 타이밍 대시보드 웹사이트  
> 참고 레퍼런스: [f1-dash.com](https://f1-dash.com/dashboard)

---

## 목표

- WEC 레이스 세션 중 실시간 타이밍 데이터를 시각화하는 웹 대시보드
- 실제 서비스로 배포 (Vercel 단독 — **완전 무료**)
- 멀티클래스(Hypercar / LMP2 / LMGT3) 내구레이스 특화 UI

---

## 기술 스택

| 영역 | 기술 |
|---|---|
| 프론트엔드 | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| 데이터 연결 | 브라우저 → Timing71 WAMP WebSocket **직접 연결** |
| WAMP 라이브러리 | `autobahn-js` (브라우저용) |
| 배포 | Vercel (무료) |
| ~~백엔드~~ | ~~불필요~~ |

---

## 아키텍처

### 핵심 원칙: 백엔드 서버 없음

Timing71은 인증 없이 누구나 릴레이 서버에 직접 붙을 수 있어요.  
브라우저에서 WAMP WebSocket으로 바로 연결하면 중계 서버가 필요 없습니다.

```
기존 계획 (버림):
브라우저 → Node.js 백엔드 → Timing71
           (Railway $5/월)

현재 구조 (채택):
브라우저 → Timing71 직접 연결
           (비용 0원)
```

### 연결 흐름

```
1. 브라우저 시작
   └─ fetch("https://timing71.org/relays")
      → 릴레이 서버 URL 목록 취득 (연결 수 가장 적은 서버 선택)

2. WAMP WebSocket 연결 (autobahn-js)
   └─ wss://relay.timing71.org/ws
      → realm: "timing" 으로 접속

3. DIRECTORY 토픽 구독
   └─ WEC 서비스 UUID 획득

4. 서비스 토픽 구독
   └─ "livetiming.service.<UUID>"
      → 1초마다 state 메시지 수신

5. 분석 토픽 구독 (선택)
   └─ "livetiming.analysis/<UUID>/driver"
   └─ "livetiming.analysis/<UUID>/stint"
   └─ "livetiming.analysis/<UUID>/session"
```

### 트레이드오프

| 항목 | 브라우저 직접 연결 |
|---|---|
| 비용 | 완전 무료 |
| 구현 난이도 | 낮음 (서버 코드 불필요) |
| 사용자 10명 | 각자 독립 연결 — 문제 없음 |
| 사용자 1000명+ | Timing71 서버에 부담 → 추후 중계 서버 고려 |

> 개인 프로젝트 수준의 트래픽에서는 직접 연결로 충분합니다.  
> 나중에 트래픽이 크게 늘면 Node.js 중계 서버를 추가하는 방향으로 확장 가능.

---

## 데이터 소스: Timing71

### 가져올 수 있는 데이터

#### 실시간 상태 (state — 1초마다)
| 필드 | 설명 |
|---|---|
| `session.timeElapsed` | 경과 시간 (초) |
| `session.timeRemain` | 잔여 시간 (초) |
| `session.flagState` | GREEN / SC / YELLOW / RED / CHEQUERED |
| `session.trackData` | 기온, 트랙 온도 |
| `cars[].Num` | 차량 번호 |
| `cars[].State` | RUN / PIT / OUT / STOP / FIN |
| `cars[].Class` | HYPERCAR / LMP2 / LMGT3 |
| `cars[].PIC` | 클래스 내 순위 |
| `cars[].Driver` | 현재 드라이버명 |
| `cars[].Gap` | 전체 선두와의 차이 |
| `cars[].Int` | 직전 차와의 간격 |
| `cars[].S1 / S2 / S3` | 섹터 타임 |
| `cars[].Last` | 마지막 랩타임 |
| `cars[].Best` | 베스트 랩타임 |
| `cars[].Laps` | 완료 랩수 |
| `cars[].Pits` | 피트스톱 횟수 |
| `cars[].Tyre / TA / TS` | 타이어 화합물 / 누적랩 / 스틴트랩 |
| `cars[].C.Gap / C.Int` | 클래스 기준 갭/인터벌 |
| 메타 플래그 `"pb"` | 개인 베스트 타임 |
| 메타 플래그 `"sb"` | 세션 베스트 (퍼플 타임) |

#### 분석 데이터 (analysis — 별도 구독)
| 채널 | 내용 |
|---|---|
| `analysis/driver` | 드라이버별 베스트 랩, 누적 주행시간, 랩 히스토리 |
| `analysis/stint` | 피트스톱 히스토리, 스틴트 랩수, 평균 랩타임 |
| `analysis/session` | 패스티스트 랩 히스토리, SC 이력, 리더 변화 |
| `messages` | 피트인/아웃, 드라이버 교체, 페널티 등 이벤트 |

#### 제공되지 않는 데이터
- GPS 위치 좌표 → 트랙맵 차량 위치는 섹터 통과 시각으로 보간
- 속도 / RPM 텔레메트리
- 타이어 온도 / 압력
- 연료 잔량

> ⚠️ **주의**: `colSpec`(컬럼 구조)이 레이스마다 다름.  
> 연결 직후 manifest를 먼저 받아 컬럼 순서를 동적으로 파싱하는 구조 필수.

> ⚠️ **Timing71 커버리지**: WEC를 항상 커버하지 않을 수 있음.  
> 레이스 주말마다 `timing71.org/relays` 직접 확인 필요.  
> 플랜 B: Al Kamel Systems(`fiawec.alkamelsystems.com`) XHR 직접 인터셉트 (법적 회색지대).

---

## 화면 구성 (5개 탭)

### 공통 헤더 (모든 탭 고정)
- 레이스명 / 라운드
- 플래그 상태 배지 (GREEN 깜빡임 애니메이션)
- 경과 시간 / 잔여 시간
- 기온 / 트랙 온도

### 탭 1 — 대시보드 (메인)

**상단 통계 카드 5개**
- 선두 랩수
- 패스티스트 랩 (퍼플 강조)
- 총 피트스톱 횟수
- 현재 플래그 상태 + SC 이력
- 잔여 시간

**좌측: 멀티클래스 리더보드**

| 컬럼 | 데이터 |
|---|---|
| POS | 전체 순위 |
| CLS | 클래스 내 순위 (클래스별 색상) |
| CLASS 배지 | HYPERCAR(빨강) / LMP2(파랑) / LMGT3(초록) |
| # | 차량 번호 |
| DRIVER / TEAM | 드라이버명 + 팀명 |
| T | 타이어 화합물 원형 아이콘 (S/M/H/W/I) |
| LAPS | 완료 랩수 (랩드 차량은 "+1 Lap") |
| LAST | 마지막 랩타임 (패스티스트=퍼플) |
| BEST | 베스트 랩타임 |
| GAP | 클래스 선두 기준 차이 ("LEAD" 또는 "+00:12.4") |
| PITS | 피트스톱 횟수 |
| STATE | RUN / PIT / OUT / OFF 배지 |

- 클래스 경계마다 구분선
- 피트인 중 행 전체 배경 어두운 주황
- 클래스 필터 버튼 (전체 / HYP / LMP2 / LMGT3)

**우측 사이드 (3개 패널 세로 배치)**
1. 트랙맵 (소형) — 차량 위치 도트
2. 스틴트 현황 — 각 차량 현재 스틴트 랩수 + 피트 횟수
3. 이벤트 로그 — 실시간 메시지 피드

---

### 탭 2 — 트랙맵

- 전체 화면 SVG 트랙맵
- 차량 위치: 섹터 통과 시각 기반 보간 (GPS 없음)
- 클래스별 색상 도트 + 차량 번호 레이블
- 피트인 중 차량 주황색 + PIT 표시
- 필터: 전체 / 클래스별 / 차량번호 선택
- 옵션 토글: 차량 번호 표시 / 섹터 구간 표시 / 갭 표시
- 하단: 차량별 현재 구간 + 랩 진행률 목록

---

### 탭 3 — 드라이버 분석

**좌측**
- 드라이버별 베스트 랩 비교 테이블
  - 차량번호 / 드라이버명 / 베스트 랩 / S1 / S2 / S3 / 누적 주행시간
  - pb(개인베스트) = 보라색, sb(세션베스트) = 밝은 보라색
- 섹터별 세션 베스트 (퍼플 타임) 카드 3개

**우측**
- 드라이버 누적 주행시간 막대 그래프
  - WEC 규정 시각화: 최소 1시간 / 최대 단독 4시간 기준선
- 현재 온트랙 드라이버 목록 (상태: RUN / PIT / OUT)

---

### 탭 4 — 스틴트 분석

**상단: 스틴트 타임라인 (핵심)**
- 전체 레이스를 가로 타임라인으로 표시
- 각 차량마다 한 행, 스틴트 구간을 색상 블록으로 표시
  - 블록 색상: 타이어 화합물(S/M/H) 구분
  - 주황 세로선: 피트스톱 지점
  - 점선: 잔여 레이스 (미래 구간)

**하단 2개 패널**
- 스틴트별 평균 랩타임 추이 꺾은선 그래프
- 피트스톱 소요시간 테이블
  - 정상(~22초) / 드라이버교체(~25초) / 이상(30초+) 색상 구분

---

### 탭 5 — 메시지

- 필터 버튼: 전체 / 피트인·아웃 / 드라이버교체 / 세이프티카 / 사고·페널티 / 패스티스트
- 차량 번호 검색
- 메시지 목록:
  - 타임스탬프 / 클래스 배지 / 메시지 텍스트
  - 차량 번호 하이라이트
  - 피트 메시지 = 주황, 이벤트 = 연보라, 패스티스트 = 보라

---

## 디자인 시스템

### 색상
| 요소 | 색상 |
|---|---|
| 배경 | `#0a0a0a` |
| 카드 배경 | `#0f0f0f` ~ `#141414` |
| 테두리 | `#1e1e1e` ~ `#2a2a2a` |
| Hypercar | `#ff4040` (빨강) |
| LMP2 | `#3399ff` (파랑) |
| LMGT3 | `#33cc44` (초록) |
| 패스티스트 랩 | `#bb55ff` (보라) |
| 피트인 배경 | `#160f00` (어두운 주황) |
| 피트 배지 | `#ff9900` |
| GREEN 플래그 | `#00ee55` |
| 폰트 | monospace 계열 (숫자 가독성) |

### 타이어 아이콘 (원형)
| 화합물 | 색상 |
|---|---|
| 슬릭 S | 노랑 배경, 검정 텍스트 |
| 미디엄 M | 흰색 배경, 검정 텍스트 |
| 하드 H | 빨강 배경, 흰색 텍스트 |
| 웻 W | 파랑 배경, 흰색 텍스트 |
| 인터 I | 초록 배경, 흰색 텍스트 |

---

## 개발 로드맵

### Phase 1 — UI 프로토타입 (1~2주)
**목표: 더미 데이터로 전체 UI 완성**

```
Next.js 14 프로젝트 생성
→ TypeScript + Tailwind 설정
→ 더미 데이터 타입 정의 (types/race.ts)
→ 더미 데이터 작성 (data/dummyData.ts)
→ 공통 헤더 컴포넌트
→ 플래그 배너 컴포넌트
→ 통계 카드 컴포넌트
→ 리더보드 컴포넌트 (멀티클래스)
→ 트랙맵 SVG (스파 프랑코샹)
→ 스틴트 타임라인 컴포넌트
→ 메시지 피드 컴포넌트
→ 5탭 네비게이션
```

**파일 구조**
```
app/
  page.tsx
  layout.tsx
  components/
    Header.tsx
    FlagBanner.tsx
    StatsBar.tsx
    Leaderboard.tsx
    LeaderboardRow.tsx
    ClassBadge.tsx
    TireBadge.tsx
    StatusBadge.tsx
    TrackMap.tsx
    StintTimeline.tsx
    MessageFeed.tsx
  hooks/
    useTiming71.ts      ← Phase 2에서 채울 핵심 훅
  lib/
    timing71.ts         ← WAMP 연결 로직
    parseManifest.ts    ← colSpec 동적 파싱
    normalizeState.ts   ← state → UI 데이터 변환
  data/
    dummyData.ts
  types/
    race.ts
```

**더미 데이터 차량 목록 (10대)**
- #2 Cadillac Racing — Hypercar — Bamber/Lynn
- #7 Toyota GR010 — Hypercar — Conway/Kobayashi
- #6 Porsche 963 — Hypercar — Estre/Lotterer
- #8 Toyota GR010 — Hypercar — Buemi/Hartley
- #10 United Autosports — LMP2 — Owen/Hanson
- #22 United Autosports — LMP2 — Albuquerque/Filipe
- #37 Cool Racing — LMP2 — Doquin/Laurent
- #77 Proton Competition — LMGT3 — Cairoli/Lietz
- #91 Porsche GT Team — LMGT3 — Pilet/Christensen
- #55 AF Corse — LMGT3 — Fuoco/Molina

---

### Phase 2 — 데이터 연결 (2~3주)
**목표: 브라우저에서 Timing71 직접 연결**

```
autobahn-js 설치 (브라우저용 WAMP 라이브러리)
→ lib/timing71.ts 작성
   - timing71.org/relays fetch
   - WAMP 연결 (연결수 최소 릴레이 선택)
   - DIRECTORY 구독 → WEC UUID 찾기
   - state 토픽 구독
   - analysis 토픽 구독
→ lib/parseManifest.ts 작성
   - colSpec 파싱 → 컬럼 이름→인덱스 매핑
→ lib/normalizeState.ts 작성
   - cars 배열 → Car[] 타입으로 변환
   - 메타 플래그("pb","sb") 처리
→ hooks/useTiming71.ts 작성
   - React 상태로 연결 상태 + 데이터 관리
   - 연결 끊김 시 자동 재연결
→ 더미 데이터 → 실제 데이터 교체
→ 트랙맵 섹터 기반 차량 위치 보간 구현
```

**핵심 코드 구조 (useTiming71.ts)**
```typescript
export function useTiming71() {
  const [state, setState] = useState<RaceState | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    // 1. 릴레이 서버 목록 fetch
    // 2. autobahn으로 WAMP 연결
    // 3. DIRECTORY 구독 → WEC UUID 찾기
    // 4. state 토픽 구독 → setState 호출
    // 5. cleanup: 연결 해제
  }, [])

  return { state, connected }
}
```

**플랜 B (Timing71 미커버 시)**
- `fiawec.alkamelsystems.com` 네트워크 요청 분석
- 폴링 방식으로 Al Kamel JSON 직접 수신

---

### Phase 3 — 배포 (1주)
**목표: Vercel 단독으로 완전 무료 배포**

```
Vercel 연결 (GitHub 저장소 연동)
→ 자동 빌드 + 배포
→ 커스텀 도메인 연결 (선택)
→ 완료
```

| 서비스 | 용도 | 비용 |
|---|---|---|
| Vercel | 프론트엔드 + 데이터 연결 전부 | **무료** |

> 나중에 동시 접속자가 많아지면 Node.js 중계 서버 추가 고려  
> (Northflank 무료 2서비스 or Railway ~$5/월)

---

## WEC 특화 구현 사항

1. **갭은 클래스 선두 기준** — 전체 선두 기준 아님 (`C.Gap` 사용)
2. **랩드 차량 표시** — "+1 Lap", "+2 Laps" 형식
3. **드라이버 시간 규정 시각화** — 최소 1시간 / 최대 단독 4시간 기준선
4. **24시간 레이스 대응** — 경과시간 UI가 6시간 이상도 대응
5. **트랙맵 차량 위치** — GPS 없음, 섹터 통과 시각으로 보간
6. **스틴트 전략** — 내구레이스 핵심 지표, 타임라인으로 시각화
7. **colSpec 동적 파싱** — 레이스마다 컬럼 구조가 다름
8. **자동 재연결** — 레이스 중 연결 끊김 대비 필수

---

## 참고 자료

| 자료 | URL |
|---|---|
| 레퍼런스 사이트 | https://f1-dash.com/dashboard |
| f1-dash 소스코드 | https://github.com/slowlydev/f1-dash |
| Timing71 공식 | https://www.timing71.org |
| Timing71 문서 | https://info.timing71.org |
| Timing71 릴레이 목록 | https://www.timing71.org/relays |
| Timing71 state 포맷 | https://info.timing71.org/reference/state.html |
| Timing71 manifest 포맷 | https://info.timing71.org/reference/manifest.html |
| autobahn-js (WAMP) | https://github.com/crossbario/autobahn-js |
| WEC 공식 타이밍 | https://fiawec.alkamelsystems.com |

---

*작성일: 2026-04-18*  
*상태: Phase 1 준비 중*  
*변경: 백엔드 서버 제거 → 브라우저 직접 연결 구조로 전환 (비용 $0)*
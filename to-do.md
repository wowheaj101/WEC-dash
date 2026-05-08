# TO-DO

## #1 배너에 다음 라운드까지 카운트다운

**현재 상태**
- `RoundBanner.tsx`는 `formatDaysUntil(daysUntilNext)` 로 "D-3" 같은 일 단위 표시만 노출.
- `race_week`/기본 `NEXT ROUND` 배너 모두 "월/일 시:분 UTC" 까지만 출력.

**개선 목표**
- 다음 라운드 `raceStart` 까지 **일/시/분/초 실시간 카운트다운** 을 배너 우측에 고정 표시.
- Race Week(D-7 이내) 진입 시에는 강조 컬러(`--live`) + pulsing dot 로 전환.
- Race Start 1시간 이내면 "STARTS IN 00:34:12" 형식으로 분·초만 노출.

**구현 포인트**
- `app/lib/getRoundStatus.ts` 에 `getCountdown(raceStart: string): { d, h, m, s, totalMs }` 추가.
- `RoundBanner.tsx` 안에서 `useEffect` + `setInterval(1000)` 로 1초 단위 tick state 갱신 (SSR 안전하게 `useState` 초기값은 `null`).
- 포맷 유틸 분리: `formatCountdown({ d, h, m, s }, mode: 'days'|'hms'|'auto')`.
- 모바일에서 줄바꿈되지 않도록 `whitespace-nowrap` + `mono` 적용.

**검증**
- 현재 날짜(2026-04-25) 기준 다음 라운드까지 D-xx 표시가 일 단위로 매일 감소하는지.
- 라운드 시작 1분 전 → 59초 카운트다운 → 라운드 시작 시 `phase === 'active'` 로 전환되며 배너가 `RECONNECTING` 으로 바뀌는지.

---

## #2 스틴트 탭 필터 (클래스 / 차량 / 팀)

**현재 상태**
- `StintAnalysis` 는 전체 차량 스틴트를 한 번에 나열. 필터 UI 없음.
- `Car` 에는 `classId`, `carNumber`, `team` 필드가 이미 존재.

**개선 목표**
- 상단에 세 개의 필터 그룹 제공:
  1. **클래스**: `All / HYPERCAR / LMP2 / LMGT3` (segmented control)
  2. **차량**: 현재 선택된 클래스 내 차량 번호 멀티 셀렉트
  3. **팀**: 같은 클래스 내 팀 이름 셀렉트
- 필터는 URL 쿼리(`?class=HYPERCAR&car=7,8`)로 동기화해 공유 가능하게.
- 선택된 차량만 `StintOverview` 스타일의 타임라인에 나열, 비교 시 Y축 정렬.

**구현 포인트**
- `app/components/StintAnalysis.tsx` 에 `useStintFilter()` 훅 신설 (`useSearchParams` + `useRouter`).
- 필터 UI 는 `app/components/ui/` 의 `Badge` + `Button` 조합으로 segmented control 구현, 체크박스는 `Popover` 내부에 리스트.
- 색상은 클래스별 토큰 (`--hypercar`, `--lmp2`, `--lmgt3`) 사용.
- 빈 결과 시 "선택된 조건에 해당하는 차량이 없습니다" 플레이스홀더.

---

## #3 트랙맵 SVG 제작 · 개선

### 1차 ✅ 2026-04-25 (메타데이터 추가)
- `CircuitSVG` 인터페이스에 `corners`, `drs`, `pitIn`, `pitOut` 필드 추가 완료.
- 7개 서킷 전부에 코너 번호/이름, 오버테이크(DRS) 존, 피트 입/출구 좌표 추가.
- `TrackMap.tsx` 렌더 순서 재정비: sector glow halos → sector dividers → track (glow+surface) → pit lane → DRS → corners → pitIn/Out → cars → S/F.
- 섹터별 glow 컬러 토큰화 (S1 blue / S2 green / S3 red, `/ 0.14`).
- 색상 전부 Pit Wall v3.0 토큰(HSL)으로 이관.

### 2차 진단 (2026-05-08)

**버그 3종이 동시에 존재 — `?? SPA` fallback 이 다른 두 버그를 가리고 있었음:**

1. **키 불일치** (`trackPaths.ts` ↔ `calendar.ts`)
   | Calendar `circuit` | trackPaths 키 | 결과 |
   |---|---|---|
   | `Interlagos Circuit` | `Autodromo José Carlos Pace` | ❌ 매치 실패 → Spa 표시 |
   | `Circuit of the Americas` | (엔트리 없음) | ❌ 매치 실패 → Spa 표시 |

2. **SVG path 가 실제 트랙과 다름** — 7개 모두 손으로 그린 근사. `circuitPDF/` 폴더에 공식 PDF 7개 보유 (Imola, Spa, LeMans, 상파울루, COTA, 후지, 바레인). **Qatar/Lusail PDF 없음**.

3. **silent fallback** — `TrackMap.tsx:38` 의 `?? SPA` 가 매핑 누락을 조용히 Spa로 대체. 현재 라운드가 Spa인 동안에는 우연히 정상으로 보임.

### Phase 1 — 매핑/fallback 버그 (PDF 작업 X) ✅ 2026-05-08
- `trackPaths.ts` 의 Interlagos 키를 `Interlagos Circuit` 로 정정 (calendar 와 일치).
- COTA placeholder 엔트리 추가 (정식 PDF 추출 전 임시).
- `TrackMap.tsx:38` 의 `?? SPA` fallback 제거 → 매핑 실패 시 "트랙 미등록" 메시지로 노출.

### Phase 2 — PDF → SVG 추출 (라운드별)

**변환 방식 비교**
| 방식 | 장점 | 단점 |
|---|---|---|
| **A. pdf2svg / Inkscape 추출 → 수동 cleanup** ← 추천 | 결과 깔끔, payload 작음, 다크 테마 색 자유 | PDF 1개당 5–10분 수작업 |
| B. PDF → PNG 배경 깔기 | 즉시 적용 | 7×2MB ≈ 14MB, 흐릿함, 다크 테마 안 맞음 |
| C. PDF.js 런타임 렌더 | 자동 | 라이브러리 추가, 색·스타일 못 바꿈 |

**워크플로 (방식 A)**
1. PDF 한 개씩 SVG 변환 (Inkscape Open → Save as SVG, 또는 `pdf2svg` CLI).
2. 트랙 윤곽 path 노드 식별 (보통 가장 긴 stroked path 1개).
3. SVGO 로 path 단순화 (좌표 자릿수 줄이기).
4. viewBox 를 `0 0 480 380` 으로 변환 (스케일 + 오프셋).
5. `trackPaths.ts` 의 해당 항목 path 교체.
6. PDF 위 표시된 S/F·pit·sector 마커 보고 좌표 다시 입력.
7. 코너 좌표/DRS/pitIn-pitOut 도 재배치.

**우선순위 후보**
- 다음 라운드(Spa) 부터 — 시즌 진행 중인 트랙
- 임팩트 큰 트랙(Le Mans, Spa, Imola) 부터
- 사용자 자주 보는 트랙 위주

### Phase 3 — Qatar/Lusail
PDF 없음. 옵션:
- 공식 FIA/Lusail 사이트에서 PDF 입수
- 위키미디어 SVG 트랙맵 사용 (CC-BY 라이센스 대부분)
- placeholder 유지

---

## #4 섹터 위치 기반 차량 위치 표시 ✅ 2026-04-25 (중간 단계 완료)

**진행 상태 — 중간 단계**
- `app/lib/trackGeometry.ts` 신설: `sampleSectorPath`, `spreadAroundPoint`, `parsePitLaneStart`, `layoutCars` 구현.
- `layoutCars` 가 섹터 내 **클래스 포지션 순** 정렬 (선두가 anchor 에 가장 가깝게).
- 피트 차량은 `pitLane` 시작점 주변 4×N 그리드로 클러스터, 투명도 0.55.
- `TrackMap` 에 60ms 주기 `requestAnimationFrame` 틱 → 매 프레임 `Date.now() - sectorEnterTs` 로 진행 비율 t 계산.
- `<circle>` `cx`/`cy` 에 200ms CSS transition 적용 → 섹터 경계 통과 시 부드럽게 이동.
- `useTiming71`: `sectorEnterTsRef: Map<pid, {sector, ts}>` + `sectorDurationRef: Map<pid, [s1,s2,s3]>` (EMA 0.7/0.3 smoothing).
- `Car` 에 `sectorEnterTs`, `sectorDurationMs` 필드 추가 → TrackMap 이 매 프레임 직접 elapsed 계산.

**장기 목표 (미착수)**
- Griiip GPS 채널 (`lv-positions` 등) 조사 후 실 좌표 구독.
- 실제 SVG path 를 `getPointAtLength()` 샘플링해 섹터 구간 따라 곡선 보간 (현재는 prev→cur→next 세 anchor 선형 보간).
- #2 필터와 연동해 선택 클래스만 불투명 처리.

---

## #5 차량별 상세 데이터 · 라이브 온보드 캠 연동

**현재 상태**
- Leaderboard 행 클릭 시 드라이버/차량 상세 뷰 없음.
- Griiip 에서 제공하는 lap·sector·pit 데이터는 이미 수신 중.

**개선 목표 — 차량 상세 패널**
- Leaderboard 행 클릭 → 우측 슬라이드 패널(`Sheet`) 또는 하단 모달.
- 패널 구성:
  - **헤더**: `#carNumber` · 팀 로고 · 클래스 배지 · 현재 포지션 (overall / class)
  - **드라이버 스틴트 블록**: 현재 스틴트 시간, 누적 랩, 직전 스틴트 드라이버와의 pace delta
  - **랩 타임 차트**: 최근 30랩 라인 차트 (`recharts` 또는 SVG 직접). SB/PB 점 색상 표시.
  - **섹터 스플릿 테이블**: 최근 5랩 × S1/S2/S3 (색상 규칙 동일)
  - **피트 이력**: `pit-in/pit-out` 이벤트 타임라인
  - **갭**: 앞차·뒤차·리더 대비 gap (실시간)

**개선 목표 — 온보드 캠**
- FIA WEC 공식 온보드 스트림 URL 매핑 테이블 (`app/data/onboardStreams.ts`).
  - 구조: `Record<carNumber, { provider: 'fiawec' | 'youtube', url: string, label: string }>`
  - 값은 레이스 주간에 수동 업데이트 (공식 사이트에서 크롤링 가능 여부 조사).
- 패널 상단 "ONBOARD" 탭 → `<video>` 또는 `<iframe>` 임베드.
- 온보드 소스가 없는 차량은 탭 비활성화 + "No onboard feed available" 메시지.
- CORS/Referrer 정책 때문에 직접 임베드 불가 시 "새 탭에서 열기" 버튼으로 폴백.

**구현 포인트**
- 상태 관리: `page.tsx` 에 `selectedPid: number | null` lift, `Leaderboard` onClick 으로 set.
- 신규 컴포넌트: `app/components/CarDetailSheet.tsx` + 서브 `LapChart.tsx`, `SectorSplits.tsx`, `PitHistory.tsx`, `OnboardPlayer.tsx`.
- `useTiming71` 에서 pid 별 최근 N랩 링 버퍼를 `lapsHistoryRef: Map<pid, LapEntry[]>` 로 유지 (최대 50랩).
- 온보드 URL 미확보 시에도 패널은 동작해야 하며, 온보드 탭만 숨김.

---

## 작업 순서 제안
1. **#1 카운트다운** — 작고 독립적, 먼저 처리해 감각 익히기.
2. **#3 SVG 개선** → **#4 섹터 보간** — 트랙맵 관련이라 묶어서.
3. **#2 스틴트 필터** — URL 쿼리 패턴을 #5 차량 선택에도 재활용.
4. **#5 차량 상세 + 온보드** — 가장 범위 큼, 랩 히스토리 버퍼 변경이 `useTiming71` 에 영향.

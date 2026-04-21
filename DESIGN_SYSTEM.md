# Pit Wall v3.0 — Broadcast Overlay

WEC Live Timing Dashboard의 디자인 시스템 문서.

---

## 1. 개요

| 항목 | 내용 |
|---|---|
| 프레임워크 | Next.js 14 App Router |
| 스타일 엔진 | Tailwind CSS v3 + CSS Custom Properties |
| 컴포넌트 기반 | shadcn/ui (Radix UI primitives + CVA) |
| 타이포그래피 | **3-font stack**: Bai Jamjuree (display) · Barlow Condensed (cond) · JetBrains Mono (mono) |
| 기본 테마 | Dark-only |
| 디자인 철학 | **Broadcast Overlay** — 모터스포츠 TV 그래픽 미학. 샤프한 에지, chevron clip-path, 하이퍼카 레드 액센트, 깊은 블랙 서피스 |

**v2.0 → v3.0 주요 변경:**
- 폰트가 JetBrains Mono 단일 → 3-스택으로 확장 (`.disp`, `.cond`, `.mono`)
- 토큰 네이밍: `--surface1/2/3` → `--bg-0..4` + `--fg-0..4` + `--line-1..3`
- Hypercar 레드를 primary `accent`로 승격
- Chevron clip-path 유틸리티 추가 (`.clip-chev-r/-l/-both/-sm/-hero`, `.chev-tag`)
- `.panel-header`, `.btn-ghost`, `.ticker-track` 유틸 도입
- 탭 UI가 박스형 → 언더라인 브로드캐스트 스타일

---

## 2. 컬러 시스템

모든 색상은 CSS Custom Properties (HSL)로 정의되며, `hsl(var(--token))` 또는 Tailwind 매핑 토큰으로 참조됩니다.

### 2.1 서피스 스케일 (Surface Elevation)

`app/globals.css` 에서 정의.

| 토큰 | HSL 값 | Hex 근사 | Tailwind 클래스 | 용도 |
|---|---|---|---|---|
| `--bg-0` | `222 16% 3%`  | `#07080a` | `bg-bg0`  | 페이지 배경 |
| `--bg-1` | `222 14% 6%`  | `#0d0f12` | `bg-bg1` / `bg-surface1` / `bg-card` | 패널 배경 |
| `--bg-2` | `222 14% 9%`  | `#14171c` | `bg-bg2` / `bg-surface2` | 패널 헤더, 카드 |
| `--bg-3` | `222 14% 13%` | `#1c2028` | `bg-bg3` / `bg-surface3` | Hover / Active |
| `--bg-4` | `222 14% 18%` | `#262b35` | `bg-bg4` | Heavy surface |

레거시 토큰(`surface1/2/3`)은 `bg-1/2/3`의 별칭으로 매핑되어 하위 호환됩니다.

### 2.2 텍스트 스케일

| 토큰 | HSL 값 | Hex | Tailwind | 용도 |
|---|---|---|---|---|
| `--fg-0` | `220 8% 96%` | `#f5f5f7` | `text-fg0` | 헤드라인, 차 번호 |
| `--fg-1` | `220 8% 87%` | `#d9dce2` | `text-fg1` | 본문 (기본) |
| `--fg-2` | `220 7% 57%` | `#8a9099` | `text-fg2` | 서브 텍스트 |
| `--fg-3` | `220 7% 39%` | `#5a606a` | `text-fg3` | 레이블 / muted |
| `--fg-4` | `220 7% 25%` | `#3a4048` | `text-fg4` | 극약한 텍스트 |

### 2.3 라인 웨이트

| 토큰 | Tailwind | 용도 |
|---|---|---|
| `--line-1` | `border-line1` | 기본 1px 경계선 |
| `--line-2` | `border-line2` | 그룹 구분, 카드 보더 |
| `--line-3` | `border-line3` | 강조 섹션 구분 |

### 2.4 레이싱 클래스 색상

| 토큰 | HSL 값 | Hex | 클래스 |
|---|---|---|---|
| `--hypercar` | `0 100% 59%` | `#ff2e2e` | Hypercar (primary accent) |
| `--lmp2` | `214 100% 62%` | `#3a8cff` | LMP2 |
| `--lmgt3` | `140 66% 49%` | `#27d36b` | LMGT3 |
| `--fastest` | `276 100% 71%` | `#c26bff` | Fastest Lap / purple |

**하이퍼카 레드는 `--accent`로 매핑되어 Tailwind의 `bg-accent`, `text-accent`, `border-accent`를 통해 참조 가능 — 브로드캐스트 히어로 리본, LIVE 인디케이터, 티커 바의 주 컬러입니다.**

### 2.5 시맨틱 상태 색상

각 상태 색상은 세 변형(`--{name}`, `--{name}-bg`, `--{name}-border`)을 가집니다.

| 이름 | Tailwind | 용도 |
|---|---|---|
| `live` | `text-live`, `bg-live` | LIVE, RUN, GREEN 플래그 |
| `pit` | `text-pit`, `bg-pit` | 피트 인·아웃, 리플레이 강조 |
| `danger` | `text-danger`, `bg-danger` | STOP, RED 플래그, 에러 |
| `warning` | `text-warning`, `bg-warning` | CONNECTING, OFF, YELLOW |
| `info` | `text-info`, `bg-info` | OUT, driver_change |

### 2.6 플래그 색상

| 토큰 | Tailwind | 플래그 |
|---|---|---|
| `--flag-green` | `bg-flagGreen` | Green |
| `--flag-yellow` | `bg-flagYellow` | Yellow |
| `--flag-red` | `bg-flagRed` | Red |
| `--flag-sc` | `bg-flagSc` | Safety Car |

### 2.7 타이어 색상 (하드코딩, `StintTimeline.tsx` 등)

| 타이어 | 배경 | 텍스트 |
|---|---|---|
| S | `#ffd400` | `#000` |
| M | `#f5f5f7` | `#000` |
| H | `#ff2e2e` | `#fff` |
| W | `#3a8cff` | `#fff` |
| I | `#27d36b` | `#000` |

---

## 3. 타이포그래피

Pit Wall v3.0은 **3-font stack**을 사용합니다. `globals.css`에서 Google Fonts를 import합니다.

| 클래스 | 폰트 | 용도 |
|---|---|---|
| `.disp` | Bai Jamjuree (400–700) | 디스플레이 텍스트, 히어로, 섹션 레이블, 탭, 버튼 |
| `.cond` | Barlow Condensed (500–900) | 컨덴스드 대형 텍스트 (레이스 이름 등) |
| `.mono` | JetBrains Mono (400–700) | 랩타임, 갭, 숫자, 티커 |
| `.tabular` | (inherit) + `tabular-nums` | 표에서 숫자 정렬이 필요한 경우 |

Body 기본 폰트는 `Bai Jamjuree` (`--font-ui`), `font-size: 12px`, `line-height: 1.4`, `antialiased`.

### 3.1 크기 스케일

| 용도 | 크기 | 예시 |
|---|---|---|
| 섹션 레이블 | `9–10px` | `.section-label`, panel-header 보조 |
| 메타 텍스트 | `9–10px` | 타임스탬프, 서브 레이블 |
| 본문 | `11–13px` | 리더보드 셀, 메시지 |
| 통계 수치 | `22–24px` | StatsBar 숫자, 드라이버 best |
| 차 번호 | `16–24px` | 리더보드, 분석 표 |
| 히어로 타이틀 | `26–28px` | Header 레이스 이름 |

---

## 4. 간격 & 레이아웃

| 단계 | 크기 | Tailwind | 사용 |
|---|---|---|---|
| xs | `2px` | `p-0.5` | 뱃지 내부 |
| sm | `4px` | `p-1` | 타이트 갭 |
| md | `8px` | `p-2` | 기본 갭 |
| lg | `12px` | `p-3` | 카드 패딩 |
| xl | `16–20px` | `p-4 / p-5` | 큰 카드 / 히어로 |

### 레이아웃 그리드

- **대시보드 그리드**: `minmax(0,1fr) 420px` — 메인 콘텐츠 + 우측 사이드바(TrackMap + StintOverview + MessageFeed compact)
- **StatsBar**: `repeat(4, 1fr)`
- **리더보드 `GRID_COLS`**: `56px 96px 58px minmax(160px,1fr) 92px 104px 92px 60px` (POS · CLASS+clsPos · CAR · Team/Driver · GAP · Last/Best · Tire+laps · Status)
- **Border radius**: `--radius: 0.125rem` (2px) — 브로드캐스트 하드 에지 유지

---

## 5. Chevron Clip-Path 유틸리티

브로드캐스트 TV 그래픽의 핵심인 각진 에지는 CSS `clip-path`로 구현됩니다.

| 클래스 | 효과 |
|---|---|
| `.clip-chev-r` | 오른쪽 아래 모서리만 7–12px 각지게 자름 |
| `.clip-chev-l` | 왼쪽 위 모서리만 자름 |
| `.clip-chev-both` | 양쪽 모두 자름 |
| `.clip-chev-sm` | 오른쪽, 7px |
| `.clip-chev-hero` | 오른쪽, 36px (`Header` 레드 리본용) |
| `.chev-tag` | 각진 pill 태그 — inline-flex, 11px, 1.2px tracking, uppercase |

---

## 6. 컴포넌트

### 6.1 Badge (`app/components/ui/badge.tsx`)

CVA variant 기반.

```tsx
import { Badge } from '@/app/components/ui/badge'

<Badge variant="hypercar">HYPERCAR</Badge>
<Badge variant="live">LIVE</Badge>
<Badge variant="pit">PIT</Badge>
<Badge variant="danger">STOP</Badge>
```

| variant | 용도 |
|---|---|
| `default` | 기본 회색 |
| `hypercar` / `lmp2` / `lmgt3` | 클래스 배지 |
| `live`, `pit`, `danger`, `warning`, `info`, `purple` | 시맨틱 상태 |
| `muted`, `outline` | 보조 |

### 6.2 Button (`app/components/ui/button.tsx`)

CVA variants: `default`, `ghost`, `active`, `live`, `accent`, `danger`. 사이즈: `sm` / `default` / `lg` / `icon`.

브로드캐스트 UI는 대부분 `.btn-ghost` CSS 유틸을 직접 사용합니다 (`<button className="btn-ghost">RECONNECT</button>`).

### 6.3 Card / Tabs / ScrollArea / Slider / Separator

- **Tabs** (`app/components/ui/tabs.tsx`): Radix 기반 underline 스타일. `TabsList`는 40px 높이 + `border-b border-line2`. 활성 탭은 `border-b-2 border-accent` + `text-fg0`.
- **Slider** (`app/components/ui/slider.tsx`): ReplayControls에서 타임라인으로 사용.
- **ScrollArea** (`app/components/ui/scroll-area.tsx`): 커스텀 스크롤바 컨테이너.

### 6.4 주요 합성 컴포넌트

| 컴포넌트 | 설명 |
|---|---|
| `Header.tsx` | 브로드캐스트 히어로 리본 (80px, 하이퍼카 레드 `clip-chev-hero`) + 인라인 ELAPSED/FASTEST/TEMP + LIVE/PREVIOUS 뱃지 |
| `FlagBanner.tsx` | chevron 플래그 태그 + 3개 섹터 카드 (좌측 컬러 바) |
| `StatsBar.tsx` | 4-col 그리드, 22px mono 값, 상단 3px 컬러 보더 |
| `LeaderboardRow.tsx` | POS 셀이 클래스 컬러 chevron 박스, 리더는 그라디언트 행 |
| `MessageFeed.tsx` | 4px 컬러 좌측 바 + 타임스탬프 + DISP 타이틀 + 본문, 필터 칩 |
| `Ticker.tsx` | 하단 36px 레드 티커 — black-on-red "RACE CONTROL" 태그 + 60s linear 스크롤 |
| `StintOverview.tsx`, `StintTimeline.tsx`, `StintAnalysis.tsx`, `DriverAnalysis.tsx`, `ReplayBrowser.tsx`, `ReplayControls.tsx` | `panel` / `panel-header` 패턴, class-color 액센트 |

---

## 7. CSS 유틸리티 클래스

`globals.css`에 정의:

| 클래스 | 효과 |
|---|---|
| `.panel` | `bg-bg1` + `border border-line1` |
| `.panel-header` | 10px 14px 패딩 + `bg-bg2` 하단 보더 + 11px DISP uppercase tracking-1.8 |
| `.section-label` | 10px DISP uppercase tracking-1.5 color-fg3 |
| `.chev-tag` | 각진 inline-flex pill |
| `.btn-ghost` | 투명 브로드캐스트 버튼 + hover/on 상태 |
| `.clip-chev-{r, l, both, sm, hero}` | chevron clip-path 변형 |
| `.disp`, `.cond`, `.mono`, `.tabular` | 폰트 스택 선택 |
| `.dot-blink`, `.dot-blink-slow`, `.pulse` | 깜박임 / 펄스 애니메이션 |
| `.ticker-track` | 60s linear 스크롤 (좌→우 -50%) |
| `.glow-live`, `.glow-danger` | 상태 글로우 박스 쉐도우 |
| `.lb-row` | 리더보드 행 hover 전이 |
| `.glass` | 글래스모피즘 카드 (70% + blur 8px) |

---

## 8. 레이싱 데이터 패턴

### 갭 / 인터벌
- 리더(class 1위): `LEADER` 텍스트 (hypercar 또는 클래스 컬러)
- `+N Lap` → muted (`text-fg3`)
- `+m.ssss` → `mono` 기본
- 모든 갭은 **클래스 상대 (class-relative)** 기준 — `gaps` 채널의 `gapToFirst` / `gapToAhead` 사용

### 랩타임 컬러
- **session best (SB)** → `text-fastest` (보라)
- **personal best (PB)** → `text-live` (녹색)
- 일반 / 유효 → `text-fg0`
- 피트 중·삭제 → `text-fg3`

### 플래그 상태

| 상태 | 토큰 |
|---|---|
| GREEN FLAG | `--flag-green` |
| YELLOW FLAG | `--flag-yellow` |
| SAFETY CAR | `--flag-sc` |
| RED FLAG | `--flag-red` |

---

## 9. 파일 구조

```
app/
├── globals.css                # Pit Wall v3.0 토큰 + 유틸리티
├── components/
│   ├── ui/                    # shadcn/Radix primitives
│   │   ├── badge.tsx          # CVA variants
│   │   ├── button.tsx         # CVA variants
│   │   ├── card.tsx
│   │   ├── tabs.tsx           # underline 브로드캐스트 스타일
│   │   ├── scroll-area.tsx
│   │   ├── separator.tsx
│   │   └── slider.tsx
│   ├── Header.tsx             # 하이퍼카 레드 히어로 리본
│   ├── FlagBanner.tsx         # chevron 플래그 태그 + 섹터 카드
│   ├── StatsBar.tsx           # 4-col 통계
│   ├── Leaderboard.tsx        # 필터 칩 + 스크롤
│   ├── LeaderboardRow.tsx     # chevron POS 셀
│   ├── Legend.tsx
│   ├── MessageFeed.tsx        # 컬러바 + 필터
│   ├── Ticker.tsx             # 하단 레드 티커
│   ├── StintOverview.tsx
│   ├── StintTimeline.tsx
│   ├── StintAnalysis.tsx
│   ├── DriverAnalysis.tsx
│   ├── TrackMap.tsx           # 섹터 기반 점 배치
│   ├── RoundBanner.tsx
│   ├── ReplayBrowser.tsx
│   ├── ReplayControls.tsx
│   ├── ClassBadge.tsx
│   ├── TireBadge.tsx
│   └── StatusBadge.tsx
├── lib/
│   └── utils.ts               # cn() = clsx + tailwind-merge
tailwind.config.ts             # CSS var 토큰 매핑 + 폰트 스택
```

---

## 10. 의존성

| 패키지 | 용도 |
|---|---|
| `class-variance-authority` | Badge/Button CVA variants |
| `clsx` + `tailwind-merge` | `cn()` 조건부 className 조합 |
| `lucide-react` | 아이콘 |
| `@radix-ui/react-tabs` | 탭 네비게이션 |
| `@radix-ui/react-scroll-area` | 커스텀 스크롤바 |
| `@radix-ui/react-slider` | 리플레이 타임라인 |
| `@radix-ui/react-separator` | 구분선 |
| Google Fonts | Bai Jamjuree + Barlow Condensed + JetBrains Mono |

---

*Design System version 3.0 — Pit Wall Broadcast Overlay*
*Updated: 2026-04-22*

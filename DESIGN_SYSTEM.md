# Pit Wall — Design System

WEC Live Timing Dashboard의 디자인 시스템 문서입니다.

---

## 1. 개요

| 항목 | 내용 |
|---|---|
| 프레임워크 | Next.js 14 App Router |
| 스타일 엔진 | Tailwind CSS v3 + CSS Custom Properties |
| 컴포넌트 기반 | shadcn/ui (Radix UI primitives + CVA) |
| 타이포그래피 | JetBrains Mono (monospace only) |
| 기본 테마 | Dark-only (단일 컬러 테마) |
| 디자인 철학 | **Pit Wall** — 텔레메트리 터미널 미학, 레이싱 데이터의 밀도 유지 |

---

## 2. 컬러 시스템

모든 색상은 CSS Custom Properties (HSL)로 정의되며, Tailwind 유틸리티에서 `hsl(var(--token))` 형식으로 참조됩니다.

### 2.1 기본 서피스 (Surface Elevation)

| 토큰 | HSL 값 | Hex 근사 | 용도 |
|---|---|---|---|
| `--background` | `0 0% 5%` | `#0d0d0d` | 페이지 배경 |
| `--surface1` | `0 0% 7%` | `#111111` | 가장 낮은 카드 레벨 |
| `--card` | `0 0% 8%` | `#141414` | 기본 카드 배경 |
| `--surface2` | `0 0% 10%` | `#1a1a1a` | 중간 레벨 (hover bg) |
| `--surface3` | `0 0% 13%` | `#222222` | 높은 레벨 (active bg) |
| `--border` | `0 0% 14%` | `#242424` | 경계선 |

### 2.2 텍스트

| 토큰 | HSL 값 | Hex 근사 | 용도 |
|---|---|---|---|
| `--foreground` | `0 0% 80%` | `#cccccc` | 기본 텍스트 |
| `--muted-foreground` | `0 0% 40%` | `#666666` | 서브 레이블, 메타 정보 |

### 2.3 레이싱 클래스 색상

| 토큰 | HSL 값 | Hex | 클래스 |
|---|---|---|---|
| `--hypercar` | `0 94% 63%` | `#ff4444` | Hypercar |
| `--lmp2` | `220 100% 65%` | `#4488ff` | LMP2 |
| `--lmgt3` | `130 65% 55%` | `#44cc55` | LMGT3 |
| `--fastest` | `280 65% 65%` | `#cc44ff` | Fastest Lap |

### 2.4 시맨틱 상태 색상

각 시맨틱 색상은 세 가지 변형을 갖습니다: `--{name}` (text), `--{name}-bg` (background), `--{name}-border` (border).

| 이름 | 용도 | Text HSL |
|---|---|---|
| `live` | LIVE 상태, GREEN FLAG, RUN | `145 100% 40%` |
| `pit` | 피트인·아웃, 리플레이 강조, 경고 | `35 100% 50%` |
| `danger` | 에러, STOP 상태, RED FLAG, 사고 | `0 85% 55%` |
| `warning` | 연결 중, OFF 상태, 재연결 | `40 100% 52%` |
| `info` | OUT 상태, 드라이버 교체 | `220 100% 62%` |
| `purple` | Fastest Lap 메시지, OUT | `280 65% 65%` |

### 2.5 타이어 색상 (하드코딩)

| 타이어 | 배경 | 텍스트 | Tailwind 클래스 |
|---|---|---|---|
| S (소프트) | `bg-yellow-400` | `text-black` | — |
| M (미디엄) | `bg-white` | `text-black` | — |
| H (하드) | `bg-red-500` | `text-white` | — |
| W (웻) | `bg-blue-600` | `text-white` | — |
| I (인터) | `bg-emerald-600` | `text-white` | — |

---

## 3. 타이포그래피

| 항목 | 값 |
|---|---|
| 폰트 패밀리 | `JetBrains Mono`, `Fira Code`, `Cascadia Code`, `Consolas`, monospace |
| 기본 크기 | `12px` |
| 줄 높이 | `1.4` |
| Smoothing | `antialiased` |
| 숫자 정렬 | `font-variant-numeric: tabular-nums` (`.tabular` 유틸리티) |

### 크기 스케일

| 용도 | 크기 | 예시 |
|---|---|---|
| 섹션 레이블 | `9px` | "TEAM · DRIVER", "스틴트 현황" |
| 메타 텍스트 | `9–10px` | 타임스탬프, 서브 레이블 |
| 본문 | `10–11px` | 레이더보드 값, 메시지 |
| 헤더 타이틀 | `13px` | 레이스 이름 |
| 통계 수치 | `18px` | StatsBar 숫자 |
| 차 번호 | `14px` | 리더보드 #번호 |

---

## 4. 간격 & 레이아웃

| 단계 | 크기 | 사용 |
|---|---|---|
| xs | `2px` (0.5) | 뱃지 내부 패딩 |
| sm | `4px` (1) | 타이트 갭 |
| md | `8px` (2) | 기본 갭 |
| lg | `12px` (3) | 카드 패딩 |
| xl | `16px` (4) | 큰 카드 패딩 |

### 레이아웃

- **대시보드 그리드**: `1fr 280px` (메인 콘텐츠 + 우측 사이드바)
- **StatsBar 그리드**: `repeat(4, 1fr)` 4등분
- **Border radius**: `--radius: 0.5rem` (8px) — Tailwind `rounded-lg`

---

## 5. 컴포넌트

### 5.1 Badge

`app/components/ui/badge.tsx` — CVA(class-variance-authority) 기반.

```tsx
import { Badge } from '@/app/components/ui/badge'

<Badge variant="hypercar">HYPERCAR</Badge>
<Badge variant="live">LIVE</Badge>
<Badge variant="pit">PIT</Badge>
<Badge variant="danger">STOP</Badge>
```

| variant | 용도 |
|---|---|
| `default` | 기본 (회색) |
| `hypercar` / `lmp2` / `lmgt3` | 클래스 배지 |
| `live` | RUN 상태, LIVE 연결 |
| `pit` | PIT 상태 |
| `danger` | STOP / ERROR / RED FLAG |
| `warning` | OFF 상태 / CONNECTING |
| `info` | OUT 상태 / driver_change |
| `purple` | Fastest Lap |
| `muted` | 서브 텍스트 배지 |
| `outline` | 테두리만 |

### 5.2 Button

`app/components/ui/button.tsx`

```tsx
import { Button } from '@/app/components/ui/button'

<Button variant="ghost" size="sm">닫기</Button>
<Button variant="live">▶ 재생</Button>
<Button variant="accent">⏸ 일시정지</Button>
```

| variant | 용도 |
|---|---|
| `default` | 일반 버튼 |
| `ghost` | 투명 배경 |
| `active` | 활성 탭 상태 |
| `live` | 재생 버튼 (녹색) |
| `accent` | 일시정지 (주황) |
| `danger` | 위험 액션 |

| size | 높이 |
|---|---|
| `sm` | 24px |
| `default` | 28px |
| `lg` | 32px |
| `icon` | 28×28px |

### 5.3 Card

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>스틴트 현황</CardTitle>
  </CardHeader>
  <CardContent>...</CardContent>
</Card>
```

### 5.4 Tabs

`app/components/ui/tabs.tsx` — Radix UI TabsPrimitive 기반.

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs'

<Tabs defaultValue="dashboard">
  <TabsList>
    <TabsTrigger value="dashboard">대시보드</TabsTrigger>
  </TabsList>
  <TabsContent value="dashboard">...</TabsContent>
</Tabs>
```

### 5.5 ScrollArea

```tsx
import { ScrollArea } from '@/app/components/ui/scroll-area'

<ScrollArea className="h-[400px]">
  {/* 콘텐츠 */}
</ScrollArea>
```

### 5.6 Slider

```tsx
import { Slider } from '@/app/components/ui/slider'

<Slider
  min={0} max={100}
  value={[currentIdx]}
  onValueChange={([v]) => seek(v)}
/>
```

---

## 6. CSS 유틸리티 클래스

`globals.css`에 정의된 재사용 클래스:

| 클래스 | 효과 |
|---|---|
| `.panel` | 기본 다크 카드 (card bg + border + radius) |
| `.glass` | 글래스모피즘 카드 (배경 70% + blur) |
| `.section-label` | 섹션 헤더 레이블 스타일 (9px, uppercase, muted) |
| `.tabular` | `font-variant-numeric: tabular-nums` |
| `.glow-live` | LIVE 상태 박스 쉐도우 (녹색 글로우) |
| `.glow-danger` | 에러 상태 박스 쉐도우 (빨간 글로우) |
| `.dot-blink` | 1.2s 깜박임 애니메이션 |
| `.dot-blink-slow` | 2.4s 느린 깜박임 |
| `.lb-row` | 리더보드 행 hover 트랜지션 |

---

## 7. 레이싱 데이터 패턴

### 갭/인터벌 표시

```
LEAD    → text-yellow-300    (클래스 선두)
+1 Lap  → text-muted-foreground (랩 차이)
+3.456s → text-[#aaa]        (일반 갭)
```

### 랩타임 색상

```
최고 기록 (보라) → text-[hsl(var(--fastest))]
피트 중 (회색)   → text-muted-foreground
일반             → text-foreground
```

### 플래그 상태

| 상태 | 배경 | 색상 |
|---|---|---|
| GREEN FLAG | `#002200` | `#00ff66` |
| YELLOW FLAG | `#261800` | `#ffaa00` |
| SAFETY CAR | `#1a0e00` | `#ff9933` |
| RED FLAG | `#200000` | `#ff4444` |

---

## 8. 파일 구조

```
app/
├── globals.css              # CSS Custom Properties + base styles
├── components/
│   ├── ui/                  # shadcn/ui primitives
│   │   ├── badge.tsx        # Badge (CVA variants)
│   │   ├── button.tsx       # Button (CVA variants)
│   │   ├── card.tsx         # Card, CardHeader, CardTitle, CardContent
│   │   ├── tabs.tsx         # Tabs (Radix TabsPrimitive)
│   │   ├── scroll-area.tsx  # ScrollArea (Radix ScrollArea)
│   │   ├── separator.tsx    # Separator (Radix Separator)
│   │   └── slider.tsx       # Slider (Radix Slider)
│   ├── ClassBadge.tsx       # Badge variant="hypercar/lmp2/lmgt3"
│   ├── StatusBadge.tsx      # Badge variant="live/pit/danger/warning/info"
│   ├── TireBadge.tsx        # 원형 타이어 배지 (Tailwind bg classes)
│   ├── Header.tsx           # 레이스 헤더 (이름, 날씨, 세션 배지)
│   ├── FlagBanner.tsx       # 플래그 상태 배너
│   ├── StatsBar.tsx         # 4개 통계 카드 그리드
│   ├── Leaderboard.tsx      # 리더보드 컨테이너
│   ├── LeaderboardRow.tsx   # 개별 차량 행
│   ├── Legend.tsx           # 색상 범례
│   ├── MessageFeed.tsx      # 이벤트 로그 + 필터
│   ├── StintOverview.tsx    # 스틴트 현황 패널
│   ├── RoundBanner.tsx      # 라운드 상태 배너
│   ├── ReplayBrowser.tsx    # 레이스 목록 브라우저
│   └── ReplayControls.tsx   # 재생 컨트롤 (슬라이더 + 버튼)
├── lib/
│   └── utils.ts             # cn() = clsx + tailwind-merge
tailwind.config.ts           # CSS variable 토큰 매핑
```

---

## 9. 추가된 의존성

| 패키지 | 버전 | 용도 |
|---|---|---|
| `class-variance-authority` | latest | Badge/Button CVA variants |
| `clsx` | latest | 조건부 className 조합 |
| `tailwind-merge` | latest | Tailwind 클래스 충돌 해결 |
| `lucide-react` | latest | 아이콘 (향후 사용) |
| `@radix-ui/react-tabs` | latest | 탭 네비게이션 primitive |
| `@radix-ui/react-scroll-area` | latest | 커스텀 스크롤바 영역 |
| `@radix-ui/react-slider` | latest | 리플레이 타임라인 슬라이더 |
| `@radix-ui/react-separator` | latest | 구분선 |

---

*Design System version 2.0 — Pit Wall Dark*
*Updated: 2026-04-21*

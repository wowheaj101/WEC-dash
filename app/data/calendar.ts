export interface WECRound {
  round:       number
  name:        string
  circuit:     string
  country:     string
  countryFlag: string
  duration:    string
  /**
   * Round weekend start — UTC ISO string.
   * 라운드 시작 시점 (FP1 시작 시각). 프랙티스/퀄리파잉 포함.
   * `getRoundStatus`는 이 시각부터 `raceEnd`까지를 `active` phase로 판정한다.
   */
  weekendStart: string
  /** Race start — UTC ISO string */
  raceStart:   string
  /** Race end — UTC ISO string */
  raceEnd:     string
  /** Circuit GPS coords for weather API */
  lat:         number
  lon:         number
}

// ── 2026 FIA WEC 시즌 캘린더 ──────────────────────────────────────────
// 중동 정세로 2025년 말 일정 재조정: Qatar가 시즌 오프너에서 R7로 이동,
// COTA(Lone Star Le Mans)가 R5로 신규 추가되어 총 8라운드 체제.
// 공식 FIA WEC 캘린더(fiawec.alkamelsystems.com)를 참고해 매 시즌 초 업데이트할 것.
export const CALENDAR_2026: WECRound[] = [
  {
    round:       1,
    name:        '6 Hours of Imola',
    circuit:     'Autodromo Enzo e Dino Ferrari',
    country:     'Italy',
    countryFlag: '🇮🇹',
    duration:    '6h',
    weekendStart:'2026-04-17T00:00:00Z',
    raceStart:   '2026-04-19T11:00:00Z',
    raceEnd:     '2026-04-19T17:00:00Z',
    lat:         44.341,
    lon:         11.713,
  },
  {
    round:       2,
    name:        '6 Hours of Spa-Francorchamps',
    circuit:     'Circuit de Spa-Francorchamps',
    country:     'Belgium',
    countryFlag: '🇧🇪',
    duration:    '6h',
    weekendStart:'2026-05-07T00:00:00Z',
    raceStart:   '2026-05-09T11:30:00Z',
    raceEnd:     '2026-05-09T17:30:00Z',
    lat:         50.437,
    lon:         5.971,
  },
  {
    round:       3,
    name:        '24 Hours of Le Mans',
    circuit:     'Circuit de la Sarthe',
    country:     'France',
    countryFlag: '🇫🇷',
    duration:    '24h',
    weekendStart:'2026-06-07T00:00:00Z',
    raceStart:   '2026-06-13T14:00:00Z',
    raceEnd:     '2026-06-14T14:00:00Z',
    lat:         47.956,
    lon:         0.207,
  },
  {
    round:       4,
    name:        '6 Hours of São Paulo',
    circuit:     'Interlagos Circuit',
    country:     'Brazil',
    countryFlag: '🇧🇷',
    duration:    '6h',
    weekendStart:'2026-07-10T00:00:00Z',
    raceStart:   '2026-07-12T14:00:00Z',
    raceEnd:     '2026-07-12T20:00:00Z',
    lat:         -23.703,
    lon:         -46.698,
  },
  {
    round:       5,
    name:        'Lone Star Le Mans',
    circuit:     'Circuit of the Americas',
    country:     'United States',
    countryFlag: '🇺🇸',
    duration:    '6h',
    weekendStart:'2026-09-04T00:00:00Z',
    raceStart:   '2026-09-06T18:00:00Z',
    raceEnd:     '2026-09-07T00:00:00Z',
    lat:         30.133,
    lon:         -97.641,
  },
  {
    round:       6,
    name:        '6 Hours of Fuji',
    circuit:     'Fuji Speedway',
    country:     'Japan',
    countryFlag: '🇯🇵',
    duration:    '6h',
    weekendStart:'2026-09-25T00:00:00Z',
    raceStart:   '2026-09-27T02:00:00Z',
    raceEnd:     '2026-09-27T08:00:00Z',
    lat:         35.372,
    lon:         138.927,
  },
  {
    round:       7,
    name:        'Qatar 1812 km',
    circuit:     'Lusail International Circuit',
    country:     'Qatar',
    countryFlag: '🇶🇦',
    duration:    '~10h',
    weekendStart:'2026-10-22T00:00:00Z',
    raceStart:   '2026-10-24T14:00:00Z',
    raceEnd:     '2026-10-25T00:00:00Z',
    lat:         25.490,
    lon:         51.454,
  },
  {
    round:       8,
    name:        '8 Hours of Bahrain',
    circuit:     'Bahrain International Circuit',
    country:     'Bahrain',
    countryFlag: '🇧🇭',
    duration:    '8h',
    weekendStart:'2026-11-05T00:00:00Z',
    raceStart:   '2026-11-07T12:00:00Z',
    raceEnd:     '2026-11-07T20:00:00Z',
    lat:         26.032,
    lon:         50.511,
  },
]

export const CURRENT_SEASON = CALENDAR_2026

export interface WECRound {
  round:       number
  name:        string
  circuit:     string
  country:     string
  countryFlag: string
  duration:    string
  /** Race start — UTC ISO string */
  raceStart:   string
  /** Race end — UTC ISO string */
  raceEnd:     string
  /** Circuit GPS coords for weather API */
  lat:         number
  lon:         number
}

// ── 2026 FIA WEC 시즌 캘린더 ──────────────────────────────────────────
// 날짜는 공식 FIA WEC 캘린더(fiawec.alkamelsystems.com)를 참고해 매 시즌 초 업데이트할 것.
export const CALENDAR_2026: WECRound[] = [
  {
    round:       1,
    name:        '1812km of Qatar',
    circuit:     'Lusail International Circuit',
    country:     'Qatar',
    countryFlag: '🇶🇦',
    duration:    '~12h',
    raceStart:   '2026-02-28T14:00:00Z',
    raceEnd:     '2026-03-01T02:00:00Z',
    lat:         25.490,
    lon:         51.454,
  },
  {
    round:       2,
    name:        '6 Hours of Imola',
    circuit:     'Autodromo Enzo e Dino Ferrari',
    country:     'Italy',
    countryFlag: '🇮🇹',
    duration:    '6h',
    raceStart:   '2026-04-19T11:00:00Z',
    raceEnd:     '2026-04-19T17:00:00Z',
    lat:         44.341,
    lon:         11.713,
  },
  {
    round:       3,
    name:        '6 Hours of Spa-Francorchamps',
    circuit:     'Circuit de Spa-Francorchamps',
    country:     'Belgium',
    countryFlag: '🇧🇪',
    duration:    '6h',
    raceStart:   '2026-05-10T11:30:00Z',
    raceEnd:     '2026-05-10T17:30:00Z',
    lat:         50.437,
    lon:         5.971,
  },
  {
    round:       4,
    name:        '24 Hours of Le Mans',
    circuit:     'Circuit de la Sarthe',
    country:     'France',
    countryFlag: '🇫🇷',
    duration:    '24h',
    raceStart:   '2026-06-13T16:00:00Z',
    raceEnd:     '2026-06-14T16:00:00Z',
    lat:         47.956,
    lon:         0.207,
  },
  {
    round:       5,
    name:        '6 Hours of São Paulo',
    circuit:     'Autodromo José Carlos Pace',
    country:     'Brazil',
    countryFlag: '🇧🇷',
    duration:    '6h',
    raceStart:   '2026-07-11T17:00:00Z',
    raceEnd:     '2026-07-11T23:00:00Z',
    lat:         -23.703,
    lon:         -46.698,
  },
  {
    round:       6,
    name:        '6 Hours of Fuji',
    circuit:     'Fuji Speedway',
    country:     'Japan',
    countryFlag: '🇯🇵',
    duration:    '6h',
    raceStart:   '2026-09-05T02:00:00Z',
    raceEnd:     '2026-09-05T08:00:00Z',
    lat:         35.372,
    lon:         138.927,
  },
  {
    round:       7,
    name:        '8 Hours of Bahrain',
    circuit:     'Bahrain International Circuit',
    country:     'Bahrain',
    countryFlag: '🇧🇭',
    duration:    '8h',
    raceStart:   '2026-11-01T12:00:00Z',
    raceEnd:     '2026-11-01T20:00:00Z',
    lat:         26.032,
    lon:         50.511,
  },
]

export const CURRENT_SEASON = CALENDAR_2026

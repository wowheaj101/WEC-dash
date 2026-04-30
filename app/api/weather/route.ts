import { NextResponse } from 'next/server'

export interface WeatherData {
  air:       number   // °C
  track:     number   // estimated track surface °C
  humidity:  number   // %
  windSpeed: number   // km/h
  condition: string   // 'sunny' | 'cloudy' | 'rainy' | 'foggy' | 'snowy'
  icon:      string   // emoji
}

// WMO weather code → condition
function mapCondition(code: number): { condition: string; icon: string } {
  if (code === 0)                    return { condition: 'sunny',   icon: '☀️' }
  if (code <= 3)                     return { condition: 'cloudy',  icon: '⛅' }
  if (code === 45 || code === 48)    return { condition: 'foggy',   icon: '🌫️' }
  if (code >= 51 && code <= 67)      return { condition: 'rainy',   icon: '🌧️' }
  if (code >= 71 && code <= 77)      return { condition: 'snowy',   icon: '❄️' }
  if (code >= 80 && code <= 82)      return { condition: 'rainy',   icon: '🌦️' }
  if (code >= 95)                    return { condition: 'stormy',  icon: '⛈️' }
  return { condition: 'cloudy', icon: '☁️' }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')

  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat and lon required' }, { status: 400 })
  }

  const latNum = parseFloat(lat)
  const lonNum = parseFloat(lon)
  if (isNaN(latNum) || isNaN(lonNum) ||
      latNum < -90 || latNum > 90 ||
      lonNum < -180 || lonNum > 180) {
    return NextResponse.json({ error: 'invalid coordinates' }, { status: 400 })
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${latNum}&longitude=${lonNum}` +
      `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m` +
      `&wind_speed_unit=kmh&timezone=auto`

    const res  = await fetch(url, { next: { revalidate: 3600 } })  // 1시간 캐시
    const data = await res.json()

    const current = data.current
    const air     = Math.round(current.temperature_2m)
    const code    = current.weather_code as number
    const { condition, icon } = mapCondition(code)

    // 트랙 온도: 맑은 날 +15~20°C, 흐린 날 +8°C, 비 +3°C
    const trackOffset = condition === 'sunny' ? 18
      : condition === 'cloudy' ? 8
      : 3
    const track    = air + trackOffset

    const result: WeatherData = {
      air,
      track,
      humidity:  Math.round(current.relative_humidity_2m),
      windSpeed: Math.round(current.wind_speed_10m),
      condition,
      icon,
    }

    return NextResponse.json(result)
  } catch {
    // 실패 시 기본값 반환 (UI가 빈값으로 표시되지 않도록)
    return NextResponse.json({
      air: 0, track: 0, humidity: 0, windSpeed: 0,
      condition: 'unknown', icon: '—',
    } satisfies WeatherData)
  }
}

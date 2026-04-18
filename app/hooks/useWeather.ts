'use client'

import { useEffect, useState } from 'react'
import type { WeatherData } from '@/app/api/weather/route'

export function useWeather(lat: number | null, lon: number | null): WeatherData | null {
  const [data, setData] = useState<WeatherData | null>(null)

  useEffect(() => {
    if (lat === null || lon === null) return

    let cancelled = false
    fetch(`/api/weather?lat=${lat}&lon=${lon}`)
      .then(r => r.json())
      .then((d: WeatherData) => { if (!cancelled) setData(d) })
      .catch(() => {})

    return () => { cancelled = true }
  }, [lat, lon])

  return data
}

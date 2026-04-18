import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'WEC Live Timing',
  description: 'FIA World Endurance Championship Live Dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

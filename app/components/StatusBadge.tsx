'use client'

import { Badge } from '@/app/components/ui/badge'
import type { Status } from '@/app/types/race'

const VARIANT = {
  RUN:  'live',
  PIT:  'pit',
  OUT:  'info',
  OFF:  'warning',
  STOP: 'danger',
} as const

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge variant={VARIANT[status] ?? 'default'}>
      {status}
    </Badge>
  )
}

'use client'

import { Badge } from '@/app/components/ui/badge'
import type { CarClass } from '@/app/types/race'

const VARIANT = {
  HYPERCAR: 'hypercar',
  LMP2:     'lmp2',
  LMGT3:    'lmgt3',
} as const

export default function ClassBadge({ carClass }: { carClass: CarClass }) {
  return (
    <Badge variant={VARIANT[carClass] ?? 'default'}>
      {carClass}
    </Badge>
  )
}

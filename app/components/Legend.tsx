'use client'

import StatusBadge from './StatusBadge'
import { Separator } from '@/app/components/ui/separator'

export default function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-2 py-1.5 text-[9px] text-muted-foreground">
      <span><span className="text-[hsl(var(--hypercar))]">■</span> HYPERCAR</span>
      <span><span className="text-[hsl(var(--lmp2))]">■</span> LMP2</span>
      <span><span className="text-[hsl(var(--lmgt3))]">■</span> LMGT3</span>
      <span><span className="text-[hsl(var(--fastest))]">■</span> 패스티스트 랩</span>
      <span><span className="text-yellow-300">LEAD</span> = 클래스 선두</span>
      <Separator orientation="vertical" className="h-3 hidden sm:block" />
      <span className="flex items-center gap-1"><StatusBadge status="PIT" /> 피트 정차</span>
      <span className="flex items-center gap-1"><StatusBadge status="OUT" /> 피트 아웃</span>
      <span className="flex items-center gap-1"><StatusBadge status="OFF" /> 트랙 이탈</span>
    </div>
  )
}

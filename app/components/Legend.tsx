'use client'

import StatusBadge from './StatusBadge'
import ClassBadge from './ClassBadge'

export default function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 bg-bg1 border border-line1 text-[10px] text-fg3">
      <div className="flex items-center gap-1.5"><ClassBadge carClass="HYPERCAR" size={9} /> HC</div>
      <div className="flex items-center gap-1.5"><ClassBadge carClass="LMP2" size={9} /> P2</div>
      <div className="flex items-center gap-1.5"><ClassBadge carClass="LMGT3" size={9} /> GT3</div>
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 bg-fastest" /> FASTEST
      </div>
      <span className="text-pit mono">LEAD</span>
      <span className="disp tracking-[1.5px]">= CLASS LEADER</span>
      <div className="h-3 w-px bg-line2 hidden sm:block" />
      <div className="flex items-center gap-1.5"><StatusBadge status="PIT" /> PIT IN</div>
      <div className="flex items-center gap-1.5"><StatusBadge status="OUT" /> PIT OUT</div>
      <div className="flex items-center gap-1.5"><StatusBadge status="OFF" /> OFF TRACK</div>
    </div>
  )
}

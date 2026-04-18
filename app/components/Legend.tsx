'use client'

import StatusBadge from './StatusBadge'

export default function Legend() {
  return (
    <div style={{
      fontSize:  9,
      color:     '#444',
      padding:   '4px 8px',
      display:   'flex',
      flexWrap:  'wrap',
      gap:       12,
      alignItems:'center',
    }}>
      <span><span style={{ color: '#ff4444' }}>■</span>&nbsp;HYPERCAR</span>
      <span><span style={{ color: '#4488ff' }}>■</span>&nbsp;LMP2</span>
      <span><span style={{ color: '#44cc55' }}>■</span>&nbsp;LMGT3</span>
      <span><span style={{ color: '#cc44ff' }}>■</span>&nbsp;패스티스트 랩</span>
      <span style={{ color: '#ffff66' }}>LEAD = 클래스 선두</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <StatusBadge status="PIT" />&nbsp;피트 정차 중
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <StatusBadge status="OUT" />&nbsp;피트 아웃
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <StatusBadge status="OFF" />&nbsp;트랙 이탈
      </span>
    </div>
  )
}

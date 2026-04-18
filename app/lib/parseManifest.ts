// colSpec: [[colName, flagBitmask], ...]  — flagBitmask은 컬럼 타입 힌트(무시해도 됨)
export type ColMap = Record<string, number>

export interface T71Manifest {
  name:           string
  description?:   string
  colSpec:        Array<[string, number]>
  trackDataSpec?: string[]
}

/**
 * colSpec 배열에서 { 컬럼명 → 인덱스 } 맵을 생성.
 * 레이스마다 colSpec이 다르므로 항상 manifest를 먼저 받아 파싱해야 한다.
 */
export function buildColMap(colSpec: Array<[string, number]>): ColMap {
  return Object.fromEntries(colSpec.map(([name], idx) => [name, idx]))
}

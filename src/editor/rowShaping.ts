import type { RowShaping, RowShapingKind, StitchElement } from '../types'

const MAX_STITCHES = 500

function clampBaseCount(value: number) {
  return Math.max(1, Math.min(MAX_STITCHES, Math.round(value)))
}

export function maxRowShapingChanges(baseCount: number, kind: RowShapingKind) {
  const base = clampBaseCount(baseCount)
  if (kind === 'increase') return Math.min(base, MAX_STITCHES - base)
  return Math.floor(base / 2)
}

export function normalizeRowShapingCount(
  baseCount: number,
  kind: RowShapingKind,
  changeCount: number,
) {
  const max = maxRowShapingChanges(baseCount, kind)
  if (max <= 0) return 0
  return Math.max(1, Math.min(max, Math.round(Math.abs(changeCount) || 1)))
}

export function targetCountForRowShaping(
  baseCount: number,
  kind: RowShapingKind,
  changeCount: number,
) {
  const base = clampBaseCount(baseCount)
  const changes = normalizeRowShapingCount(base, kind, changeCount)
  return kind === 'increase' ? base + changes : base - changes
}

export function createRowShaping(
  baseCount: number,
  kind: RowShapingKind,
  changeCount: number,
): RowShaping | undefined {
  const base = clampBaseCount(baseCount)
  const count = normalizeRowShapingCount(base, kind, changeCount)
  return count > 0 ? { kind, count, baseCount: base } : undefined
}

export function rowShapingMarkerIndices(shaping: RowShaping, targetCount: number) {
  const target = Math.max(1, Math.round(targetCount))
  const markerCount = Math.min(target, Math.max(0, Math.round(shaping.count)))
  if (!markerCount) return []

  const indices = Array.from({ length: markerCount }, (_, index) =>
    Math.max(0, Math.min(target - 1, Math.round(((index + 1) * target) / markerCount) - 1)),
  )
  return [...new Set(indices)]
}

export function rowShapingMarkers(elements: StitchElement[]) {
  const rows = new Map<string, StitchElement[]>()
  for (const element of elements) {
    const rowId = element.parametricRow?.id
    if (!rowId) continue
    rows.set(rowId, [...(rows.get(rowId) ?? []), element])
  }

  const markers = new Map<string, RowShapingKind>()
  for (const children of rows.values()) {
    const shaping = children[0]?.parametricRow?.shaping
    if (!shaping) continue
    for (const index of rowShapingMarkerIndices(shaping, children.length)) {
      const child = children[index]
      if (child) markers.set(child.id, shaping.kind)
    }
  }
  return markers
}

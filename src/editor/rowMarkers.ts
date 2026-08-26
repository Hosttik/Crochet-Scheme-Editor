import type { RowMarker } from '../types'

export function nextRowMarkerNumber(markers: RowMarker[]) {
  const used = new Set(
    markers
      .map((marker) => Math.round(marker.number))
      .filter((number) => Number.isFinite(number) && number > 0),
  )
  let candidate = 1
  while (used.has(candidate)) candidate += 1
  return candidate
}

export function normalizedRowMarkerNumber(value: number) {
  if (!Number.isFinite(value)) return 1
  return Math.max(1, Math.round(value))
}

export function isRowMarkerVisible(marker: RowMarker) {
  return marker.visible !== false
}

export function isRowMarkerLocked(marker: RowMarker) {
  return marker.locked === true
}

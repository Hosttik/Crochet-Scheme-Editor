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

export function deleteRowMarkerAndRenumber(markers: RowMarker[], id: string) {
  const removed = markers.find((marker) => marker.id === id)
  if (!removed) return markers
  return markers
    .filter((marker) => marker.id !== id)
    .map((marker) =>
      marker.number > removed.number ? { ...marker, number: marker.number - 1 } : marker,
    )
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

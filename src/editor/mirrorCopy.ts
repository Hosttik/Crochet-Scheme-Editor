import type { StitchElement } from '../types'
import {
  cloneSelectionWithOffset,
  groupElements,
  mirrorElements,
  type MirrorAxis,
} from './productivity'

export function createMirroredCopy(
  elements: StitchElement[],
  ids: string[],
  axis: MirrorAxis,
  gap: number,
  createId: () => string,
) {
  const selected = new Set(ids)
  const source = elements.filter((element) => selected.has(element.id) && !element.parametricRow)
  if (!source.length) return []

  const minX = Math.min(...source.map((element) => element.x))
  const maxX = Math.max(...source.map((element) => element.x))
  const minY = Math.min(...source.map((element) => element.y))
  const maxY = Math.max(...source.map((element) => element.y))
  const safeGap = Math.max(1, Math.abs(gap))
  const deltaX = axis === 'left-right' ? Math.max(safeGap, maxX - minX + safeGap) : 0
  const deltaY = axis === 'top-bottom' ? Math.max(safeGap, maxY - minY + safeGap) : 0
  const copied = cloneSelectionWithOffset(elements, ids, deltaX, deltaY, createId)
  const copiedIds = copied.map((element) => element.id)
  const mirrored = mirrorElements(copied, copiedIds, axis)
  return mirrored.length > 1 ? groupElements(mirrored, copiedIds, createId()) : mirrored
}

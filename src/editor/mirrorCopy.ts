import { SYMBOL_BY_ID } from '../symbols'
import type { StitchElement } from '../types'
import { elementAabb, type Rect } from './selection'
import {
  cloneSelectionWithOffset,
  groupElements,
  mirrorElements,
  mirrorElementsAcrossLine,
  mirrorElementsAroundAxis,
  mirrorLineForDirection,
  type MirrorAxis,
  type MirrorDirection,
  type MirrorLine,
} from './productivity'

function boundsOf(elements: StitchElement[]): Rect | null {
  const bounds = elements.map((element) => {
    const symbol = SYMBOL_BY_ID.get(element.symbolId)
    return elementAabb(element, {
      width: symbol?.width ?? 30,
      height: symbol?.height ?? 30,
    })
  })
  if (!bounds.length) return null
  return {
    left: Math.min(...bounds.map((item) => item.left)),
    top: Math.min(...bounds.map((item) => item.top)),
    right: Math.max(...bounds.map((item) => item.right)),
    bottom: Math.max(...bounds.map((item) => item.bottom)),
  }
}

export function createMirroredCopy(
  elements: StitchElement[],
  ids: string[],
  axis: MirrorAxis,
  gap: number,
  createId: () => string,
) {
  const selected = new Set(ids)
  const source = elements.filter((element) => selected.has(element.id) && !element.parametricRow)
  const sourceBounds = boundsOf(source)
  if (!source.length || !sourceBounds) return []

  const copied = cloneSelectionWithOffset(elements, ids, 0, 0, createId)
  const copiedIds = copied.map((element) => element.id)
  const mirrored = mirrorElements(copied, copiedIds, axis)
  const mirroredBounds = boundsOf(mirrored)
  if (!mirroredBounds) return []

  const safeGap = Math.max(1, Math.abs(gap))
  const deltaX = axis === 'left-right'
    ? sourceBounds.right + safeGap - mirroredBounds.left
    : 0
  const deltaY = axis === 'top-bottom'
    ? sourceBounds.bottom + safeGap - mirroredBounds.top
    : 0
  const positioned = mirrored.map((element) => ({
    ...element,
    x: element.x + deltaX,
    y: element.y + deltaY,
  }))
  return positioned.length > 1 ? groupElements(positioned, copiedIds, createId()) : positioned
}

export function createMirroredCopyAroundAxis(
  elements: StitchElement[],
  ids: string[],
  axis: MirrorAxis,
  coordinate: number,
  createId: () => string,
) {
  const selected = new Set(ids)
  const source = elements.filter((element) => selected.has(element.id) && !element.parametricRow)
  if (!source.length || !Number.isFinite(coordinate)) return []

  const copied = cloneSelectionWithOffset(elements, ids, 0, 0, createId)
  const copiedIds = copied.map((element) => element.id)
  const mirrored = mirrorElementsAroundAxis(copied, copiedIds, axis, coordinate)
  return mirrored.length > 1 ? groupElements(mirrored, copiedIds, createId()) : mirrored
}

export function createMirroredCopyAcrossLine(
  elements: StitchElement[],
  ids: string[],
  line: MirrorLine,
  createId: () => string,
) {
  const selected = new Set(ids)
  const source = elements.filter((element) => selected.has(element.id) && !element.parametricRow)
  if (!source.length) return []
  const copied = cloneSelectionWithOffset(elements, ids, 0, 0, createId)
  const copiedIds = copied.map((element) => element.id)
  const mirrored = mirrorElementsAcrossLine(copied, copiedIds, line)
  return mirrored.length > 1 ? groupElements(mirrored, copiedIds, createId()) : mirrored
}

export function createDirectionalMirroredCopy(
  elements: StitchElement[],
  ids: string[],
  direction: MirrorDirection,
  _gap: number,
  createId: () => string,
) {
  // Directional preview and both commit actions must use the same axis. A hidden
  // extra gap here would make Create mirrored copy jump away from its ghost.
  const line = mirrorLineForDirection(elements, ids, direction)
  return line ? createMirroredCopyAcrossLine(elements, ids, line, createId) : []
}

import type { Point, StitchElement } from '../types'
import { isElementLocked } from './document'
import {
  MAX_STITCH_SCALE,
  MIN_STITCH_SCALE,
  normalizedStitchGeometry,
  resolvedStitchGeometry,
  stitchVisualSelectionBounds,
} from './stitchGeometry'

export type AtomicChainGroupSelection = {
  groupId: string
  ids: string[]
  pivot: Point
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function radians(value: number) {
  return value * Math.PI / 180
}

function normalizeDegrees(value: number) {
  return ((value + 180) % 360 + 360) % 360 - 180
}

export function atomicChainGroupSelection(
  elements: StitchElement[],
  selectedIds: string[],
): AtomicChainGroupSelection | null {
  if (selectedIds.length < 2) return null

  const selected = new Set(selectedIds)
  const selectedElements = elements.filter((element) => selected.has(element.id))
  if (selectedElements.length !== selectedIds.length) return null

  const groupId = selectedElements[0]?.groupId
  if (!groupId) return null
  if (selectedElements.some((element) => (
    element.groupId !== groupId ||
    element.symbolId !== 'chain' ||
    element.parametricRow ||
    element.guideAttachment ||
    isElementLocked(element)
  ))) return null

  const groupElements = elements.filter((element) => element.groupId === groupId)
  if (
    groupElements.length !== selectedElements.length ||
    groupElements.some((element) => !selected.has(element.id))
  ) return null

  const bounds = stitchVisualSelectionBounds(elements, selectedIds, false)
  if (!bounds) return null

  return {
    groupId,
    ids: selectedElements.map((element) => element.id),
    pivot: {
      x: (bounds.left + bounds.right) / 2,
      y: (bounds.top + bounds.bottom) / 2,
    },
  }
}

export function rotateSelectionAroundPivot(
  elements: StitchElement[],
  ids: string[],
  pivot: Point,
  deltaDegrees: number,
) {
  if (!Number.isFinite(deltaDegrees) || Math.abs(deltaDegrees) < 1e-9) return elements
  const selected = new Set(ids)
  const angle = radians(deltaDegrees)
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)

  return elements.map((element) => {
    if (!selected.has(element.id) || element.parametricRow || isElementLocked(element)) return element
    const dx = element.x - pivot.x
    const dy = element.y - pivot.y
    return {
      ...element,
      x: pivot.x + dx * cos - dy * sin,
      y: pivot.y + dx * sin + dy * cos,
      rotation: normalizeDegrees(element.rotation + deltaDegrees),
      guideAttachment: undefined,
    }
  })
}

export function scaleSelectionAroundPivot(
  elements: StitchElement[],
  ids: string[],
  pivot: Point,
  requestedFactor: number,
) {
  const selected = new Set(ids)
  const selectedElements = elements.filter((element) => selected.has(element.id) && !element.parametricRow && !isElementLocked(element))
  if (!selectedElements.length || !Number.isFinite(requestedFactor) || requestedFactor <= 0) return elements

  let minFactor = 0
  let maxFactor = Number.POSITIVE_INFINITY
  for (const element of selectedElements) {
    const geometry = resolvedStitchGeometry(element)
    minFactor = Math.max(
      minFactor,
      MIN_STITCH_SCALE / geometry.scaleX,
      MIN_STITCH_SCALE / geometry.scaleY,
    )
    maxFactor = Math.min(
      maxFactor,
      MAX_STITCH_SCALE / geometry.scaleX,
      MAX_STITCH_SCALE / geometry.scaleY,
    )
  }
  const factor = clamp(requestedFactor, minFactor, maxFactor)

  return elements.map((element) => {
    if (!selected.has(element.id) || element.parametricRow || isElementLocked(element)) return element
    const geometry = resolvedStitchGeometry(element)
    return {
      ...element,
      x: pivot.x + (element.x - pivot.x) * factor,
      y: pivot.y + (element.y - pivot.y) * factor,
      geometry: normalizedStitchGeometry(element.symbolId, {
        scaleX: geometry.scaleX * factor,
        scaleY: geometry.scaleY * factor,
        spread: geometry.spread,
      }),
      guideAttachment: undefined,
    }
  })
}

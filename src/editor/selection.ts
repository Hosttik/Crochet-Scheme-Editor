import type { Point, StitchElement } from '../types'

export type Rect = {
  left: number
  top: number
  right: number
  bottom: number
}

export type ElementSize = {
  width: number
  height: number
}

export function normalizeRect(a: Point, b: Point): Rect {
  return {
    left: Math.min(a.x, b.x),
    top: Math.min(a.y, b.y),
    right: Math.max(a.x, b.x),
    bottom: Math.max(a.y, b.y),
  }
}

export function rectsIntersect(a: Rect, b: Rect) {
  return !(
    a.right < b.left ||
    a.left > b.right ||
    a.bottom < b.top ||
    a.top > b.bottom
  )
}

export function elementAabb(
  element: StitchElement,
  size: ElementSize,
  padding = 0,
): Rect {
  const halfWidth = size.width / 2 + padding
  const halfHeight = size.height / 2 + padding
  const radians = (element.rotation * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const corners = [
    { x: -halfWidth, y: -halfHeight },
    { x: halfWidth, y: -halfHeight },
    { x: halfWidth, y: halfHeight },
    { x: -halfWidth, y: halfHeight },
  ].map((point) => ({
    x: element.x + point.x * cos - point.y * sin,
    y: element.y + point.x * sin + point.y * cos,
  }))

  return {
    left: Math.min(...corners.map((point) => point.x)),
    top: Math.min(...corners.map((point) => point.y)),
    right: Math.max(...corners.map((point) => point.x)),
    bottom: Math.max(...corners.map((point) => point.y)),
  }
}

export function idsInMarquee(
  elements: StitchElement[],
  marquee: Rect,
  sizes: Record<string, ElementSize>,
) {
  return elements
    .filter((element) =>
      rectsIntersect(
        marquee,
        elementAabb(element, sizes[element.symbolId] ?? { width: 30, height: 30 }),
      ),
    )
    .map((element) => element.id)
}

export function selectionAabb(
  elements: StitchElement[],
  selectedIds: Iterable<string>,
  sizes: Record<string, ElementSize>,
): Rect | null {
  const selected = new Set(selectedIds)
  const bounds = elements
    .filter((element) => selected.has(element.id))
    .map((element) =>
      elementAabb(element, sizes[element.symbolId] ?? { width: 30, height: 30 }, 8),
    )

  if (!bounds.length) return null

  return {
    left: Math.min(...bounds.map((item) => item.left)),
    top: Math.min(...bounds.map((item) => item.top)),
    right: Math.max(...bounds.map((item) => item.right)),
    bottom: Math.max(...bounds.map((item) => item.bottom)),
  }
}

export function pointerAngle(center: Point, pointer: Point) {
  return (Math.atan2(pointer.y - center.y, pointer.x - center.x) * 180) / Math.PI
}

export function rotationFromPointer(
  startRotation: number,
  startPointerAngle: number,
  currentPointerAngle: number,
  snap = false,
) {
  const rotation = startRotation + currentPointerAngle - startPointerAngle
  return snap ? Math.round(rotation / 15) * 15 : rotation
}

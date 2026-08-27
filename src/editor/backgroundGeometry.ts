import type { BackgroundImage, Point } from '../types'

export type BackgroundResizeHandle = 'nw' | 'ne' | 'se' | 'sw'

const MIN_BACKGROUND_SIZE = 12

function radians(degrees: number) {
  return (degrees * Math.PI) / 180
}

function degrees(value: number) {
  return (value * 180) / Math.PI
}

export function backgroundRotation(background: BackgroundImage) {
  return Number.isFinite(background.rotation) ? background.rotation ?? 0 : 0
}

export function backgroundCenter(background: BackgroundImage): Point {
  return {
    x: background.x + background.width / 2,
    y: background.y + background.height / 2,
  }
}

export function rotatePointAround(point: Point, center: Point, angleDegrees: number): Point {
  const angle = radians(angleDegrees)
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const dx = point.x - center.x
  const dy = point.y - center.y
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  }
}

export function backgroundCorners(background: BackgroundImage) {
  const center = backgroundCenter(background)
  const rotation = backgroundRotation(background)
  const corners = {
    nw: { x: background.x, y: background.y },
    ne: { x: background.x + background.width, y: background.y },
    se: { x: background.x + background.width, y: background.y + background.height },
    sw: { x: background.x, y: background.y + background.height },
  } as const
  return Object.fromEntries(
    Object.entries(corners).map(([key, point]) => [key, rotatePointAround(point, center, rotation)]),
  ) as Record<BackgroundResizeHandle, Point>
}

export function backgroundImageBounds(background: BackgroundImage) {
  const corners = Object.values(backgroundCorners(background))
  const xs = corners.map((point) => point.x)
  const ys = corners.map((point) => point.y)
  const left = Math.min(...xs)
  const right = Math.max(...xs)
  const top = Math.min(...ys)
  const bottom = Math.max(...ys)
  return { left, right, top, bottom, width: right - left, height: bottom - top }
}

export function moveBackground(background: BackgroundImage, dx: number, dy: number): BackgroundImage {
  return { ...background, x: background.x + dx, y: background.y + dy }
}

const oppositeHandle: Record<BackgroundResizeHandle, BackgroundResizeHandle> = {
  nw: 'se', ne: 'sw', se: 'nw', sw: 'ne',
}

const direction: Record<BackgroundResizeHandle, { x: -1 | 1; y: -1 | 1 }> = {
  nw: { x: -1, y: -1 },
  ne: { x: 1, y: -1 },
  se: { x: 1, y: 1 },
  sw: { x: -1, y: 1 },
}

export function resizeBackgroundFromCorner(
  background: BackgroundImage,
  handle: BackgroundResizeHandle,
  pointer: Point,
  preserveAspect = false,
): BackgroundImage {
  const center = backgroundCenter(background)
  const rotation = backgroundRotation(background)
  const localPointer = rotatePointAround(pointer, center, -rotation)
  const localCorners = {
    nw: { x: background.x, y: background.y },
    ne: { x: background.x + background.width, y: background.y },
    se: { x: background.x + background.width, y: background.y + background.height },
    sw: { x: background.x, y: background.y + background.height },
  } as const
  const opposite = localCorners[oppositeHandle[handle]]
  const sign = direction[handle]
  let width = Math.max(MIN_BACKGROUND_SIZE, Math.abs(localPointer.x - opposite.x))
  let height = Math.max(MIN_BACKGROUND_SIZE, Math.abs(localPointer.y - opposite.y))

  if (preserveAspect) {
    const ratio = Math.max(0.0001, background.width / background.height)
    if (width / height > ratio) height = width / ratio
    else width = height * ratio
  }

  const dragged = {
    x: opposite.x + sign.x * width,
    y: opposite.y + sign.y * height,
  }
  const localCenter = {
    x: (opposite.x + dragged.x) / 2,
    y: (opposite.y + dragged.y) / 2,
  }
  const worldCenter = rotatePointAround(localCenter, center, rotation)
  return {
    ...background,
    x: worldCenter.x - width / 2,
    y: worldCenter.y - height / 2,
    width,
    height,
  }
}

export function rotateBackgroundFromPointer(
  background: BackgroundImage,
  startPointer: Point,
  currentPointer: Point,
  snap = false,
): BackgroundImage {
  const center = backgroundCenter(background)
  const startAngle = Math.atan2(startPointer.y - center.y, startPointer.x - center.x)
  const currentAngle = Math.atan2(currentPointer.y - center.y, currentPointer.x - center.x)
  let rotation = backgroundRotation(background) + degrees(currentAngle - startAngle)
  if (snap) rotation = Math.round(rotation / 15) * 15
  if (Math.abs(rotation) < 1e-9) rotation = 0
  return { ...background, rotation }
}

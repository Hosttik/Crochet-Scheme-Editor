import type { Guide, Point } from '../types'
import { distance, rotatePoint } from './geometry'
import { gridLocalBounds } from './guides'
import { pathPoseAt } from './pathGuides'

export type GuideManipulationMode =
  | 'move'
  | 'resize'
  | 'rotate'
  | 'start'
  | 'end'
  | 'control1'
  | 'control2'

const ROTATION_SNAP_DEGREES = 15

function angleDegrees(origin: Point, point: Point) {
  return (Math.atan2(point.y - origin.y, point.x - origin.x) * 180) / Math.PI
}

function normalizeDelta(value: number) {
  let result = value % 360
  if (result > 180) result -= 360
  if (result < -180) result += 360
  return result
}

export function guideCenter(guide: Guide): Point {
  if (guide.type === 'grid') return guide.origin
  if (guide.type === 'arc' || guide.type === 'radial-grid') return guide.center
  return pathPoseAt(guide, 0.5).point
}

export function guideResizeHandle(guide: Guide): Point | null {
  if (guide.type === 'grid' || guide.type === 'line' || guide.type === 'curve') return null

  const angle = guide.type === 'arc'
    ? (guide.startAngle + guide.endAngle) / 2
    : guide.startAngle
  const radius = guide.type === 'arc'
    ? guide.radius
    : Math.max(1, Math.round(guide.ringCount)) * guide.ringSpacing
  const radians = (angle * Math.PI) / 180

  return {
    x: guide.center.x + Math.cos(radians) * radius,
    y: guide.center.y + Math.sin(radians) * radius,
  }
}

export function gridRotationHandle(guide: Guide): Point | null {
  if (guide.type !== 'grid') return null

  const { halfHeight } = gridLocalBounds(guide)
  const local = rotatePoint({ x: 0, y: -halfHeight - 38 }, guide.rotation)
  return {
    x: guide.origin.x + local.x,
    y: guide.origin.y + local.y,
  }
}

export function gridRotationStemPoint(guide: Guide): Point | null {
  if (guide.type !== 'grid') return null

  const { halfHeight } = gridLocalBounds(guide)
  const local = rotatePoint({ x: 0, y: -halfHeight }, guide.rotation)
  return {
    x: guide.origin.x + local.x,
    y: guide.origin.y + local.y,
  }
}

function translatePoint(point: Point, dx: number, dy: number): Point {
  return { x: point.x + dx, y: point.y + dy }
}

export function applyGuideManipulation(
  guide: Guide,
  mode: GuideManipulationMode,
  startPointer: Point,
  currentPointer: Point,
  snapRotation = false,
): Guide {
  if (mode === 'move') {
    const dx = currentPointer.x - startPointer.x
    const dy = currentPointer.y - startPointer.y

    if (guide.type === 'grid') {
      return {
        ...guide,
        origin: translatePoint(guide.origin, dx, dy),
      }
    }

    if (guide.type === 'arc' || guide.type === 'radial-grid') {
      return {
        ...guide,
        center: translatePoint(guide.center, dx, dy),
      }
    }

    if (guide.type === 'line') {
      return {
        ...guide,
        start: translatePoint(guide.start, dx, dy),
        end: translatePoint(guide.end, dx, dy),
      }
    }

    return {
      ...guide,
      start: translatePoint(guide.start, dx, dy),
      control1: translatePoint(guide.control1, dx, dy),
      control2: translatePoint(guide.control2, dx, dy),
      end: translatePoint(guide.end, dx, dy),
    }
  }

  if (mode === 'start' && (guide.type === 'line' || guide.type === 'curve')) {
    return { ...guide, start: currentPointer }
  }
  if (mode === 'end' && (guide.type === 'line' || guide.type === 'curve')) {
    return { ...guide, end: currentPointer }
  }
  if (mode === 'control1' && guide.type === 'curve') {
    return { ...guide, control1: currentPointer }
  }
  if (mode === 'control2' && guide.type === 'curve') {
    return { ...guide, control2: currentPointer }
  }

  if (mode === 'resize') {
    if (guide.type === 'arc') {
      return {
        ...guide,
        radius: Math.max(10, distance(guide.center, currentPointer)),
      }
    }

    if (guide.type === 'radial-grid') {
      const ringCount = Math.max(1, Math.round(guide.ringCount))
      return {
        ...guide,
        ringSpacing: Math.max(5, distance(guide.center, currentPointer) / ringCount),
      }
    }

    return guide
  }

  if (guide.type !== 'grid') return guide

  const startAngle = angleDegrees(guide.origin, startPointer)
  const currentAngle = angleDegrees(guide.origin, currentPointer)
  const rawRotation = guide.rotation + normalizeDelta(currentAngle - startAngle)
  return {
    ...guide,
    rotation: snapRotation
      ? Math.round(rawRotation / ROTATION_SNAP_DEGREES) * ROTATION_SNAP_DEGREES
      : rawRotation,
  }
}

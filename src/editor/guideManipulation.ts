import type { Guide, Point } from '../types'
import { distance, rotatePoint } from './geometry'
import { gridLocalBounds } from './guides'

export type GuideManipulationMode = 'move' | 'resize' | 'rotate'

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
  return guide.type === 'grid' ? guide.origin : guide.center
}

export function guideResizeHandle(guide: Guide): Point | null {
  if (guide.type === 'grid') return null

  const angle =
    guide.type === 'arc'
      ? (guide.startAngle + guide.endAngle) / 2
      : guide.startAngle
  const radius =
    guide.type === 'arc'
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

export function applyGuideManipulation(
  guide: Guide,
  mode: GuideManipulationMode,
  startPointer: Point,
  currentPointer: Point,
): Guide {
  if (mode === 'move') {
    const dx = currentPointer.x - startPointer.x
    const dy = currentPointer.y - startPointer.y

    if (guide.type === 'grid') {
      return {
        ...guide,
        origin: { x: guide.origin.x + dx, y: guide.origin.y + dy },
      }
    }

    return {
      ...guide,
      center: { x: guide.center.x + dx, y: guide.center.y + dy },
    }
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
  return {
    ...guide,
    rotation: guide.rotation + normalizeDelta(currentAngle - startAngle),
  }
}

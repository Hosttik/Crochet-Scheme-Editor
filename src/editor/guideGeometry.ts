import type { Guide, LineGuide, Point } from '../types'

export type GuideFitRect = { left: number; top: number; right: number; bottom: number }

const EPSILON = 1e-6

function radians(value: number) {
  return (value * Math.PI) / 180
}

export function lineGuideLength(guide: LineGuide) {
  return Math.hypot(guide.end.x - guide.start.x, guide.end.y - guide.start.y)
}

export function lineGuideAngle(guide: LineGuide) {
  return Math.atan2(guide.end.y - guide.start.y, guide.end.x - guide.start.x) * 180 / Math.PI
}

export function setLineGuideLength(guide: LineGuide, rawLength: number): LineGuide {
  const length = Math.max(1, Math.abs(rawLength))
  const angle = radians(lineGuideAngle(guide))
  return {
    ...guide,
    end: {
      x: guide.start.x + Math.cos(angle) * length,
      y: guide.start.y + Math.sin(angle) * length,
    },
  }
}

export function setLineGuideAngle(guide: LineGuide, angleDegrees: number): LineGuide {
  const length = Math.max(EPSILON, lineGuideLength(guide))
  const angle = radians(angleDegrees)
  return {
    ...guide,
    end: {
      x: guide.start.x + Math.cos(angle) * length,
      y: guide.start.y + Math.sin(angle) * length,
    },
  }
}

export function fitLineGuideToRect(
  guide: LineGuide,
  rect: GuideFitRect,
  margin = 40,
): LineGuide {
  const length = lineGuideLength(guide)
  const fallbackAngle = length > EPSILON ? lineGuideAngle(guide) : 0
  const angle = radians(fallbackAngle)
  const axis = { x: Math.cos(angle), y: Math.sin(angle) }
  const midpoint = {
    x: (guide.start.x + guide.end.x) / 2,
    y: (guide.start.y + guide.end.y) / 2,
  }
  const corners: Point[] = [
    { x: rect.left, y: rect.top },
    { x: rect.right, y: rect.top },
    { x: rect.right, y: rect.bottom },
    { x: rect.left, y: rect.bottom },
  ]
  const projections = corners.map((point) =>
    (point.x - midpoint.x) * axis.x + (point.y - midpoint.y) * axis.y,
  )
  const min = Math.min(...projections) - Math.max(0, margin)
  const max = Math.max(...projections) + Math.max(0, margin)
  return {
    ...guide,
    start: { x: midpoint.x + axis.x * min, y: midpoint.y + axis.y * min },
    end: { x: midpoint.x + axis.x * max, y: midpoint.y + axis.y * max },
  }
}

export function reverseGuide(guide: Guide): Guide {
  if (guide.type === 'arc') {
    return { ...guide, startAngle: guide.endAngle, endAngle: guide.startAngle }
  }
  if (guide.type === 'line') {
    return { ...guide, start: guide.end, end: guide.start }
  }
  if (guide.type === 'curve') {
    return {
      ...guide,
      start: guide.end,
      control1: guide.control2,
      control2: guide.control1,
      end: guide.start,
    }
  }
  if (guide.type === 'parabola') {
    return { ...guide, start: guide.end, end: guide.start }
  }
  return guide
}

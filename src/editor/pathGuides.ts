import type {
  ArcGuide,
  CurveGuide,
  Guide,
  GuideAttachment,
  LineGuide,
  Point,
  StitchElement,
} from '../types'

export type PathGuide = ArcGuide | LineGuide | CurveGuide

export type PathPose = {
  point: Point
  tangent: number
}

const EPSILON = 1e-8

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

function radians(value: number) {
  return (value * Math.PI) / 180
}

function degrees(value: number) {
  return (value * 180) / Math.PI
}

function vectorAngle(x: number, y: number, fallback = 0) {
  if (Math.hypot(x, y) < EPSILON) return fallback
  return degrees(Math.atan2(y, x))
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function cubicPoint(guide: CurveGuide, t: number): Point {
  const u = 1 - t
  const uu = u * u
  const tt = t * t
  const uuu = uu * u
  const ttt = tt * t
  return {
    x:
      uuu * guide.start.x +
      3 * uu * t * guide.control1.x +
      3 * u * tt * guide.control2.x +
      ttt * guide.end.x,
    y:
      uuu * guide.start.y +
      3 * uu * t * guide.control1.y +
      3 * u * tt * guide.control2.y +
      ttt * guide.end.y,
  }
}

function cubicDerivative(guide: CurveGuide, t: number): Point {
  const u = 1 - t
  return {
    x:
      3 * u * u * (guide.control1.x - guide.start.x) +
      6 * u * t * (guide.control2.x - guide.control1.x) +
      3 * t * t * (guide.end.x - guide.control2.x),
    y:
      3 * u * u * (guide.control1.y - guide.start.y) +
      6 * u * t * (guide.control2.y - guide.control1.y) +
      3 * t * t * (guide.end.y - guide.control2.y),
  }
}

export function isPathGuide(guide: Guide): guide is PathGuide {
  return guide.type === 'arc' || guide.type === 'line' || guide.type === 'curve'
}

export function pathPoseAt(guide: PathGuide, rawT: number): PathPose {
  const t = clamp01(rawT)
  if (guide.type === 'line') {
    const dx = guide.end.x - guide.start.x
    const dy = guide.end.y - guide.start.y
    return {
      point: {
        x: lerp(guide.start.x, guide.end.x, t),
        y: lerp(guide.start.y, guide.end.y, t),
      },
      tangent: vectorAngle(dx, dy),
    }
  }

  if (guide.type === 'arc') {
    const sweep = guide.endAngle - guide.startAngle
    const angle = guide.startAngle + sweep * t
    const angleRad = radians(angle)
    return {
      point: {
        x: guide.center.x + Math.cos(angleRad) * guide.radius,
        y: guide.center.y + Math.sin(angleRad) * guide.radius,
      },
      tangent: angle + (sweep < 0 ? -90 : 90),
    }
  }

  const point = cubicPoint(guide, t)
  const derivative = cubicDerivative(guide, t)
  return {
    point,
    tangent: vectorAngle(derivative.x, derivative.y),
  }
}

export function pathRenderPoints(guide: PathGuide, segments = 64): Point[] {
  const count = Math.max(2, Math.round(segments))
  return Array.from({ length: count + 1 }, (_, index) => pathPoseAt(guide, index / count).point)
}

export function nearestPathParameter(guide: PathGuide, point: Point): number {
  const samples = guide.type === 'line' ? 24 : guide.type === 'arc' ? 72 : 120
  let bestT = 0
  let bestDistance = Number.POSITIVE_INFINITY

  for (let index = 0; index <= samples; index += 1) {
    const t = index / samples
    const pose = pathPoseAt(guide, t)
    const distance = (pose.point.x - point.x) ** 2 + (pose.point.y - point.y) ** 2
    if (distance < bestDistance) {
      bestDistance = distance
      bestT = t
    }
  }

  let left = Math.max(0, bestT - 1 / samples)
  let right = Math.min(1, bestT + 1 / samples)
  for (let iteration = 0; iteration < 18; iteration += 1) {
    const t1 = left + (right - left) / 3
    const t2 = right - (right - left) / 3
    const p1 = pathPoseAt(guide, t1).point
    const p2 = pathPoseAt(guide, t2).point
    const d1 = (p1.x - point.x) ** 2 + (p1.y - point.y) ** 2
    const d2 = (p2.x - point.x) ** 2 + (p2.y - point.y) ** 2
    if (d1 <= d2) right = t2
    else left = t1
  }
  return clamp01((left + right) / 2)
}

export function pathLength(guide: PathGuide, segments = 160) {
  if (guide.type === 'line') {
    return Math.hypot(guide.end.x - guide.start.x, guide.end.y - guide.start.y)
  }
  if (guide.type === 'arc') {
    return Math.abs(radians(guide.endAngle - guide.startAngle) * guide.radius)
  }
  const points = pathRenderPoints(guide, Math.max(16, segments))
  let length = 0
  for (let index = 1; index < points.length; index += 1) {
    length += Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y)
  }
  return length
}

export function parameterAtPathDistance(guide: PathGuide, startT: number, delta: number): number | null {
  const samples = guide.type === 'curve' ? 240 : 160
  const direction = delta >= 0 ? 1 : -1
  const target = Math.abs(delta)
  if (target < EPSILON) return clamp01(startT)

  let previousT = clamp01(startT)
  let previous = pathPoseAt(guide, previousT).point
  let walked = 0
  const step = direction / samples

  for (let index = 0; index < samples * 2; index += 1) {
    const nextT = previousT + step
    if (nextT < 0 || nextT > 1) return null
    const next = pathPoseAt(guide, nextT).point
    const segment = Math.hypot(next.x - previous.x, next.y - previous.y)
    if (walked + segment >= target) {
      const ratio = segment < EPSILON ? 0 : (target - walked) / segment
      return clamp01(previousT + step * ratio)
    }
    walked += segment
    previousT = nextT
    previous = next
  }
  return null
}

function signedNormalOffset(pose: PathPose, point: Point) {
  const normal = radians(pose.tangent + 90)
  return (point.x - pose.point.x) * Math.cos(normal) + (point.y - pose.point.y) * Math.sin(normal)
}

export function elementFromAttachment(
  element: StitchElement,
  guide: PathGuide,
  attachment: GuideAttachment,
): StitchElement {
  const pose = pathPoseAt(guide, attachment.t)
  const normal = radians(pose.tangent + 90)
  const x = pose.point.x + Math.cos(normal) * attachment.normalOffset
  const y = pose.point.y + Math.sin(normal) * attachment.normalOffset
  const rotation = attachment.orientation === 'keep'
    ? element.rotation
    : pose.tangent + (attachment.orientation === 'normal' ? 90 : 0) + attachment.rotationOffset
  return { ...element, x, y, rotation, guideAttachment: attachment }
}

export function attachElementToGuide(
  element: StitchElement,
  guide: PathGuide,
  orientation: GuideAttachment['orientation'] = 'tangent',
  preserveOffset = false,
): StitchElement {
  const t = nearestPathParameter(guide, element)
  const pose = pathPoseAt(guide, t)
  const attachment: GuideAttachment = {
    guideId: guide.id,
    t,
    orientation,
    rotationOffset: orientation === 'keep' ? 0 : 0,
    normalOffset: preserveOffset ? signedNormalOffset(pose, element) : 0,
  }
  return elementFromAttachment(element, guide, attachment)
}

export function moveAttachedElement(
  element: StitchElement,
  guide: PathGuide,
  target: Point,
): StitchElement {
  const current = element.guideAttachment
  if (!current || current.guideId !== guide.id) return element
  const t = nearestPathParameter(guide, target)
  return elementFromAttachment(element, guide, { ...current, t })
}

export function reconcileGuideAttachments(elements: StitchElement[], guides: Guide[]) {
  const byId = new Map(guides.filter(isPathGuide).map((guide) => [guide.id, guide] as const))
  return elements.map((element) => {
    const attachment = element.guideAttachment
    if (!attachment) return element
    const guide = byId.get(attachment.guideId)
    if (!guide || element.parametricRow) return { ...element, guideAttachment: undefined }
    return elementFromAttachment(element, guide, attachment)
  })
}

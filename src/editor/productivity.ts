import type { Guide, Point, StitchElement } from '../types'
import {
  nearestPathParameter,
  parameterAtPathDistance,
  pathPoseAt,
  type PathGuide,
} from './pathGuides'

export type MirrorAxis = 'left-right' | 'top-bottom'
export type RepeatMode = 'linear' | 'circular' | 'guide'
export type GuideRepeatOrientation = 'keep' | 'tangent' | 'radial'

export type RepeatOptions =
  | {
      mode: 'linear'
      copies: number
      deltaX: number
      deltaY: number
    }
  | {
      mode: 'circular'
      copies: number
      angleStep: number
      center?: Point
    }
  | {
      mode: 'guide'
      copies: number
      spacing: number
      orientation: GuideRepeatOrientation
      guide: Guide
    }

type IdFactory = () => string

type GuidePose = {
  point: Point
  tangent: number
  radial: number
}

type GuideWalk = {
  source: GuidePose
  atOffset: (offset: number) => GuidePose | null
}

const EPSILON = 1e-6
export const MAX_REPEAT_CREATED_ELEMENTS = 5_000

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function positiveModulo(value: number, modulus: number) {
  if (!modulus) return 0
  return ((value % modulus) + modulus) % modulus
}

export function normalizeDegrees(value: number) {
  return positiveModulo(value + 180, 360) - 180
}

function radians(value: number) {
  return (value * Math.PI) / 180
}

function degrees(value: number) {
  return (value * 180) / Math.PI
}

function rotateVector(point: Point, angle: number): Point {
  const angleRadians = radians(angle)
  const cos = Math.cos(angleRadians)
  const sin = Math.sin(angleRadians)
  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  }
}

function rotateAround(point: Point, center: Point, angle: number): Point {
  const rotated = rotateVector({ x: point.x - center.x, y: point.y - center.y }, angle)
  return { x: center.x + rotated.x, y: center.y + rotated.y }
}

export function selectionPivot(elements: StitchElement[], ids: string[]): Point | null {
  const selected = new Set(ids)
  const points = elements.filter((element) => selected.has(element.id))
  if (!points.length) return null
  const minX = Math.min(...points.map((element) => element.x))
  const maxX = Math.max(...points.map((element) => element.x))
  const minY = Math.min(...points.map((element) => element.y))
  const maxY = Math.max(...points.map((element) => element.y))
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }
}

export function expandIdsToGroups(elements: StitchElement[], ids: string[]) {
  const result = new Set(ids)
  const groupIds = new Set(
    elements
      .filter((element) => result.has(element.id) && element.groupId)
      .map((element) => element.groupId as string),
  )
  if (!groupIds.size) return [...result]
  for (const element of elements) {
    if (element.groupId && groupIds.has(element.groupId)) result.add(element.id)
  }
  return [...result]
}

export function groupElements(elements: StitchElement[], ids: string[], groupId: string) {
  const selected = new Set(ids)
  return elements.map((element) =>
    selected.has(element.id) && !element.parametricRow
      ? { ...element, groupId }
      : element,
  )
}

export function ungroupElements(elements: StitchElement[], ids: string[]) {
  const selected = new Set(expandIdsToGroups(elements, ids))
  return elements.map((element) =>
    selected.has(element.id) && element.groupId
      ? { ...element, groupId: undefined }
      : element,
  )
}

export function mirrorElementsAroundAxis(
  elements: StitchElement[],
  ids: string[],
  axis: MirrorAxis,
  coordinate: number,
) {
  if (!Number.isFinite(coordinate)) return elements
  const selected = new Set(ids)

  return elements.map((element) => {
    if (!selected.has(element.id) || element.parametricRow) return element
    if (axis === 'left-right') {
      return {
        ...element,
        x: coordinate * 2 - element.x,
        rotation: normalizeDegrees(180 - element.rotation),
        guideAttachment: undefined,
      }
    }
    return {
      ...element,
      y: coordinate * 2 - element.y,
      rotation: normalizeDegrees(-element.rotation),
      guideAttachment: undefined,
    }
  })
}

export function mirrorElements(
  elements: StitchElement[],
  ids: string[],
  axis: MirrorAxis,
) {
  const pivot = selectionPivot(elements, ids)
  if (!pivot) return elements
  const coordinate = axis === 'left-right' ? pivot.x : pivot.y
  return mirrorElementsAroundAxis(elements, ids, axis, coordinate)
}

function cloneGroupIdMap(source: StitchElement[], createId: IdFactory, makeMotifGroup: boolean) {
  const groupMap = new Map<string, string>()
  for (const element of source) {
    if (element.groupId && !groupMap.has(element.groupId)) groupMap.set(element.groupId, createId())
  }
  const motifGroupId = makeMotifGroup && source.length > 1 ? createId() : undefined
  return (element: StitchElement) =>
    motifGroupId ?? (element.groupId ? groupMap.get(element.groupId) : undefined)
}

function detachedClone(
  element: StitchElement,
  id: string,
  groupId: string | undefined,
  transform: Pick<StitchElement, 'x' | 'y' | 'rotation'>,
): StitchElement {
  return {
    ...element,
    ...transform,
    id,
    groupId,
    locked: false,
    parametricRow: undefined,
    parentStitchIds: undefined,
    guideAttachment: undefined,
  }
}

export function cloneSelectionWithOffset(
  elements: StitchElement[],
  ids: string[],
  deltaX: number,
  deltaY: number,
  createId: IdFactory,
) {
  const selected = new Set(ids)
  const source = elements.filter((element) => selected.has(element.id))
  const groupIdFor = cloneGroupIdMap(source, createId, false)
  return source.map((element) =>
    detachedClone(element, createId(), groupIdFor(element), {
      x: element.x + deltaX,
      y: element.y + deltaY,
      rotation: element.rotation,
    }),
  )
}

export function cloneWithRepeatedDelta(
  previous: StitchElement[],
  current: StitchElement[],
  createId: IdFactory,
) {
  if (!previous.length || previous.length !== current.length) return []
  const groupIdFor = cloneGroupIdMap(current, createId, false)
  return current.map((element, index) => {
    const before = previous[index]
    return detachedClone(element, createId(), groupIdFor(element), {
      x: element.x + (element.x - before.x),
      y: element.y + (element.y - before.y),
      rotation: normalizeDegrees(element.rotation + normalizeDegrees(element.rotation - before.rotation)),
    })
  })
}

function arcGuideWalk(guide: Extract<Guide, { type: 'arc' }>, pivot: Point): GuideWalk | null {
  const radius = Math.max(EPSILON, Math.abs(guide.radius))
  const sweep = guide.endAngle - guide.startAngle
  const sweepAbs = Math.abs(sweep)
  if (sweepAbs < EPSILON) return null
  const closed = Math.abs(sweepAbs - 360) < 0.01 || sweepAbs > 359.99
  const length = radius * radians(sweepAbs)
  const pivotAngle = degrees(Math.atan2(pivot.y - guide.center.y, pivot.x - guide.center.x))
  const forwardDelta = sweep >= 0
    ? positiveModulo(pivotAngle - guide.startAngle, 360)
    : positiveModulo(guide.startAngle - pivotAngle, 360)
  let sourceDistance = (forwardDelta / sweepAbs) * length
  if (!closed && forwardDelta > sweepAbs) {
    const startPoint = {
      x: guide.center.x + radius * Math.cos(radians(guide.startAngle)),
      y: guide.center.y + radius * Math.sin(radians(guide.startAngle)),
    }
    const endPoint = {
      x: guide.center.x + radius * Math.cos(radians(guide.endAngle)),
      y: guide.center.y + radius * Math.sin(radians(guide.endAngle)),
    }
    const startDistance = Math.hypot(pivot.x - startPoint.x, pivot.y - startPoint.y)
    const endDistance = Math.hypot(pivot.x - endPoint.x, pivot.y - endPoint.y)
    sourceDistance = startDistance <= endDistance ? 0 : length
  }

  const poseAtDistance = (distance: number): GuidePose | null => {
    let resolved = distance
    if (closed) resolved = positiveModulo(distance, length)
    else if (distance < -EPSILON || distance > length + EPSILON) return null
    resolved = clamp(resolved, 0, length)
    const progress = length <= EPSILON ? 0 : resolved / length
    const angle = guide.startAngle + sweep * progress
    return {
      point: {
        x: guide.center.x + radius * Math.cos(radians(angle)),
        y: guide.center.y + radius * Math.sin(radians(angle)),
      },
      tangent: normalizeDegrees(angle + (sweep >= 0 ? 90 : -90)),
      radial: normalizeDegrees(angle),
    }
  }

  const source = poseAtDistance(sourceDistance)
  if (!source) return null
  return {
    source,
    atOffset: (offset) => poseAtDistance(sourceDistance + offset),
  }
}

function continuousPathGuideWalk(
  guide: Extract<PathGuide, { type: 'line' | 'curve' }>,
  pivot: Point,
): GuideWalk {
  const sourceT = nearestPathParameter(guide, pivot)
  const sourcePose = pathPoseAt(guide, sourceT)
  const pose = (t: number): GuidePose => {
    const resolved = pathPoseAt(guide, t)
    return {
      point: resolved.point,
      tangent: normalizeDegrees(resolved.tangent),
      radial: normalizeDegrees(resolved.tangent + 90),
    }
  }
  return {
    source: pose(sourceT),
    atOffset: (offset) => {
      const t = parameterAtPathDistance(guide, sourceT, offset)
      return t == null ? null : pose(t)
    },
  }
}

function radialGuideWalk(
  guide: Extract<Guide, { type: 'radial-grid' }>,
  pivot: Point,
): GuideWalk | null {
  const maxRing = Math.max(1, Math.round(guide.ringCount))
  const spacing = Math.max(EPSILON, Math.abs(guide.ringSpacing))
  const distance = Math.hypot(pivot.x - guide.center.x, pivot.y - guide.center.y)
  const ringIndex = clamp(Math.round(distance / spacing), 1, maxRing)
  const radius = ringIndex * spacing
  const sourceAngle = degrees(Math.atan2(pivot.y - guide.center.y, pivot.x - guide.center.x))
  const length = Math.PI * 2 * radius

  const poseAtOffset = (offset: number): GuidePose => {
    const angle = sourceAngle + degrees(positiveModulo(offset, length) / radius)
    return {
      point: {
        x: guide.center.x + radius * Math.cos(radians(angle)),
        y: guide.center.y + radius * Math.sin(radians(angle)),
      },
      tangent: normalizeDegrees(angle + 90),
      radial: normalizeDegrees(angle),
    }
  }

  return { source: poseAtOffset(0), atOffset: poseAtOffset }
}

function gridGuideWalk(guide: Extract<Guide, { type: 'grid' }>, pivot: Point): GuideWalk | null {
  const width = Math.max(0, (Math.max(1, Math.round(guide.columns)) - 1) * Math.abs(guide.spacingX))
  if (width < EPSILON) return null
  const inverse = rotateVector({ x: pivot.x - guide.origin.x, y: pivot.y - guide.origin.y }, -guide.rotation)
  const rows = Math.max(1, Math.round(guide.rows))
  const spacingY = Math.max(EPSILON, Math.abs(guide.spacingY))
  const row = clamp(Math.round(inverse.y / spacingY), 0, rows - 1)
  const localY = (row - (rows - 1) / 2) * spacingY
  const halfWidth = width / 2
  const sourceDistance = clamp(inverse.x + halfWidth, 0, width)

  const poseAtDistance = (distance: number): GuidePose | null => {
    if (distance < -EPSILON || distance > width + EPSILON) return null
    const local = { x: clamp(distance, 0, width) - halfWidth, y: localY }
    const world = rotateVector(local, guide.rotation)
    return {
      point: { x: guide.origin.x + world.x, y: guide.origin.y + world.y },
      tangent: normalizeDegrees(guide.rotation),
      radial: normalizeDegrees(guide.rotation + 90),
    }
  }

  const source = poseAtDistance(sourceDistance)
  if (!source) return null
  return { source, atOffset: (offset) => poseAtDistance(sourceDistance + offset) }
}

function guideWalk(guide: Guide, pivot: Point) {
  if (guide.type === 'arc') return arcGuideWalk(guide, pivot)
  if (guide.type === 'line' || guide.type === 'curve') return continuousPathGuideWalk(guide, pivot)
  if (guide.type === 'radial-grid') return radialGuideWalk(guide, pivot)
  return gridGuideWalk(guide, pivot)
}

function transformedCopy(
  source: StitchElement[],
  pivot: Point,
  targetPivot: Point,
  rotationDelta: number,
  createId: IdFactory,
) {
  const groupIdFor = cloneGroupIdMap(source, createId, true)
  return source.map((element) => {
    const relative = rotateVector({ x: element.x - pivot.x, y: element.y - pivot.y }, rotationDelta)
    return detachedClone(element, createId(), groupIdFor(element), {
      x: targetPivot.x + relative.x,
      y: targetPivot.y + relative.y,
      rotation: normalizeDegrees(element.rotation + rotationDelta),
    })
  })
}

export function repeatSelection(
  elements: StitchElement[],
  ids: string[],
  options: RepeatOptions,
  createId: IdFactory,
) {
  const selected = new Set(ids)
  const source = elements.filter((element) => selected.has(element.id) && !element.parametricRow)
  const pivot = selectionPivot(source, source.map((element) => element.id))
  if (!source.length || !pivot) return []
  const requestedCopies = clamp(Math.round(options.copies), 1, 100)
  const copies = Math.min(requestedCopies, Math.floor(MAX_REPEAT_CREATED_ELEMENTS / source.length))
  if (copies < 1) return []
  const created: StitchElement[] = []

  if (options.mode === 'linear') {
    for (let index = 1; index <= copies; index += 1) {
      created.push(...transformedCopy(
        source,
        pivot,
        { x: pivot.x + options.deltaX * index, y: pivot.y + options.deltaY * index },
        0,
        createId,
      ))
    }
    return created
  }

  if (options.mode === 'circular') {
    const center = options.center ?? pivot
    for (let index = 1; index <= copies; index += 1) {
      const angle = options.angleStep * index
      const targetPivot = rotateAround(pivot, center, angle)
      created.push(...transformedCopy(source, pivot, targetPivot, angle, createId))
    }
    return created
  }

  const walk = guideWalk(options.guide, pivot)
  if (!walk) return []
  const sourceOffset = { x: pivot.x - walk.source.point.x, y: pivot.y - walk.source.point.y }
  const spacing = Math.max(EPSILON, Math.abs(options.spacing))

  for (let index = 1; index <= copies; index += 1) {
    const target = walk.atOffset(spacing * index)
    if (!target) break
    const pathDelta = normalizeDegrees(target.tangent - walk.source.tangent)
    const offset = rotateVector(sourceOffset, pathDelta)
    const targetPivot = { x: target.point.x + offset.x, y: target.point.y + offset.y }
    const rotationDelta = options.orientation === 'keep'
      ? 0
      : options.orientation === 'tangent'
        ? pathDelta
        : normalizeDegrees(target.radial - walk.source.radial)
    created.push(...transformedCopy(source, pivot, targetPivot, rotationDelta, createId))
  }

  return created
}

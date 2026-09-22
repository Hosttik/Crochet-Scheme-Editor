import type {
  Guide,
  Point,
  RowMarker,
  RowMarkerGuideAttachment,
  RowMarkerGuideTrack,
} from '../types'
import { rotatePoint } from './geometry'
import { isPathGuide, nearestPathParameter, pathPoseAt, type PathGuide } from './pathGuides'

type GridGuide = Extract<Guide, { type: 'grid' }>
type RadialGridGuide = Extract<Guide, { type: 'radial-grid' }>

export const DEFAULT_ROW_MARKER_SIZE = 1
export const MIN_ROW_MARKER_SIZE = 0.5
export const MAX_ROW_MARKER_SIZE = 3
export const DEFAULT_ROW_MARKER_LABEL_ANGLE = 0
export const DEFAULT_ROW_MARKER_COLOR = '#c2413b'

const EPSILON = 1e-8

function radians(value: number) {
  return (value * Math.PI) / 180
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

function clampIndex(value: number, count: number) {
  return Math.max(0, Math.min(Math.max(0, count - 1), value))
}

function distanceSquared(left: Point, right: Point) {
  return (left.x - right.x) ** 2 + (left.y - right.y) ** 2
}

function rowMarkerGroupId(marker: RowMarker) {
  return marker.groupId ?? null
}

function sameRowMarkerGroup(marker: RowMarker, groupId: string | null) {
  return rowMarkerGroupId(marker) === groupId
}

export function rowMarkerGroupIds(markers: RowMarker[]) {
  const seen = new Set<string>()
  const result: string[] = []
  for (const marker of markers) {
    if (!marker.groupId || seen.has(marker.groupId)) continue
    seen.add(marker.groupId)
    result.push(marker.groupId)
  }
  return result
}

export function rowMarkerGroupStartsAtZero(markers: RowMarker[], groupId: string | null) {
  return markers.find((marker) => sameRowMarkerGroup(marker, groupId))?.startAtZero === true
}

export function nextRowMarkerNumber(
  markers: RowMarker[],
  groupId: string | null = null,
  startAtZero = rowMarkerGroupStartsAtZero(markers, groupId),
) {
  const start = startAtZero ? 0 : 1
  const used = new Set(
    markers
      .filter((marker) => sameRowMarkerGroup(marker, groupId))
      .map((marker) => Math.round(marker.number))
      .filter((number) => Number.isFinite(number) && number >= start),
  )
  let candidate = start
  while (used.has(candidate)) candidate += 1
  return candidate
}

function closeRowMarkerNumberGap(
  markers: RowMarker[],
  groupId: string | null,
  removedNumber: number,
) {
  return markers.map((marker) =>
    sameRowMarkerGroup(marker, groupId) && marker.number > removedNumber
      ? { ...marker, number: marker.number - 1 }
      : marker,
  )
}

function renumberGroupSequentially(
  markers: RowMarker[],
  groupId: string | null,
  startAtZero: boolean,
) {
  const members = markers
    .map((marker, index) => ({ marker, index }))
    .filter(({ marker }) => sameRowMarkerGroup(marker, groupId))
    .sort((left, right) => left.marker.number - right.marker.number || left.index - right.index)
  const start = startAtZero ? 0 : 1
  const numberById = new Map(members.map(({ marker }, index) => [marker.id, start + index]))
  return markers.map((marker) =>
    sameRowMarkerGroup(marker, groupId)
      ? { ...marker, number: numberById.get(marker.id) ?? marker.number, startAtZero }
      : marker,
  )
}

export function assignRowMarkerToGroup(
  markers: RowMarker[],
  id: string,
  groupId: string | null,
  targetStartAtZero?: boolean,
) {
  const current = markers.find((marker) => marker.id === id)
  if (!current) return markers
  const sourceGroupId = rowMarkerGroupId(current)
  const targetHasMembers = markers.some((marker) =>
    marker.id !== id && sameRowMarkerGroup(marker, groupId),
  )
  const startAtZero = targetStartAtZero
    ?? (targetHasMembers ? rowMarkerGroupStartsAtZero(markers, groupId) : current.startAtZero === true)
  const withoutCurrent = markers.filter((marker) => marker.id !== id)
  const nextNumber = nextRowMarkerNumber(withoutCurrent, groupId, startAtZero)
  if (sourceGroupId === groupId) return markers
  const next = markers.map((marker) =>
    marker.id === id
      ? {
          ...marker,
          groupId: groupId ?? undefined,
          startAtZero,
          number: nextNumber,
        }
      : marker,
  )
  return closeRowMarkerNumberGap(next, sourceGroupId, current.number)
}

export function assignRowMarkersToGroup(
  markers: RowMarker[],
  ids: string[],
  groupId: string | null,
  targetStartAtZero?: boolean,
) {
  const movingIds = ids.filter((id) => {
    const marker = markers.find((item) => item.id === id)
    return marker && rowMarkerGroupId(marker) !== groupId
  })
  if (!movingIds.length) return markers

  const sourceRemoved = new Map<string | null, number[]>()
  for (const id of movingIds) {
    const marker = markers.find((item) => item.id === id)
    if (!marker) continue
    const sourceGroupId = rowMarkerGroupId(marker)
    const numbers = sourceRemoved.get(sourceGroupId) ?? []
    numbers.push(marker.number)
    sourceRemoved.set(sourceGroupId, numbers)
  }

  let next = markers
  for (const [sourceGroupId, numbers] of sourceRemoved) {
    for (const number of numbers.slice().sort((left, right) => right - left)) {
      next = closeRowMarkerNumberGap(next, sourceGroupId, number)
    }
  }

  const movingIdSet = new Set(movingIds)
  const targetHasMembers = next.some((marker) =>
    !movingIdSet.has(marker.id) && sameRowMarkerGroup(marker, groupId),
  )
  const firstMoving = movingIds
    .map((id) => markers.find((marker) => marker.id === id))
    .find((marker): marker is RowMarker => Boolean(marker))
  const startAtZero = targetStartAtZero
    ?? (targetHasMembers
      ? rowMarkerGroupStartsAtZero(next, groupId)
      : firstMoving?.startAtZero === true)

  const targetUsed = new Set(
    next
      .filter((marker) => sameRowMarkerGroup(marker, groupId) && !movingIdSet.has(marker.id))
      .map((marker) => marker.number),
  )
  let candidate = startAtZero ? 0 : 1
  const numberById = new Map<string, number>()
  for (const id of movingIds) {
    while (targetUsed.has(candidate)) candidate += 1
    numberById.set(id, candidate)
    targetUsed.add(candidate)
    candidate += 1
  }

  return next.map((marker) =>
    numberById.has(marker.id)
      ? {
          ...marker,
          groupId: groupId ?? undefined,
          startAtZero,
          number: numberById.get(marker.id) ?? marker.number,
        }
      : marker,
  )
}

export function setRowMarkerGroupStartAtZero(
  markers: RowMarker[],
  id: string,
  startAtZero: boolean,
) {
  const marker = markers.find((item) => item.id === id)
  if (!marker) return markers
  return renumberGroupSequentially(markers, rowMarkerGroupId(marker), startAtZero)
}

export function deleteRowMarkerAndRenumber(markers: RowMarker[], id: string) {
  const removed = markers.find((marker) => marker.id === id)
  if (!removed) return markers
  const groupId = rowMarkerGroupId(removed)
  return closeRowMarkerNumberGap(
    markers.filter((marker) => marker.id !== id),
    groupId,
    removed.number,
  )
}

export function normalizedRowMarkerNumber(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.round(value))
}

export function normalizedRowMarkerSize(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_ROW_MARKER_SIZE
  return Math.min(MAX_ROW_MARKER_SIZE, Math.max(MIN_ROW_MARKER_SIZE, value))
}

export function normalizedRowMarkerLabelAngle(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_ROW_MARKER_LABEL_ANGLE
  return ((value % 360) + 360) % 360
}

export function isRowMarkerColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
}

export function normalizedRowMarkerColor(value: unknown) {
  return isRowMarkerColor(value) ? value.toLowerCase() : DEFAULT_ROW_MARKER_COLOR
}

export function isRowMarkerVisible(marker: RowMarker) {
  return marker.visible !== false
}

export function isRowMarkerLocked(marker: RowMarker) {
  return marker.locked === true
}

export function rowMarkerLabelGeometry(marker: RowMarker) {
  const size = normalizedRowMarkerSize(marker.size)
  const angle = normalizedRowMarkerLabelAngle(marker.labelAngle)
  const angleRadians = radians(angle)
  const cos = Math.cos(angleRadians)
  const sin = Math.sin(angleRadians)
  const dotRadius = 5 * size
  const fontSize = 13 * size
  const gap = 4 * size
  const textWidth = Math.max(1, String(marker.number).length) * fontSize * 0.66
  const halfWidth = textWidth / 2
  const halfHeight = fontSize * 0.525
  const baselineFromCenter = fontSize * 0.275
  const support = Math.abs(cos) * halfWidth + Math.abs(sin) * halfHeight
  const centerDistance = dotRadius + gap + support

  return {
    size,
    angle,
    dotRadius,
    fontSize,
    x: cos * centerDistance,
    y: sin * centerDistance + baselineFromCenter,
    textAnchor: 'middle' as const,
    handleDistance: dotRadius + gap + support * 2 + 8 * size,
  }
}

export function rowMarkerVisualBounds(marker: RowMarker) {
  const label = rowMarkerLabelGeometry(marker)
  const dotLeft = marker.x - label.dotRadius
  const dotRight = marker.x + label.dotRadius
  const dotTop = marker.y - label.dotRadius
  const dotBottom = marker.y + label.dotRadius
  const textWidth = String(marker.number).length * label.fontSize * 0.66
  const textX = marker.x + label.x
  const textY = marker.y + label.y
  const textLeft = textX - textWidth / 2
  const textRight = textX + textWidth / 2
  return {
    left: Math.min(dotLeft, textLeft),
    right: Math.max(dotRight, textRight),
    top: Math.min(dotTop, textY - label.fontSize * 0.8),
    bottom: Math.max(dotBottom, textY + label.fontSize * 0.25),
  }
}

function gridDimensions(guide: GridGuide) {
  const rows = Math.max(1, Math.round(guide.rows))
  const columns = Math.max(1, Math.round(guide.columns))
  return {
    rows,
    columns,
    halfWidth: ((columns - 1) * guide.spacingX) / 2,
    halfHeight: ((rows - 1) * guide.spacingY) / 2,
  }
}

function gridLocalPoint(guide: GridGuide, point: Point) {
  return rotatePoint(
    { x: point.x - guide.origin.x, y: point.y - guide.origin.y },
    -guide.rotation,
  )
}

function gridWorldPoint(guide: GridGuide, point: Point) {
  const rotated = rotatePoint(point, guide.rotation)
  return { x: guide.origin.x + rotated.x, y: guide.origin.y + rotated.y }
}

function normalizedTrackAttachment(
  attachment: RowMarkerGuideAttachment,
  track: RowMarkerGuideTrack,
  trackIndex: number,
): RowMarkerGuideAttachment {
  return {
    ...attachment,
    t: clamp01(attachment.t),
    track,
    trackIndex,
  }
}

function pointFromGridAttachment(
  guide: GridGuide,
  attachment: RowMarkerGuideAttachment,
): { point: Point; attachment: RowMarkerGuideAttachment } | null {
  const { rows, columns, halfWidth, halfHeight } = gridDimensions(guide)
  if (attachment.track === 'row') {
    const row = clampIndex(Math.round(attachment.trackIndex ?? 0), rows)
    const y = (row - (rows - 1) / 2) * guide.spacingY + attachment.normalOffset
    const x = halfWidth < EPSILON ? 0 : -halfWidth + clamp01(attachment.t) * halfWidth * 2
    return {
      point: gridWorldPoint(guide, { x, y }),
      attachment: normalizedTrackAttachment(attachment, 'row', row),
    }
  }
  if (attachment.track === 'column') {
    const column = clampIndex(Math.round(attachment.trackIndex ?? 0), columns)
    const x = (column - (columns - 1) / 2) * guide.spacingX + attachment.normalOffset
    const y = halfHeight < EPSILON ? 0 : -halfHeight + clamp01(attachment.t) * halfHeight * 2
    return {
      point: gridWorldPoint(guide, { x, y }),
      attachment: normalizedTrackAttachment(attachment, 'column', column),
    }
  }
  return null
}

function nearestGridAttachment(guide: GridGuide, point: Point): RowMarkerGuideAttachment {
  const local = gridLocalPoint(guide, point)
  const { rows, columns, halfWidth, halfHeight } = gridDimensions(guide)
  const row = clampIndex(
    Math.round(local.y / Math.max(EPSILON, guide.spacingY) + (rows - 1) / 2),
    rows,
  )
  const column = clampIndex(
    Math.round(local.x / Math.max(EPSILON, guide.spacingX) + (columns - 1) / 2),
    columns,
  )
  const rowY = (row - (rows - 1) / 2) * guide.spacingY
  const columnX = (column - (columns - 1) / 2) * guide.spacingX
  const rowX = Math.max(-halfWidth, Math.min(halfWidth, local.x))
  const columnY = Math.max(-halfHeight, Math.min(halfHeight, local.y))
  const rowPoint = gridWorldPoint(guide, { x: rowX, y: rowY })
  const columnPoint = gridWorldPoint(guide, { x: columnX, y: columnY })

  if (distanceSquared(point, rowPoint) <= distanceSquared(point, columnPoint)) {
    return {
      guideId: guide.id,
      t: halfWidth < EPSILON ? 0.5 : clamp01((rowX + halfWidth) / (halfWidth * 2)),
      normalOffset: 0,
      track: 'row',
      trackIndex: row,
    }
  }
  return {
    guideId: guide.id,
    t: halfHeight < EPSILON ? 0.5 : clamp01((columnY + halfHeight) / (halfHeight * 2)),
    normalOffset: 0,
    track: 'column',
    trackIndex: column,
  }
}

function radialDimensions(guide: RadialGridGuide) {
  return {
    ringCount: Math.max(1, Math.round(guide.ringCount)),
    sectorCount: Math.max(2, Math.round(guide.sectorCount)),
  }
}

function pointFromRadialAttachment(
  guide: RadialGridGuide,
  attachment: RowMarkerGuideAttachment,
): { point: Point; attachment: RowMarkerGuideAttachment } | null {
  const { ringCount, sectorCount } = radialDimensions(guide)
  if (attachment.track === 'ring') {
    const ring = Math.max(1, Math.min(ringCount, Math.round(attachment.trackIndex ?? 1)))
    const angle = clamp01(attachment.t) * Math.PI * 2
    const radius = ring * guide.ringSpacing + attachment.normalOffset
    return {
      point: {
        x: guide.center.x + Math.cos(angle) * radius,
        y: guide.center.y + Math.sin(angle) * radius,
      },
      attachment: normalizedTrackAttachment(attachment, 'ring', ring),
    }
  }
  if (attachment.track === 'sector') {
    const sector = clampIndex(Math.round(attachment.trackIndex ?? 0), sectorCount)
    const angle = radians(guide.startAngle + sector * 360 / sectorCount)
    const maxRadius = ringCount * guide.ringSpacing
    const radius = clamp01(attachment.t) * maxRadius
    const tangent = { x: Math.cos(angle), y: Math.sin(angle) }
    const normal = { x: -tangent.y, y: tangent.x }
    return {
      point: {
        x: guide.center.x + tangent.x * radius + normal.x * attachment.normalOffset,
        y: guide.center.y + tangent.y * radius + normal.y * attachment.normalOffset,
      },
      attachment: normalizedTrackAttachment(attachment, 'sector', sector),
    }
  }
  return null
}

function nearestRadialAttachment(guide: RadialGridGuide, point: Point): RowMarkerGuideAttachment {
  const { ringCount, sectorCount } = radialDimensions(guide)
  const dx = point.x - guide.center.x
  const dy = point.y - guide.center.y
  const radius = Math.hypot(dx, dy)
  const maxRadius = ringCount * guide.ringSpacing

  const ring = Math.max(1, Math.min(ringCount, Math.round(radius / Math.max(EPSILON, guide.ringSpacing))))
  const angle = Math.atan2(dy, dx)
  const normalizedAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
  const ringPoint = {
    x: guide.center.x + Math.cos(angle) * ring * guide.ringSpacing,
    y: guide.center.y + Math.sin(angle) * ring * guide.ringSpacing,
  }
  const ringAttachment: RowMarkerGuideAttachment = {
    guideId: guide.id,
    t: normalizedAngle / (Math.PI * 2),
    normalOffset: 0,
    track: 'ring',
    trackIndex: ring,
  }

  let bestSector = 0
  let bestSectorT = 0
  let bestSectorPoint = guide.center
  let bestSectorDistance = Number.POSITIVE_INFINITY
  for (let sector = 0; sector < sectorCount; sector += 1) {
    const sectorAngle = radians(guide.startAngle + sector * 360 / sectorCount)
    const direction = { x: Math.cos(sectorAngle), y: Math.sin(sectorAngle) }
    const projected = maxRadius < EPSILON ? 0 : clamp01((dx * direction.x + dy * direction.y) / maxRadius)
    const candidate = {
      x: guide.center.x + direction.x * projected * maxRadius,
      y: guide.center.y + direction.y * projected * maxRadius,
    }
    const candidateDistance = distanceSquared(point, candidate)
    if (candidateDistance < bestSectorDistance) {
      bestSectorDistance = candidateDistance
      bestSector = sector
      bestSectorT = projected
      bestSectorPoint = candidate
    }
  }

  if (distanceSquared(point, ringPoint) <= distanceSquared(point, bestSectorPoint)) {
    return ringAttachment
  }
  return {
    guideId: guide.id,
    t: bestSectorT,
    normalOffset: 0,
    track: 'sector',
    trackIndex: bestSector,
  }
}

function markerFromAttachment(
  marker: RowMarker,
  guide: Guide,
  attachment: RowMarkerGuideAttachment,
): RowMarker | null {
  if (isPathGuide(guide) && attachment.track === undefined) {
    const pose = pathPoseAt(guide, attachment.t)
    const normalAngle = radians(pose.tangent + 90)
    return {
      ...marker,
      x: pose.point.x + Math.cos(normalAngle) * attachment.normalOffset,
      y: pose.point.y + Math.sin(normalAngle) * attachment.normalOffset,
      guideAttachment: { ...attachment, t: clamp01(attachment.t) },
    }
  }

  const resolved = guide.type === 'grid'
    ? pointFromGridAttachment(guide, attachment)
    : guide.type === 'radial-grid'
      ? pointFromRadialAttachment(guide, attachment)
      : null
  if (!resolved) return null
  return {
    ...marker,
    ...resolved.point,
    guideAttachment: resolved.attachment,
  }
}

export function attachRowMarkerToDefaultGuide(
  marker: RowMarker,
  guides: Guide[],
  guideId: string | null,
): RowMarker {
  if (!guideId) return marker
  const guide = guides.find((candidate) => candidate.id === guideId)
  return guide ? attachRowMarkerToGuide(marker, guide) : marker
}

export function attachRowMarkerToGuide(marker: RowMarker, guide: Guide): RowMarker {
  let attachment: RowMarkerGuideAttachment
  if (isPathGuide(guide)) {
    attachment = {
      guideId: guide.id,
      t: nearestPathParameter(guide, marker),
      normalOffset: 0,
    }
  } else if (guide.type === 'grid') {
    attachment = nearestGridAttachment(guide, marker)
  } else {
    attachment = nearestRadialAttachment(guide, marker)
  }
  return markerFromAttachment(marker, guide, attachment) ?? marker
}

export function moveAttachedRowMarker(marker: RowMarker, guide: Guide, target: Point): RowMarker {
  const attachment = marker.guideAttachment
  if (!attachment || attachment.guideId !== guide.id) return { ...marker, x: target.x, y: target.y }

  let nextAttachment = attachment
  if (isPathGuide(guide) && attachment.track === undefined) {
    nextAttachment = { ...attachment, t: nearestPathParameter(guide, target) }
  } else if (guide.type === 'grid' && (attachment.track === 'row' || attachment.track === 'column')) {
    const local = gridLocalPoint(guide, target)
    const { halfWidth, halfHeight } = gridDimensions(guide)
    nextAttachment = {
      ...attachment,
      t: attachment.track === 'row'
        ? halfWidth < EPSILON ? 0.5 : clamp01((local.x + halfWidth) / (halfWidth * 2))
        : halfHeight < EPSILON ? 0.5 : clamp01((local.y + halfHeight) / (halfHeight * 2)),
    }
  } else if (guide.type === 'radial-grid' && attachment.track === 'ring') {
    const angle = Math.atan2(target.y - guide.center.y, target.x - guide.center.x)
    const normalized = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
    nextAttachment = { ...attachment, t: normalized / (Math.PI * 2) }
  } else if (guide.type === 'radial-grid' && attachment.track === 'sector') {
    const { ringCount, sectorCount } = radialDimensions(guide)
    const sector = clampIndex(Math.round(attachment.trackIndex ?? 0), sectorCount)
    const angle = radians(guide.startAngle + sector * 360 / sectorCount)
    const direction = { x: Math.cos(angle), y: Math.sin(angle) }
    const maxRadius = ringCount * guide.ringSpacing
    const dx = target.x - guide.center.x
    const dy = target.y - guide.center.y
    nextAttachment = {
      ...attachment,
      t: maxRadius < EPSILON ? 0 : clamp01((dx * direction.x + dy * direction.y) / maxRadius),
    }
  } else {
    return attachRowMarkerToGuide(marker, guide)
  }

  return markerFromAttachment(marker, guide, nextAttachment) ?? marker
}

export function detachRowMarkerFromGuide(marker: RowMarker): RowMarker {
  if (!marker.guideAttachment) return marker
  return { ...marker, guideAttachment: undefined }
}

export function reconcileRowMarkerAttachments(markers: RowMarker[], guides: Guide[]) {
  const byId = new Map(guides.map((guide) => [guide.id, guide] as const))
  return markers.map((marker) => {
    const attachment = marker.guideAttachment
    if (!attachment) return marker
    const guide = byId.get(attachment.guideId)
    if (!guide) return detachRowMarkerFromGuide(marker)
    return markerFromAttachment(marker, guide, attachment) ?? detachRowMarkerFromGuide(marker)
  })
}

export function remapRowMarkerAttachmentsForReversedGuide(
  markers: RowMarker[],
  reversedGuide: PathGuide,
) {
  return markers.map((marker) => {
    const attachment = marker.guideAttachment
    if (!attachment || attachment.guideId !== reversedGuide.id || attachment.track !== undefined) return marker
    return markerFromAttachment(marker, reversedGuide, {
      ...attachment,
      t: 1 - attachment.t,
      normalOffset: -attachment.normalOffset,
    }) ?? marker
  })
}

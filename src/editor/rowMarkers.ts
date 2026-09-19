import type { Guide, Point, RowMarker, RowMarkerGuideAttachment } from '../types'
import { isPathGuide, nearestPathParameter, pathPoseAt, type PathGuide } from './pathGuides'

export const DEFAULT_ROW_MARKER_SIZE = 1
export const MIN_ROW_MARKER_SIZE = 0.5
export const MAX_ROW_MARKER_SIZE = 3
export const DEFAULT_ROW_MARKER_LABEL_ANGLE = 0
export const DEFAULT_ROW_MARKER_COLOR = '#c2413b'

function radians(value: number) {
  return (value * Math.PI) / 180
}

export function nextRowMarkerNumber(markers: RowMarker[]) {
  const used = new Set(
    markers
      .map((marker) => Math.round(marker.number))
      .filter((number) => Number.isFinite(number) && number > 0),
  )
  let candidate = 1
  while (used.has(candidate)) candidate += 1
  return candidate
}

export function deleteRowMarkerAndRenumber(markers: RowMarker[], id: string) {
  const removed = markers.find((marker) => marker.id === id)
  if (!removed) return markers
  return markers
    .filter((marker) => marker.id !== id)
    .map((marker) =>
      marker.number > removed.number ? { ...marker, number: marker.number - 1 } : marker,
    )
}

export function normalizedRowMarkerNumber(value: number) {
  if (!Number.isFinite(value)) return 1
  return Math.max(1, Math.round(value))
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
  const distance = 10 * size
  return {
    size,
    angle,
    dotRadius: 5 * size,
    fontSize: 13 * size,
    x: cos * distance,
    y: sin * distance + 4 * size,
    textAnchor: cos > 0.35 ? 'start' as const : cos < -0.35 ? 'end' as const : 'middle' as const,
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
  const textLeft = label.textAnchor === 'start'
    ? textX
    : label.textAnchor === 'end'
      ? textX - textWidth
      : textX - textWidth / 2
  const textRight = label.textAnchor === 'start'
    ? textX + textWidth
    : label.textAnchor === 'end'
      ? textX
      : textX + textWidth / 2
  return {
    left: Math.min(dotLeft, textLeft),
    right: Math.max(dotRight, textRight),
    top: Math.min(dotTop, textY - label.fontSize * 0.8),
    bottom: Math.max(dotBottom, textY + label.fontSize * 0.25),
  }
}

function markerFromAttachment(
  marker: RowMarker,
  guide: PathGuide,
  attachment: RowMarkerGuideAttachment,
): RowMarker {
  const pose = pathPoseAt(guide, attachment.t)
  const normalAngle = radians(pose.tangent + 90)
  return {
    ...marker,
    x: pose.point.x + Math.cos(normalAngle) * attachment.normalOffset,
    y: pose.point.y + Math.sin(normalAngle) * attachment.normalOffset,
    guideAttachment: attachment,
  }
}

export function attachRowMarkerToGuide(marker: RowMarker, guide: PathGuide): RowMarker {
  const t = nearestPathParameter(guide, marker)
  return markerFromAttachment(marker, guide, {
    guideId: guide.id,
    t,
    normalOffset: 0,
  })
}

export function moveAttachedRowMarker(marker: RowMarker, guide: PathGuide, target: Point): RowMarker {
  const attachment = marker.guideAttachment
  if (!attachment || attachment.guideId !== guide.id) return { ...marker, x: target.x, y: target.y }
  const t = nearestPathParameter(guide, target)
  return markerFromAttachment(marker, guide, { ...attachment, t })
}

export function detachRowMarkerFromGuide(marker: RowMarker): RowMarker {
  if (!marker.guideAttachment) return marker
  return { ...marker, guideAttachment: undefined }
}

export function reconcileRowMarkerAttachments(markers: RowMarker[], guides: Guide[]) {
  const byId = new Map(guides.filter(isPathGuide).map((guide) => [guide.id, guide] as const))
  return markers.map((marker) => {
    const attachment = marker.guideAttachment
    if (!attachment) return marker
    const guide = byId.get(attachment.guideId)
    if (!guide) return detachRowMarkerFromGuide(marker)
    return markerFromAttachment(marker, guide, attachment)
  })
}

export function remapRowMarkerAttachmentsForReversedGuide(
  markers: RowMarker[],
  reversedGuide: PathGuide,
) {
  return markers.map((marker) => {
    const attachment = marker.guideAttachment
    if (!attachment || attachment.guideId !== reversedGuide.id) return marker
    return markerFromAttachment(marker, reversedGuide, {
      ...attachment,
      t: 1 - attachment.t,
      normalOffset: -attachment.normalOffset,
    })
  })
}

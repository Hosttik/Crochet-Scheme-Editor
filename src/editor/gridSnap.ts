import type { Guide, Point } from '../types'
import { distance, rotatePoint } from './geometry'
import type { SnapCandidate } from './snapping'

type GridGuide = Extract<Guide, { type: 'grid' }>
type RadialGridGuide = Extract<Guide, { type: 'radial-grid' }>

function clampIndex(value: number, count: number) {
  return Math.max(0, Math.min(count - 1, value))
}

function gridCandidateAt(guide: GridGuide, row: number, column: number): SnapCandidate {
  const rows = Math.max(1, Math.round(guide.rows))
  const columns = Math.max(1, Math.round(guide.columns))
  const local = {
    x: (column - (columns - 1) / 2) * guide.spacingX,
    y: (row - (rows - 1) / 2) * guide.spacingY,
  }
  const rotated = rotatePoint(local, guide.rotation)
  return {
    key: `${guide.id}:grid:${row}:${column}`,
    point: { x: guide.origin.x + rotated.x, y: guide.origin.y + rotated.y },
    targetId: guide.id,
    targetType: 'guide',
    targetRotation: guide.rotation,
    guideType: guide.type,
  }
}

function nearestGridCandidate(guide: GridGuide, point: Point): SnapCandidate | null {
  if (guide.spacingX <= 0 || guide.spacingY <= 0) return null
  const rows = Math.max(1, Math.round(guide.rows))
  const columns = Math.max(1, Math.round(guide.columns))
  const local = rotatePoint(
    { x: point.x - guide.origin.x, y: point.y - guide.origin.y },
    -guide.rotation,
  )
  const row = clampIndex(Math.round(local.y / guide.spacingY + (rows - 1) / 2), rows)
  const column = clampIndex(Math.round(local.x / guide.spacingX + (columns - 1) / 2), columns)
  return gridCandidateAt(guide, row, column)
}

function lockedGridCandidate(guide: GridGuide, lockedKey: string | null): SnapCandidate | null {
  if (!lockedKey) return null
  const prefix = `${guide.id}:grid:`
  if (!lockedKey.startsWith(prefix)) return null
  const [rowText, columnText] = lockedKey.slice(prefix.length).split(':')
  const row = Number(rowText)
  const column = Number(columnText)
  const rows = Math.max(1, Math.round(guide.rows))
  const columns = Math.max(1, Math.round(guide.columns))
  if (!Number.isInteger(row) || !Number.isInteger(column)) return null
  if (row < 0 || row >= rows || column < 0 || column >= columns) return null
  return gridCandidateAt(guide, row, column)
}

function radialCandidateAt(guide: RadialGridGuide, ring: number, sector: number): SnapCandidate {
  if (ring === 0) {
    return {
      key: `${guide.id}:radial:center`,
      point: guide.center,
      targetId: guide.id,
      targetType: 'guide',
      targetRotation: guide.startAngle,
      guideType: guide.type,
    }
  }
  const sectorCount = Math.max(2, Math.round(guide.sectorCount))
  const angle = guide.startAngle + (sector * 360) / sectorCount
  const radians = (angle * Math.PI) / 180
  const radius = ring * guide.ringSpacing
  return {
    key: `${guide.id}:radial:${ring}:${sector}`,
    point: {
      x: guide.center.x + Math.cos(radians) * radius,
      y: guide.center.y + Math.sin(radians) * radius,
    },
    targetId: guide.id,
    targetType: 'guide',
    targetRotation: angle + 90,
    guideType: guide.type,
  }
}

function nearestRadialCandidate(guide: RadialGridGuide, point: Point): SnapCandidate {
  const center = radialCandidateAt(guide, 0, 0)
  if (guide.ringSpacing <= 0) return center
  const ringCount = Math.max(1, Math.round(guide.ringCount))
  const sectorCount = Math.max(2, Math.round(guide.sectorCount))
  const dx = point.x - guide.center.x
  const dy = point.y - guide.center.y
  const radius = Math.hypot(dx, dy)
  const ring = Math.max(1, Math.min(ringCount, Math.round(radius / guide.ringSpacing)))
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI
  const sectorSize = 360 / sectorCount
  const normalized = ((angle - guide.startAngle) % 360 + 360) % 360
  const sector = Math.round(normalized / sectorSize) % sectorCount
  const intersection = radialCandidateAt(guide, ring, sector)
  return distance(point, center.point) <= distance(point, intersection.point) ? center : intersection
}

function lockedRadialCandidate(guide: RadialGridGuide, lockedKey: string | null): SnapCandidate | null {
  if (!lockedKey) return null
  if (lockedKey === `${guide.id}:radial:center`) return radialCandidateAt(guide, 0, 0)
  const prefix = `${guide.id}:radial:`
  if (!lockedKey.startsWith(prefix)) return null
  const [ringText, sectorText] = lockedKey.slice(prefix.length).split(':')
  const ring = Number(ringText)
  const sector = Number(sectorText)
  const ringCount = Math.max(1, Math.round(guide.ringCount))
  const sectorCount = Math.max(2, Math.round(guide.sectorCount))
  if (!Number.isInteger(ring) || !Number.isInteger(sector)) return null
  if (ring < 1 || ring > ringCount || sector < 0 || sector >= sectorCount) return null
  return radialCandidateAt(guide, ring, sector)
}

export function buildNearestDiscreteGuideCandidates(
  guides: Guide[],
  point: Point,
  lockedKey: string | null,
): SnapCandidate[] {
  const candidates: SnapCandidate[] = []
  for (const guide of guides) {
    if (!guide.visible) continue
    const nearest = guide.type === 'grid'
      ? nearestGridCandidate(guide, point)
      : guide.type === 'radial-grid'
        ? nearestRadialCandidate(guide, point)
        : null
    const locked = guide.type === 'grid'
      ? lockedGridCandidate(guide, lockedKey)
      : guide.type === 'radial-grid'
        ? lockedRadialCandidate(guide, lockedKey)
        : null
    if (nearest) candidates.push(nearest)
    if (locked && locked.key !== nearest?.key) candidates.push(locked)
  }
  return candidates
}

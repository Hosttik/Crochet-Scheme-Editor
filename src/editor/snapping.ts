import { SYMBOL_BY_ID } from '../symbols'
import type {
  AnchorName,
  Guide,
  OrientationMode,
  Point,
  SnappingSettings,
  StitchElement,
  Viewport,
} from '../types'
import { distance, rotatePoint } from './geometry'
import { buildGuideSnapPoints } from './guides'

export const RELEASE_TOLERANCE_PX = 18

export type SnapCandidate = {
  key: string
  point: Point
  targetId: string
  targetType: 'stitch' | 'guide'
  targetAnchor?: AnchorName
  targetRotation: number
}

export type SnapResult = {
  x: number
  y: number
  rotation: number
  candidate: SnapCandidate | null
}

export function anchorWorldPosition(element: StitchElement, anchorName: AnchorName): Point {
  const definition = SYMBOL_BY_ID.get(element.symbolId)
  if (!definition) return { x: element.x, y: element.y }

  const local = rotatePoint(definition.anchors[anchorName], element.rotation)
  return {
    x: element.x + local.x,
    y: element.y + local.y,
  }
}

export function buildElementSnapCandidates(
  elements: StitchElement[],
  excludedId: string | null,
  snapToVertices: boolean,
): SnapCandidate[] {
  const anchors: AnchorName[] = snapToVertices ? ['top', 'center', 'bottom'] : ['center']

  return elements.flatMap((element) => {
    if (element.id === excludedId) return []

    return anchors.map((anchor) => ({
      key: `${element.id}:${anchor}`,
      point: anchorWorldPosition(element, anchor),
      targetId: element.id,
      targetType: 'stitch' as const,
      targetAnchor: anchor,
      targetRotation: element.rotation,
    }))
  })
}

export function buildSnapCandidates(
  elements: StitchElement[],
  guides: Guide[],
  excludedId: string | null,
  snapToVertices: boolean,
): SnapCandidate[] {
  const elementCandidates = buildElementSnapCandidates(
    elements,
    excludedId,
    snapToVertices,
  )
  const guideCandidates = buildGuideSnapPoints(guides).map((candidate) => ({
    key: candidate.key,
    point: candidate.point,
    targetId: candidate.guideId,
    targetType: 'guide' as const,
    targetRotation: candidate.targetRotation,
  }))

  return [...elementCandidates, ...guideCandidates]
}

export function orientationFromCandidate(
  mode: OrientationMode,
  currentRotation: number,
  candidate: SnapCandidate,
) {
  if (mode === 'along') return candidate.targetRotation
  if (mode === 'perpendicular') return candidate.targetRotation + 90
  return currentRotation
}

export function solveSnap(
  proposed: StitchElement,
  elements: StitchElement[],
  guides: Guide[],
  settings: SnappingSettings,
  viewport: Viewport,
  lockedKey: string | null,
): SnapResult {
  if (!settings.enabled) {
    return {
      x: proposed.x,
      y: proposed.y,
      rotation: proposed.rotation,
      candidate: null,
    }
  }

  const candidates = buildSnapCandidates(
    elements,
    guides,
    proposed.id,
    settings.snapToVertices,
  )
  if (!candidates.length) {
    return {
      x: proposed.x,
      y: proposed.y,
      rotation: proposed.rotation,
      candidate: null,
    }
  }

  const sourcePosition = anchorWorldPosition(proposed, settings.sourceAnchor)
  const locked = lockedKey
    ? candidates.find((candidate) => candidate.key === lockedKey)
    : undefined

  let winner: SnapCandidate | undefined

  if (
    locked &&
    distance(sourcePosition, locked.point) * viewport.zoom <= RELEASE_TOLERANCE_PX
  ) {
    winner = locked
  } else {
    winner = candidates
      .map((candidate) => ({
        candidate,
        distancePx: distance(sourcePosition, candidate.point) * viewport.zoom,
      }))
      .filter(({ distancePx }) => distancePx <= settings.tolerancePx)
      .sort((a, b) => a.distancePx - b.distancePx)[0]?.candidate
  }

  if (!winner) {
    return {
      x: proposed.x,
      y: proposed.y,
      rotation: proposed.rotation,
      candidate: null,
    }
  }

  const rotation = orientationFromCandidate(
    settings.orientationMode,
    proposed.rotation,
    winner,
  )
  const definition = SYMBOL_BY_ID.get(proposed.symbolId)

  if (!definition) {
    return {
      x: winner.point.x,
      y: winner.point.y,
      rotation,
      candidate: winner,
    }
  }

  const rotatedAnchor = rotatePoint(definition.anchors[settings.sourceAnchor], rotation)

  return {
    x: winner.point.x - rotatedAnchor.x,
    y: winner.point.y - rotatedAnchor.y,
    rotation,
    candidate: winner,
  }
}

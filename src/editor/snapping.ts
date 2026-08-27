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
import { isPathGuide, nearestPathParameter, pathPoseAt } from './pathGuides'

export const RELEASE_TOLERANCE_PX = 18

const CENTER_ON_GUIDE_SYMBOL_IDS = new Set(['chain', 'slip', 'magic-ring'])

export type SnapCandidate = {
  key: string
  point: Point
  targetId: string
  targetType: 'stitch' | 'guide'
  targetAnchor?: AnchorName
  targetRotation: number
  guideType?: Guide['type']
  pathT?: number
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
    guideType: candidate.guideType,
    pathT: candidate.pathT,
  }))

  return [...elementCandidates, ...guideCandidates]
}

function buildContinuousGuideCandidates(guides: Guide[], point: Point): SnapCandidate[] {
  return guides.flatMap((guide) => {
    if (!guide.visible || !isPathGuide(guide)) return []
    const pathT = nearestPathParameter(guide, point)
    const pose = pathPoseAt(guide, pathT)
    return [{
      key: `${guide.id}:${guide.type}:nearest`,
      point: pose.point,
      targetId: guide.id,
      targetType: 'guide' as const,
      targetRotation: pose.tangent,
      guideType: guide.type,
      pathT,
    }]
  })
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

  const elementCandidates = buildElementSnapCandidates(
    elements,
    proposed.id,
    settings.snapToVertices,
  )
  const discreteGuideCandidates = buildGuideSnapPoints(
    guides.filter((guide) => !isPathGuide(guide)),
  ).map((candidate) => ({
    key: candidate.key,
    point: candidate.point,
    targetId: candidate.guideId,
    targetType: 'guide' as const,
    targetRotation: candidate.targetRotation,
    guideType: candidate.guideType,
    pathT: candidate.pathT,
  }))
  const continuousGuideCandidates = buildContinuousGuideCandidates(guides, {
    x: proposed.x,
    y: proposed.y,
  })
  const candidates = [
    ...elementCandidates,
    ...discreteGuideCandidates,
    ...continuousGuideCandidates,
  ]

  if (!candidates.length) {
    return {
      x: proposed.x,
      y: proposed.y,
      rotation: proposed.rotation,
      candidate: null,
    }
  }

  const sourcePosition = anchorWorldPosition(proposed, settings.sourceAnchor)
  const placementReference = { x: proposed.x, y: proposed.y }
  const detectionPoint = (candidate: SnapCandidate) =>
    candidate.targetType === 'guide' ? placementReference : sourcePosition
  const locked = lockedKey
    ? candidates.find((candidate) => candidate.key === lockedKey)
    : undefined

  let winner: SnapCandidate | undefined

  if (
    locked &&
    distance(detectionPoint(locked), locked.point) * viewport.zoom <= RELEASE_TOLERANCE_PX
  ) {
    winner = locked
  } else {
    let bestDistance = Number.POSITIVE_INFINITY
    for (const candidate of candidates) {
      const distancePx = distance(detectionPoint(candidate), candidate.point) * viewport.zoom
      if (distancePx <= settings.tolerancePx && distancePx < bestDistance) {
        bestDistance = distancePx
        winner = candidate
      }
    }
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

  const sourceAnchor = winner.targetType === 'guide' && CENTER_ON_GUIDE_SYMBOL_IDS.has(proposed.symbolId)
    ? 'center'
    : settings.sourceAnchor
  const rotatedAnchor = rotatePoint(definition.anchors[sourceAnchor], rotation)

  return {
    x: winner.point.x - rotatedAnchor.x,
    y: winner.point.y - rotatedAnchor.y,
    rotation,
    candidate: winner,
  }
}

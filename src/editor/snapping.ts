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
import { stitchLocalAnchor } from './stitchGeometry'

export const RELEASE_TOLERANCE_PX = 18
export const GUIDE_ACQUIRE_TOLERANCE_PX = 24
export const GUIDE_RELEASE_TOLERANCE_PX = 30

const CENTER_ON_GUIDE_SYMBOL_IDS = new Set(['chain', 'slip', 'magic-ring', 'single'])

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
  const local = rotatePoint(stitchLocalAnchor(element, anchorName), element.rotation)
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
  const guideCandidates = [
    ...discreteGuideCandidates,
    ...continuousGuideCandidates,
  ]
  const candidates = [
    ...elementCandidates,
    ...guideCandidates,
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

  // Placement previews are independent authoring decisions. Do not let the
  // previous insertion's hysteresis lock bias the next cursor position.
  const locked = proposed.id !== '__preview__' && lockedKey
    ? candidates.find((candidate) => candidate.key === lockedKey)
    : undefined

  let winner: SnapCandidate | undefined

  if (locked) {
    const releaseTolerancePx = locked.targetType === 'guide'
      ? Math.max(GUIDE_RELEASE_TOLERANCE_PX, settings.tolerancePx + 6)
      : RELEASE_TOLERANCE_PX
    if (distance(detectionPoint(locked), locked.point) * viewport.zoom <= releaseTolerancePx) {
      winner = locked
    }
  }

  if (!winner) {
    const nearestWithin = (pool: SnapCandidate[], tolerancePx: number) => {
      let best: SnapCandidate | undefined
      let bestDistance = Number.POSITIVE_INFINITY
      for (const candidate of pool) {
        const distancePx = distance(detectionPoint(candidate), candidate.point) * viewport.zoom
        if (distancePx <= tolerancePx && distancePx < bestDistance) {
          bestDistance = distancePx
          best = candidate
        }
      }
      return best
    }

    // Crochet authoring is guide-first. A 24px screen-space corridor is forgiving
    // enough to hit with a mouse/trackpad while still requiring clear intent.
    winner = nearestWithin(
      guideCandidates,
      Math.max(settings.tolerancePx, GUIDE_ACQUIRE_TOLERANCE_PX),
    ) ?? nearestWithin(elementCandidates, settings.tolerancePx)
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
  const sourceAnchor = winner.targetType === 'guide' && CENTER_ON_GUIDE_SYMBOL_IDS.has(proposed.symbolId)
    ? 'center'
    : settings.sourceAnchor
  const rotatedAnchor = rotatePoint(stitchLocalAnchor(proposed, sourceAnchor), rotation)

  return {
    x: winner.point.x - rotatedAnchor.x,
    y: winner.point.y - rotatedAnchor.y,
    rotation,
    candidate: winner,
  }
}

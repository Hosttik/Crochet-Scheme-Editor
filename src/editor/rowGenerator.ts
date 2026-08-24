import type { ArcGuide, Guide, RadialGridGuide, StitchElement } from '../types'

export type RowDistributionMode = 'count' | 'spacing'
export type RowOrientation = 'tangent' | 'radial' | 'fixed'

export type GuideRowOptions = {
  distributionMode: RowDistributionMode
  count: number
  spacing: number
  orientation: RowOrientation
  rotationOffset: number
  radialOffset: number
  ringIndex: number
}

export type RowPlacement = {
  x: number
  y: number
  rotation: number
  angle: number
}

export type RowElementIdFactory = (placement: RowPlacement, index: number) => string

const MAX_STITCHES = 500
const EPSILON = 1e-6

function clampCount(value: number) {
  return Math.max(1, Math.min(MAX_STITCHES, Math.round(value)))
}

function safeSpacing(value: number) {
  return Math.max(1, Math.abs(value))
}

function polar(center: { x: number; y: number }, radius: number, angle: number) {
  const radians = (angle * Math.PI) / 180
  return {
    x: center.x + Math.cos(radians) * radius,
    y: center.y + Math.sin(radians) * radius,
  }
}

function arcRadius(guide: ArcGuide, options: GuideRowOptions) {
  return Math.max(0.1, guide.radius + options.radialOffset)
}

function radialRadius(guide: RadialGridGuide, options: GuideRowOptions) {
  const ring = Math.max(1, Math.min(Math.round(guide.ringCount), Math.round(options.ringIndex)))
  return Math.max(0.1, ring * guide.ringSpacing + options.radialOffset)
}

function isClosedArc(guide: ArcGuide) {
  return Math.abs(Math.abs(guide.endAngle - guide.startAngle) - 360) < EPSILON
}

export function resolveGuideRowCount(guide: Guide, options: GuideRowOptions) {
  if (guide.type === 'grid') return 0
  if (options.distributionMode === 'count') return clampCount(options.count)

  const spacing = safeSpacing(options.spacing)
  if (guide.type === 'arc') {
    const sweep = Math.abs(guide.endAngle - guide.startAngle)
    const length = (sweep * Math.PI * arcRadius(guide, options)) / 180
    if (length < EPSILON) return 1
    return clampCount(isClosedArc(guide) ? Math.round(length / spacing) : Math.round(length / spacing) + 1)
  }

  const circumference = 2 * Math.PI * radialRadius(guide, options)
  return clampCount(Math.round(circumference / spacing))
}

function orientationRotation(
  orientation: RowOrientation,
  angle: number,
  tangentRotation: number,
  offset: number,
) {
  const base = orientation === 'tangent' ? tangentRotation : orientation === 'radial' ? angle : 0
  return base + offset
}

function arcPlacements(guide: ArcGuide, options: GuideRowOptions): RowPlacement[] {
  const count = resolveGuideRowCount(guide, options)
  const sweep = guide.endAngle - guide.startAngle
  const closed = isClosedArc(guide)
  const radius = arcRadius(guide, options)

  return Array.from({ length: count }, (_, index) => {
    const fraction = closed
      ? index / count
      : count === 1
        ? 0.5
        : index / (count - 1)
    const angle = guide.startAngle + sweep * fraction
    const point = polar(guide.center, radius, angle)
    const tangentRotation = angle + (sweep < 0 ? -90 : 90)
    return {
      ...point,
      angle,
      rotation: orientationRotation(
        options.orientation,
        angle,
        tangentRotation,
        options.rotationOffset,
      ),
    }
  })
}

function radialPlacements(guide: RadialGridGuide, options: GuideRowOptions): RowPlacement[] {
  const count = resolveGuideRowCount(guide, options)
  const radius = radialRadius(guide, options)

  return Array.from({ length: count }, (_, index) => {
    const angle = guide.startAngle + (index * 360) / count
    const point = polar(guide.center, radius, angle)
    return {
      ...point,
      angle,
      rotation: orientationRotation(
        options.orientation,
        angle,
        angle + 90,
        options.rotationOffset,
      ),
    }
  })
}

export function generateGuideRowPlacements(
  guide: Guide,
  options: GuideRowOptions,
): RowPlacement[] {
  if (guide.type === 'arc') return arcPlacements(guide, options)
  if (guide.type === 'radial-grid') return radialPlacements(guide, options)
  return []
}

export function rowPlacementsToElements(
  placements: RowPlacement[],
  symbolId: string,
  idFactory: RowElementIdFactory,
): StitchElement[] {
  return placements.map((placement, index) => ({
    id: idFactory(placement, index),
    symbolId,
    x: placement.x,
    y: placement.y,
    rotation: placement.rotation,
    visible: true,
    locked: false,
  }))
}

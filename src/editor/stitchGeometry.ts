import { SYMBOL_BY_ID } from '../symbols'
import type { AnchorName, Point, StitchElement, StitchGeometry } from '../types'

export const MIN_STITCH_SCALE = 0.35
export const MAX_STITCH_SCALE = 3
export const MIN_STITCH_SPREAD = 0.45
export const MAX_STITCH_SPREAD = 2.5

const SPREAD_SYMBOL_IDS = new Set([
  'single-2-in-1',
  'single-3-in-1',
  'half-double-2-in-1',
  'half-double-3-in-1',
  'double-2-in-1',
  'double-3-in-1',
  'double-4-in-1',
  'double-5-shell',
])

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function radians(value: number) {
  return value * Math.PI / 180
}

export function supportsSemanticSpread(symbolId: string) {
  return SPREAD_SYMBOL_IDS.has(symbolId)
}

export function resolvedStitchGeometry(element: Pick<StitchElement, 'symbolId' | 'geometry'>): Required<StitchGeometry> {
  const scaleX = Number.isFinite(element.geometry?.scaleX)
    ? clamp(element.geometry!.scaleX!, MIN_STITCH_SCALE, MAX_STITCH_SCALE)
    : 1
  const scaleY = Number.isFinite(element.geometry?.scaleY)
    ? clamp(element.geometry!.scaleY!, MIN_STITCH_SCALE, MAX_STITCH_SCALE)
    : 1
  const spread = supportsSemanticSpread(element.symbolId) && Number.isFinite(element.geometry?.spread)
    ? clamp(element.geometry!.spread!, MIN_STITCH_SPREAD, MAX_STITCH_SPREAD)
    : 1
  return { scaleX, scaleY, spread }
}

export function normalizedStitchGeometry(
  symbolId: string,
  geometry: StitchGeometry,
): StitchGeometry | undefined {
  const resolved = resolvedStitchGeometry({ symbolId, geometry })
  const result: StitchGeometry = {}
  if (Math.abs(resolved.scaleX - 1) > 1e-6) result.scaleX = resolved.scaleX
  if (Math.abs(resolved.scaleY - 1) > 1e-6) result.scaleY = resolved.scaleY
  if (supportsSemanticSpread(symbolId) && Math.abs(resolved.spread - 1) > 1e-6) result.spread = resolved.spread
  return Object.keys(result).length ? result : undefined
}

export function stitchVisualSize(element: Pick<StitchElement, 'symbolId' | 'geometry'>) {
  const definition = SYMBOL_BY_ID.get(element.symbolId)
  const baseWidth = definition?.width ?? 30
  const baseHeight = definition?.height ?? 30
  const geometry = resolvedStitchGeometry(element)
  return {
    width: baseWidth * geometry.scaleX * geometry.spread,
    height: baseHeight * geometry.scaleY,
  }
}

export type StitchVisualBounds = {
  left: number
  top: number
  right: number
  bottom: number
}

export function stitchVisualHalfExtentAlongAngle(
  element: Pick<StitchElement, 'symbolId' | 'geometry' | 'rotation'>,
  axisAngle: number,
) {
  const size = stitchVisualSize(element)
  const relative = radians(element.rotation - axisAngle)
  return Math.abs(Math.cos(relative)) * size.width / 2 + Math.abs(Math.sin(relative)) * size.height / 2
}

export function stitchVisualAabb(
  element: Pick<StitchElement, 'symbolId' | 'geometry' | 'rotation' | 'x' | 'y'>,
): StitchVisualBounds {
  const halfX = stitchVisualHalfExtentAlongAngle(element, 0)
  const halfY = stitchVisualHalfExtentAlongAngle(element, 90)
  return {
    left: element.x - halfX,
    top: element.y - halfY,
    right: element.x + halfX,
    bottom: element.y + halfY,
  }
}

export function stitchVisualProjectionInterval(
  element: Pick<StitchElement, 'symbolId' | 'geometry' | 'rotation' | 'x' | 'y'>,
  origin: Point,
  axisAngle: number,
) {
  const angle = radians(axisAngle)
  const axisX = Math.cos(angle)
  const axisY = Math.sin(angle)
  const center = (element.x - origin.x) * axisX + (element.y - origin.y) * axisY
  const halfExtent = stitchVisualHalfExtentAlongAngle(element, axisAngle)
  return { min: center - halfExtent, max: center + halfExtent }
}

export function stitchVisualSelectionBounds(
  elements: StitchElement[],
  ids: Iterable<string>,
  includeParametric = true,
): StitchVisualBounds | null {
  const selected = new Set(ids)
  const bounds = elements
    .filter((element) => selected.has(element.id) && (includeParametric || !element.parametricRow))
    .map(stitchVisualAabb)
  if (!bounds.length) return null
  return {
    left: Math.min(...bounds.map((item) => item.left)),
    top: Math.min(...bounds.map((item) => item.top)),
    right: Math.max(...bounds.map((item) => item.right)),
    bottom: Math.max(...bounds.map((item) => item.bottom)),
  }
}

export function stitchGlyphScale(element: Pick<StitchElement, 'symbolId' | 'geometry'>) {
  const geometry = resolvedStitchGeometry(element)
  return { x: geometry.scaleX, y: geometry.scaleY }
}

export function stitchLocalAnchor(
  element: Pick<StitchElement, 'symbolId' | 'geometry'>,
  anchorName: AnchorName,
): Point {
  const definition = SYMBOL_BY_ID.get(element.symbolId)
  if (!definition) return { x: 0, y: 0 }
  const geometry = resolvedStitchGeometry(element)
  const anchor = definition.anchors[anchorName]
  return {
    x: anchor.x * geometry.scaleX * geometry.spread,
    y: anchor.y * geometry.scaleY,
  }
}

export function documentPointToElementLocal(
  element: Pick<StitchElement, 'x' | 'y' | 'rotation'>,
  point: Point,
): Point {
  const dx = point.x - element.x
  const dy = point.y - element.y
  const angle = -element.rotation * Math.PI / 180
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return {
    x: dx * cos - dy * sin,
    y: dx * sin + dy * cos,
  }
}

export type StitchGeometryHandle = 'uniform' | 'height' | 'spread'

export function geometryFromHandleDrag(
  element: Pick<StitchElement, 'symbolId' | 'geometry'>,
  handle: StitchGeometryHandle,
  startLocal: Point,
  currentLocal: Point,
): StitchGeometry {
  const start = resolvedStitchGeometry(element)
  if (handle === 'uniform') {
    const startRadius = Math.max(1, Math.hypot(startLocal.x, startLocal.y))
    const currentRadius = Math.max(1, Math.hypot(currentLocal.x, currentLocal.y))
    const factor = currentRadius / startRadius
    return {
      scaleX: clamp(start.scaleX * factor, MIN_STITCH_SCALE, MAX_STITCH_SCALE),
      scaleY: clamp(start.scaleY * factor, MIN_STITCH_SCALE, MAX_STITCH_SCALE),
      ...(supportsSemanticSpread(element.symbolId) && Math.abs(start.spread - 1) > 1e-6 ? { spread: start.spread } : {}),
    }
  }
  if (handle === 'height') {
    const factor = Math.max(0.05, Math.abs(currentLocal.y) / Math.max(1, Math.abs(startLocal.y)))
    return {
      ...(Math.abs(start.scaleX - 1) > 1e-6 ? { scaleX: start.scaleX } : {}),
      scaleY: clamp(start.scaleY * factor, MIN_STITCH_SCALE, MAX_STITCH_SCALE),
      ...(supportsSemanticSpread(element.symbolId) && Math.abs(start.spread - 1) > 1e-6 ? { spread: start.spread } : {}),
    }
  }
  const factor = Math.max(0.05, Math.abs(currentLocal.x) / Math.max(1, Math.abs(startLocal.x)))
  return {
    ...(Math.abs(start.scaleX - 1) > 1e-6 ? { scaleX: start.scaleX } : {}),
    ...(Math.abs(start.scaleY - 1) > 1e-6 ? { scaleY: start.scaleY } : {}),
    spread: clamp(start.spread * factor, MIN_STITCH_SPREAD, MAX_STITCH_SPREAD),
  }
}

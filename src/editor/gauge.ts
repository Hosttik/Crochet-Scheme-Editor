import { SYMBOL_BY_ID } from '../symbols'
import type { GaugeProfile, GaugeSettings, MeasurementRuler, Point, StitchElement } from '../types'
import { rowConstructionRowTotal } from './rowConstruction'

export const RULER_CORRIDOR_HALF_WIDTH = 8

export type RulerCorridorHit = {
  elementIds: string[]
  rowIds: string[]
}

export function emptyGaugeSettings(): GaugeSettings {
  return { profiles: [] }
}

export function gaugeProfileById(gauge: GaugeSettings, profileId?: string) {
  if (profileId) {
    const explicit = gauge.profiles.find((profile) => profile.id === profileId)
    if (explicit) return explicit
  }
  if (gauge.activeProfileId) {
    const active = gauge.profiles.find((profile) => profile.id === gauge.activeProfileId)
    if (active) return active
  }
  return gauge.profiles[0]
}

export function stitchWidthCm(profile: GaugeProfile) {
  return profile.widthCm / profile.stitchCount
}

export function rowHeightCm(profile: GaugeProfile) {
  return profile.heightCm / profile.rowCount
}

export function rowLengthEstimateCm(elements: StitchElement[], rowId: string, profile: GaugeProfile) {
  const row = elements.filter((element) => element.parametricRow?.id === rowId)
  if (!row.length) return null
  const count = rowConstructionRowTotal(row.length, row[0]?.parametricRow?.construction)
  return count * stitchWidthCm(profile)
}

export function patternHeightEstimateCm(elements: StitchElement[], profile: GaugeProfile) {
  const rowIds = new Set(
    elements.flatMap((element) => element.parametricRow?.id ? [element.parametricRow.id] : []),
  )
  return rowIds.size ? rowIds.size * rowHeightCm(profile) : null
}

export function snapRulerPoint(
  point: Point,
  elements: StitchElement[],
  zoom: number,
  maxScreenDistance = 18,
): { point: Point; elementId?: string } {
  const maxDistance = maxScreenDistance / Math.max(zoom, 0.01)
  let best: StitchElement | undefined
  let bestDistance = maxDistance
  for (const element of elements) {
    if (element.visible === false) continue
    if (SYMBOL_BY_ID.get(element.symbolId)?.role === 'marker') continue
    const distance = Math.hypot(element.x - point.x, element.y - point.y)
    if (distance <= bestDistance) {
      best = element
      bestDistance = distance
    }
  }
  return best
    ? { point: { x: best.x, y: best.y }, elementId: best.id }
    : { point }
}

export function reconcileRulerElementReferences(
  rulers: MeasurementRuler[],
  elements: StitchElement[],
) {
  const elementIds = new Set(elements.map((element) => element.id))
  let changed = false
  const next = rulers.map((ruler) => {
    const startElementId = ruler.startElementId && elementIds.has(ruler.startElementId)
      ? ruler.startElementId
      : undefined
    const endElementId = ruler.endElementId && elementIds.has(ruler.endElementId)
      ? ruler.endElementId
      : undefined
    if (startElementId === ruler.startElementId && endElementId === ruler.endElementId) return ruler
    changed = true
    return { ...ruler, startElementId, endElementId }
  })
  return changed ? next : rulers
}

function dot(left: Point, right: Point) {
  return left.x * right.x + left.y * right.y
}

function rulerBasis(ruler: MeasurementRuler) {
  const dx = ruler.end.x - ruler.start.x
  const dy = ruler.end.y - ruler.start.y
  const length = Math.hypot(dx, dy)
  if (length < 1e-6) return null
  const along = { x: dx / length, y: dy / length }
  const normal = { x: -along.y, y: along.x }
  return { length, along, normal }
}

function anchorProjection(ruler: MeasurementRuler, point: Point) {
  const basis = rulerBasis(ruler)
  if (!basis) return null
  const relative = { x: point.x - ruler.start.x, y: point.y - ruler.start.y }
  return {
    along: dot(relative, basis.along),
    normal: dot(relative, basis.normal),
    length: basis.length,
  }
}

/**
 * The v1.23 ruler counts stitch anchors, never visual glyph bounds. This keeps the
 * result stable when a tall/rotated symbol merely touches the measurement strip.
 */
export function rulerCorridorHits(
  ruler: MeasurementRuler,
  elements: StitchElement[],
  halfWidth = RULER_CORRIDOR_HALF_WIDTH,
): RulerCorridorHit {
  const basis = rulerBasis(ruler)
  if (!basis) return { elementIds: [], rowIds: [] }
  const safeHalfWidth = Math.max(0, halfWidth)
  const hits = elements
    .filter((element) => {
      if (element.visible === false) return false
      if (SYMBOL_BY_ID.get(element.symbolId)?.role === 'marker') return false
      const projection = anchorProjection(ruler, element)
      if (!projection) return false
      return projection.along >= -1e-9
        && projection.along <= projection.length + 1e-9
        && Math.abs(projection.normal) <= safeHalfWidth + 1e-9
    })
    .sort((left, right) => {
      const leftProjection = anchorProjection(ruler, left)?.along ?? 0
      const rightProjection = anchorProjection(ruler, right)?.along ?? 0
      return leftProjection - rightProjection
    })

  const rowIds: string[] = []
  const seenRows = new Set<string>()
  for (const element of hits) {
    const rowId = element.parametricRow?.id
    if (!rowId || seenRows.has(rowId)) continue
    seenRows.add(rowId)
    rowIds.push(rowId)
  }
  return { elementIds: hits.map((element) => element.id), rowIds }
}

export function rulerCorridorPolygon(ruler: MeasurementRuler, halfWidth = RULER_CORRIDOR_HALF_WIDTH): Point[] {
  const dx = ruler.end.x - ruler.start.x
  const dy = ruler.end.y - ruler.start.y
  const length = Math.hypot(dx, dy)
  if (length < 1e-6) return []
  const nx = -dy / length * halfWidth
  const ny = dx / length * halfWidth
  return [
    { x: ruler.start.x + nx, y: ruler.start.y + ny },
    { x: ruler.end.x + nx, y: ruler.end.y + ny },
    { x: ruler.end.x - nx, y: ruler.end.y - ny },
    { x: ruler.start.x - nx, y: ruler.start.y - ny },
  ]
}

export type RulerEstimate = {
  profile?: GaugeProfile
  stitchCount?: number
  rowCount?: number
  lengthCm?: number
  rowIds?: string[]
  elementIds?: string[]
  mode: 'stitches' | 'rows'
  source: 'automatic' | 'none'
  strategy?: 'anchor-region'
}

function rowCountFromAnchorHits(elementIds: string[], elements: StitchElement[]) {
  if (!elementIds.length) return 0
  const byId = new Map(elements.map((element) => [element.id, element] as const))
  const semanticRows = new Set<string>()
  let freeAnchors = 0
  for (const id of elementIds) {
    const rowId = byId.get(id)?.parametricRow?.id
    if (rowId) semanticRows.add(rowId)
    else freeAnchors += 1
  }
  return semanticRows.size + freeAnchors
}

export function rulerEstimate(
  ruler: MeasurementRuler,
  elements: StitchElement[],
  gauge: GaugeSettings,
): RulerEstimate {
  const profile = gaugeProfileById(gauge, ruler.profileId)
  const mode = ruler.mode ?? 'stitches'
  const region = rulerCorridorHits(ruler, elements)

  if (mode === 'rows') {
    const rowCount = rowCountFromAnchorHits(region.elementIds, elements)
    return {
      profile,
      mode,
      rowCount: rowCount || undefined,
      rowIds: region.rowIds,
      elementIds: region.elementIds,
      strategy: region.elementIds.length ? 'anchor-region' : undefined,
      source: region.elementIds.length ? 'automatic' : 'none',
      lengthCm: profile && rowCount ? rowCount * rowHeightCm(profile) : undefined,
    }
  }

  const stitchCount = region.elementIds.length
  return {
    profile,
    mode,
    stitchCount: stitchCount || undefined,
    elementIds: region.elementIds,
    strategy: stitchCount ? 'anchor-region' : undefined,
    source: stitchCount ? 'automatic' : 'none',
    lengthCm: profile && stitchCount ? stitchCount * stitchWidthCm(profile) : undefined,
  }
}

function formattedNumber(value: number, locale: 'ru' | 'en') {
  return new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', { maximumFractionDigits: 1 }).format(value)
}

export function rulerDisplayLabel(
  ruler: MeasurementRuler,
  elements: StitchElement[],
  gauge: GaugeSettings,
  locale: 'ru' | 'en',
) {
  const estimate = rulerEstimate(ruler, elements, gauge)
  if (estimate.mode === 'rows') {
    const count = estimate.rowCount ?? 0
    if (!estimate.profile) {
      return locale === 'ru' ? `${count} р. · нет плотности` : `${count} rows · no gauge`
    }
    if (!count || estimate.lengthCm == null) return locale === 'ru' ? '0 р.' : '0 rows'
    return locale === 'ru'
      ? `${count} р. · ≈ ${formattedNumber(estimate.lengthCm, locale)} см`
      : `${count} rows · ≈ ${formattedNumber(estimate.lengthCm, locale)} cm`
  }
  const count = estimate.stitchCount ?? 0
  if (!estimate.profile) {
    return locale === 'ru' ? `${count} п./ст. · нет плотности` : `${count} sts/cols · no gauge`
  }
  if (!count || estimate.lengthCm == null) return locale === 'ru' ? '0 п./ст.' : '0 sts/cols'
  return locale === 'ru'
    ? `${count} п./ст. · ≈ ${formattedNumber(estimate.lengthCm, locale)} см`
    : `${count} sts/cols · ≈ ${formattedNumber(estimate.lengthCm, locale)} cm`
}

import { SYMBOL_BY_ID } from '../symbols'
import type { GaugeProfile, GaugeSettings, MeasurementRuler, Point, StitchElement } from '../types'
import { patternRows } from './parametricRows'
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

function projectedHalfExtent(element: StitchElement, axis: Point) {
  const definition = SYMBOL_BY_ID.get(element.symbolId)
  const width = definition?.width ?? 30
  const height = definition?.height ?? 30
  const angle = element.rotation * Math.PI / 180
  const localX = { x: Math.cos(angle), y: Math.sin(angle) }
  const localY = { x: -Math.sin(angle), y: Math.cos(angle) }
  return Math.abs(axis.x * localX.x + axis.y * localX.y) * width / 2
    + Math.abs(axis.x * localY.x + axis.y * localY.y) * height / 2
}

function dot(left: Point, right: Point) {
  return left.x * right.x + left.y * right.y
}

function elementLocalAxes(element: StitchElement) {
  const angle = element.rotation * Math.PI / 180
  return [
    { x: Math.cos(angle), y: Math.sin(angle) },
    { x: -Math.sin(angle), y: Math.cos(angle) },
  ] as const
}

function corridorIntersectsElementBounds(
  element: StitchElement,
  corridorCenter: Point,
  along: Point,
  normal: Point,
  halfLength: number,
  halfWidth: number,
) {
  const relative = { x: element.x - corridorCenter.x, y: element.y - corridorCenter.y }
  const axes = [along, normal, ...elementLocalAxes(element)]
  return axes.every((axis) => {
    const centerDistance = Math.abs(dot(relative, axis))
    const corridorRadius = Math.abs(dot(along, axis)) * halfLength
      + Math.abs(dot(normal, axis)) * halfWidth
    const elementRadius = projectedHalfExtent(element, axis)
    return centerDistance <= corridorRadius + elementRadius + 1e-9
  })
}

export function rulerCorridorHits(
  ruler: MeasurementRuler,
  elements: StitchElement[],
  halfWidth = RULER_CORRIDOR_HALF_WIDTH,
): RulerCorridorHit {
  const dx = ruler.end.x - ruler.start.x
  const dy = ruler.end.y - ruler.start.y
  const length = Math.hypot(dx, dy)
  if (length < 1e-6) return { elementIds: [], rowIds: [] }
  const along = { x: dx / length, y: dy / length }
  const normal = { x: -along.y, y: along.x }
  const center = { x: (ruler.start.x + ruler.end.x) / 2, y: (ruler.start.y + ruler.end.y) / 2 }
  const hits = elements.filter((element) => {
    if (element.visible === false) return false
    if (SYMBOL_BY_ID.get(element.symbolId)?.role === 'marker') return false
    return corridorIntersectsElementBounds(element, center, along, normal, length / 2, Math.max(0, halfWidth))
  })
  const rowSet = new Set(hits.flatMap((element) => element.parametricRow?.id ? [element.parametricRow.id] : []))
  const orderedRows = patternRows(elements).map((row) => row.id).filter((id) => rowSet.has(id))
  return { elementIds: hits.map((element) => element.id), rowIds: orderedRows }
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

function automaticRulerStitchCount(ruler: MeasurementRuler, elements: StitchElement[]) {
  if (!ruler.startElementId || !ruler.endElementId) return null
  const start = elements.find((element) => element.id === ruler.startElementId)
  const end = elements.find((element) => element.id === ruler.endElementId)
  const rowId = start?.parametricRow?.id
  if (!start || !end || !rowId || end.parametricRow?.id !== rowId) return null
  const row = elements.filter((element) => element.parametricRow?.id === rowId)
  const startIndex = row.findIndex((element) => element.id === start.id)
  const endIndex = row.findIndex((element) => element.id === end.id)
  if (startIndex < 0 || endIndex < 0) return null
  const low = Math.min(startIndex, endIndex)
  const high = Math.max(startIndex, endIndex)
  return { count: high - low + 1, rowId, elementIds: row.slice(low, high + 1).map((element) => element.id) }
}

function automaticRulerRowCount(ruler: MeasurementRuler, elements: StitchElement[]) {
  if (!ruler.startElementId || !ruler.endElementId) return null
  const start = elements.find((element) => element.id === ruler.startElementId)
  const end = elements.find((element) => element.id === ruler.endElementId)
  const startRowId = start?.parametricRow?.id
  const endRowId = end?.parametricRow?.id
  if (!start || !end || !startRowId || !endRowId) return null
  const rows = patternRows(elements)
  const startIndex = rows.findIndex((row) => row.id === startRowId)
  const endIndex = rows.findIndex((row) => row.id === endRowId)
  if (startIndex < 0 || endIndex < 0) return null
  const low = Math.min(startIndex, endIndex)
  const high = Math.max(startIndex, endIndex)
  const rowIds = rows.slice(low, high + 1).map((row) => row.id)
  const rowSet = new Set(rowIds)
  return {
    count: high - low + 1,
    startRowId: rows[low]?.id,
    endRowId: rows[high]?.id,
    rowIds,
    elementIds: elements.filter((element) => element.parametricRow?.id && rowSet.has(element.parametricRow.id)).map((element) => element.id),
  }
}

export type RulerEstimate = {
  profile?: GaugeProfile
  stitchCount?: number
  rowCount?: number
  lengthCm?: number
  rowId?: string
  startRowId?: string
  endRowId?: string
  elementIds?: string[]
  rowIds?: string[]
  mode: 'stitches' | 'rows'
  source: 'automatic' | 'manual' | 'none'
  strategy?: 'semantic-endpoints' | 'corridor'
}

export function rulerEstimate(
  ruler: MeasurementRuler,
  elements: StitchElement[],
  gauge: GaugeSettings,
): RulerEstimate {
  const profile = gaugeProfileById(gauge, ruler.profileId)
  const mode = ruler.mode ?? 'stitches'
  const corridor = rulerCorridorHits(ruler, elements)

  if (mode === 'rows') {
    const endpointAutomatic = automaticRulerRowCount(ruler, elements)
    const corridorRowSet = new Set(corridor.rowIds)
    const elementById = new Map(elements.map((element) => [element.id, element] as const))
    const corridorAutomatic = corridor.rowIds.length ? {
      count: corridor.rowIds.length,
      startRowId: corridor.rowIds[0],
      endRowId: corridor.rowIds[corridor.rowIds.length - 1],
      rowIds: corridor.rowIds,
      elementIds: corridor.elementIds.filter((id) => {
        const rowId = elementById.get(id)?.parametricRow?.id
        return Boolean(rowId && corridorRowSet.has(rowId))
      }),
    } : null
    const automatic = endpointAutomatic ?? corridorAutomatic
    const manual = ruler.manualRowCount && ruler.manualRowCount > 0 ? ruler.manualRowCount : null
    const rowCount = manual ?? automatic?.count ?? undefined
    const strategy = endpointAutomatic ? 'semantic-endpoints' : corridorAutomatic ? 'corridor' : undefined
    return {
      profile,
      mode,
      rowCount,
      startRowId: automatic?.startRowId,
      endRowId: automatic?.endRowId,
      rowIds: manual ? undefined : automatic?.rowIds,
      elementIds: manual ? undefined : automatic?.elementIds,
      strategy: manual ? undefined : strategy,
      source: manual ? 'manual' : automatic ? 'automatic' : 'none',
      lengthCm: profile && rowCount ? rowCount * rowHeightCm(profile) : undefined,
    }
  }

  const endpointAutomatic = automaticRulerStitchCount(ruler, elements)
  const corridorAutomatic = corridor.elementIds.length ? {
    count: corridor.elementIds.length,
    elementIds: corridor.elementIds,
    rowId: (() => {
      const ids = new Set(corridor.elementIds.map((id) => elements.find((element) => element.id === id)?.parametricRow?.id).filter(Boolean))
      return ids.size === 1 ? [...ids][0] as string : undefined
    })(),
  } : null
  const automatic = endpointAutomatic ?? corridorAutomatic
  const manual = ruler.manualStitchCount && ruler.manualStitchCount > 0 ? ruler.manualStitchCount : null
  const stitchCount = manual ?? automatic?.count ?? undefined
  const strategy = endpointAutomatic ? 'semantic-endpoints' : corridorAutomatic ? 'corridor' : undefined
  return {
    profile,
    mode,
    stitchCount,
    rowId: automatic?.rowId,
    elementIds: manual ? undefined : automatic?.elementIds,
    strategy: manual ? undefined : strategy,
    source: manual ? 'manual' : automatic ? 'automatic' : 'none',
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
  if (!estimate.profile) return locale === 'ru' ? 'Нет образца' : 'No gauge'
  if (estimate.mode === 'rows') {
    if (!estimate.rowCount || estimate.lengthCm == null) return locale === 'ru' ? 'Задайте число рядов' : 'Set row count'
    return locale === 'ru'
      ? `${estimate.rowCount} р. · ≈ ${formattedNumber(estimate.lengthCm, locale)} см`
      : `${estimate.rowCount} rows · ≈ ${formattedNumber(estimate.lengthCm, locale)} cm`
  }
  if (!estimate.stitchCount || estimate.lengthCm == null) return locale === 'ru' ? 'Задайте число петель' : 'Set stitch count'
  return locale === 'ru'
    ? `${estimate.stitchCount} п. · ≈ ${formattedNumber(estimate.lengthCm, locale)} см`
    : `${estimate.stitchCount} sts · ≈ ${formattedNumber(estimate.lengthCm, locale)} cm`
}

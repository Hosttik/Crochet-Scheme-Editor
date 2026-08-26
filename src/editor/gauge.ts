import type { GaugeProfile, GaugeSettings, MeasurementRuler, Point, StitchElement } from '../types'
import { patternRows } from './parametricRows'
import { rowConstructionRowTotal } from './rowConstruction'

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
  return { count: Math.abs(endIndex - startIndex) + 1, rowId }
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
  return {
    count: Math.abs(endIndex - startIndex) + 1,
    startRowId,
    endRowId,
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
  mode: 'stitches' | 'rows'
  source: 'automatic' | 'manual' | 'none'
}

export function rulerEstimate(
  ruler: MeasurementRuler,
  elements: StitchElement[],
  gauge: GaugeSettings,
): RulerEstimate {
  const profile = gaugeProfileById(gauge, ruler.profileId)
  const mode = ruler.mode ?? 'stitches'

  if (mode === 'rows') {
    const automatic = automaticRulerRowCount(ruler, elements)
    const manual = ruler.manualRowCount && ruler.manualRowCount > 0
      ? ruler.manualRowCount
      : null
    const rowCount = manual ?? automatic?.count ?? undefined
    return {
      profile,
      mode,
      rowCount,
      startRowId: automatic?.startRowId,
      endRowId: automatic?.endRowId,
      source: manual ? 'manual' : automatic ? 'automatic' : 'none',
      lengthCm: profile && rowCount ? rowCount * rowHeightCm(profile) : undefined,
    }
  }

  const automatic = automaticRulerStitchCount(ruler, elements)
  const manual = ruler.manualStitchCount && ruler.manualStitchCount > 0
    ? ruler.manualStitchCount
    : null
  const stitchCount = manual ?? automatic?.count ?? undefined
  return {
    profile,
    mode,
    stitchCount,
    rowId: automatic?.rowId,
    source: manual ? 'manual' : automatic ? 'automatic' : 'none',
    lengthCm: profile && stitchCount ? stitchCount * stitchWidthCm(profile) : undefined,
  }
}

function formattedNumber(value: number, locale: 'ru' | 'en') {
  return new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
    maximumFractionDigits: 1,
  }).format(value)
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
    if (!estimate.rowCount || estimate.lengthCm == null) {
      return locale === 'ru' ? 'Задайте число рядов' : 'Set row count'
    }
    return locale === 'ru'
      ? `${estimate.rowCount} р. · ≈ ${formattedNumber(estimate.lengthCm, locale)} см`
      : `${estimate.rowCount} rows · ≈ ${formattedNumber(estimate.lengthCm, locale)} cm`
  }

  if (!estimate.stitchCount || estimate.lengthCm == null) {
    return locale === 'ru' ? 'Задайте число петель' : 'Set stitch count'
  }
  return locale === 'ru'
    ? `${estimate.stitchCount} п. · ≈ ${formattedNumber(estimate.lengthCm, locale)} см`
    : `${estimate.stitchCount} sts · ≈ ${formattedNumber(estimate.lengthCm, locale)} cm`
}

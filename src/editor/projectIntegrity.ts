import { SYMBOL_BY_ID } from '../symbols'
import type { CrochetProject, Guide, ParametricRowBinding, StitchElement } from '../types'

export const MAX_PROJECT_ELEMENTS = 20_000
export const MAX_PROJECT_GUIDES = 500
export const MAX_PROJECT_ROW_MARKERS = 1_000
export const MAX_BACKGROUND_DATA_URL_LENGTH = 8_000_000
const MAX_COORDINATE = 1_000_000
const MAX_GUIDE_SPACING = 100_000

function bounded(value: number, max = MAX_COORDINATE) {
  return Number.isFinite(value) && Math.abs(value) <= max
}

function positive(value: number, max: number) {
  return Number.isFinite(value) && value > 0 && value <= max
}

function positiveInteger(value: number, max: number) {
  return positive(value, max) && Number.isInteger(value)
}

function unique(values: string[]) {
  return new Set(values).size === values.length
}

function guideGeometryIssue(guide: Guide): string | null {
  if (guide.type === 'arc') {
    if (!bounded(guide.center.x) || !bounded(guide.center.y) || !positive(guide.radius, MAX_COORDINATE)) return 'Arc guide geometry is out of bounds'
    if (!positiveInteger(guide.divisions, 72) || !bounded(guide.startAngle) || !bounded(guide.endAngle)) return 'Arc guide settings are out of bounds'
  } else if (guide.type === 'line') {
    if (![guide.start.x, guide.start.y, guide.end.x, guide.end.y].every((value) => bounded(value))) return 'Line guide geometry is out of bounds'
    if (!positiveInteger(guide.divisions, 100)) return 'Line guide divisions are out of bounds'
  } else if (guide.type === 'curve') {
    const points = [guide.start, guide.control1, guide.control2, guide.end]
    if (!points.every((point) => bounded(point.x) && bounded(point.y))) return 'Curve guide geometry is out of bounds'
    if (!positiveInteger(guide.divisions, 100)) return 'Curve guide divisions are out of bounds'
  } else if (guide.type === 'grid') {
    if (!bounded(guide.origin.x) || !bounded(guide.origin.y)) return 'Grid guide origin is out of bounds'
    if (!positiveInteger(guide.rows, 50) || !positiveInteger(guide.columns, 50)) return 'Grid guide dimensions are out of bounds'
    if (!positive(guide.spacingX, MAX_GUIDE_SPACING) || !positive(guide.spacingY, MAX_GUIDE_SPACING) || !bounded(guide.rotation)) return 'Grid guide settings are out of bounds'
  } else {
    if (!bounded(guide.center.x) || !bounded(guide.center.y)) return 'Radial guide center is out of bounds'
    if (!positiveInteger(guide.ringCount, 30) || !positiveInteger(guide.sectorCount, 72)) return 'Radial guide dimensions are out of bounds'
    if (!positive(guide.ringSpacing, MAX_GUIDE_SPACING) || !bounded(guide.startAngle)) return 'Radial guide settings are out of bounds'
  }
  return null
}

function bindingSymbolIds(binding: ParametricRowBinding) {
  const ids = [binding.symbolId]
  binding.sequence?.items.forEach((item) => ids.push(item.symbolId))
  binding.program?.items.forEach((item) => {
    if (item.kind === 'group') item.items.forEach((leaf) => ids.push(leaf.symbolId))
    else ids.push(item.symbolId)
  })
  return ids
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stable(child)]),
    )
  }
  return value
}

function bindingSignature(binding: ParametricRowBinding) {
  return JSON.stringify(stable(binding))
}

function bindingIssue(binding: ParametricRowBinding, guides: Map<string, Guide>, strictReferences: boolean) {
  const guide = guides.get(binding.guideId)
  if (guide && guide.type !== 'arc' && guide.type !== 'radial-grid') return 'Parametric row references an incompatible guide'
  if (!guide && strictReferences) return 'Parametric row references an incompatible guide'
  if (!bindingSymbolIds(binding).every((id) => SYMBOL_BY_ID.has(id))) return 'Parametric row references an unknown stitch symbol'
  const options = binding.options
  if (!positiveInteger(options.count, 500) || !positive(options.spacing, MAX_GUIDE_SPACING)) return 'Parametric row distribution is out of bounds'
  if (!positiveInteger(options.ringIndex, 30) || !bounded(options.rotationOffset) || !bounded(options.radialOffset)) return 'Parametric row geometry is out of bounds'
  if (binding.patternOrder !== undefined && !positiveInteger(binding.patternOrder, 10_000)) return 'Parametric row order is out of bounds'
  if (binding.generatedRadialOffset !== undefined && !bounded(binding.generatedRadialOffset)) return 'Parametric row offset is out of bounds'
  if (binding.shaping && (!positiveInteger(binding.shaping.count, 500) || !positiveInteger(binding.shaping.baseCount, 500))) return 'Parametric row shaping is out of bounds'
  return null
}

function rowCycleIssue(elements: StitchElement[]) {
  const parents = new Map<string, string | undefined>()
  for (const element of elements) {
    const binding = element.parametricRow
    if (binding && !parents.has(binding.id)) parents.set(binding.id, binding.parentRowId)
  }
  for (const start of parents.keys()) {
    const seen = new Set<string>()
    let current: string | undefined = start
    while (current) {
      if (seen.has(current)) return 'Parametric row parent graph contains a cycle'
      seen.add(current)
      current = parents.get(current)
    }
  }
  return null
}

export function projectIntegrityIssue(project: CrochetProject, strictReferences = true): string | null {
  const elements = project.elements
  const guides = project.guides ?? []
  const markers = project.rowMarkers ?? []
  if (elements.length > MAX_PROJECT_ELEMENTS) return 'Project contains too many stitch elements'
  if (guides.length > MAX_PROJECT_GUIDES) return 'Project contains too many guides'
  if (markers.length > MAX_PROJECT_ROW_MARKERS) return 'Project contains too many row markers'

  if (!unique(elements.map((element) => element.id))) return 'Duplicate stitch element id'
  if (!unique(guides.map((guide) => guide.id))) return 'Duplicate guide id'
  if (!unique(markers.map((marker) => marker.id))) return 'Duplicate row marker id'
  if (new Set(markers.map((marker) => marker.number)).size !== markers.length) return 'Duplicate row marker number'

  const elementIds = new Set(elements.map((element) => element.id))
  const guideById = new Map(guides.map((guide) => [guide.id, guide]))
  for (const guide of guides) {
    const issue = guideGeometryIssue(guide)
    if (issue) return issue
  }

  const rowBindings = new Map<string, string>()
  const rowIds = new Set(elements.flatMap((element) => element.parametricRow ? [element.parametricRow.id] : []))
  for (const element of elements) {
    if (!SYMBOL_BY_ID.has(element.symbolId)) return 'Unknown stitch symbol'
    if (!bounded(element.x) || !bounded(element.y) || !bounded(element.rotation)) return 'Stitch geometry is out of bounds'
    if (strictReferences && element.parentStitchIds?.some((id) => !elementIds.has(id))) return 'Stitch topology references a missing parent'

    if (element.guideAttachment) {
      const guide = guideById.get(element.guideAttachment.guideId)
      if (guide && guide.type !== 'arc' && guide.type !== 'line' && guide.type !== 'curve') return 'Guide attachment references an incompatible guide'
      if (!guide && strictReferences) return 'Guide attachment references an incompatible guide'
      if (!bounded(element.guideAttachment.normalOffset) || !bounded(element.guideAttachment.rotationOffset)) return 'Guide attachment is out of bounds'
    }

    const binding = element.parametricRow
    if (binding) {
      const issue = bindingIssue(binding, guideById, strictReferences)
      if (issue) return issue
      if (strictReferences && binding.parentRowId && !rowIds.has(binding.parentRowId)) return 'Parametric row references a missing parent row'
      if (binding.parentRowId === binding.id) return 'Parametric row cannot parent itself'
      const signature = bindingSignature(binding)
      const previous = rowBindings.get(binding.id)
      if (previous !== undefined && previous !== signature) return 'Parametric row binding is inconsistent across its stitches'
      rowBindings.set(binding.id, signature)
    }
  }

  for (const marker of markers) {
    if (!bounded(marker.x) || !bounded(marker.y)) return 'Row marker geometry is out of bounds'
  }
  const background = project.backgroundImage
  if (background) {
    if (background.dataUrl.length > MAX_BACKGROUND_DATA_URL_LENGTH) return 'Background image is too large'
    if (!bounded(background.x) || !bounded(background.y) || !positive(background.width, MAX_COORDINATE) || !positive(background.height, MAX_COORDINATE)) return 'Background image geometry is out of bounds'
  }
  if (!Number.isFinite(project.settings.snapping.tolerancePx) || project.settings.snapping.tolerancePx < 1 || project.settings.snapping.tolerancePx > 100) return 'Snapping tolerance is out of bounds'

  return rowCycleIssue(elements)
}

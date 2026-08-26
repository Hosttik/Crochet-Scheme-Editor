from pathlib import Path
from textwrap import dedent

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text()


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content)


def replace(path: str, old: str, new: str, count: int | None = None) -> None:
    text = read(path)
    actual = text.count(old)
    expected = 1 if count is None else count
    if actual != expected:
        raise RuntimeError(f'{path}: expected {expected} occurrence(s), found {actual}: {old[:120]!r}')
    write(path, text.replace(old, new))


# ---------------------------------------------------------------------------
# Shared semantic selection invariants.
# ---------------------------------------------------------------------------
write('src/editor/selectionModel.ts', dedent('''\
import type { StitchElement } from '../types'
import { isElementLocked, isElementVisible } from './document'

export type SemanticSelectionOptions = {
  expandGroups?: boolean
  expandRows?: boolean
  visibleSeedsOnly?: boolean
}

/**
 * Resolves authoring-object selection while respecting locks.
 *
 * A normal group or parametric row is atomic: if any member is locked, the
 * semantic object is treated as locked and none of its members are returned.
 * Alt/direct single-stitch actions can opt out of group expansion.
 */
export function semanticSelectionIds(
  elements: StitchElement[],
  seedIds: string[],
  options: SemanticSelectionOptions = {},
) {
  const {
    expandGroups = true,
    expandRows = true,
    visibleSeedsOnly = false,
  } = options
  const byId = new Map(elements.map((element) => [element.id, element]))
  const groups = new Map<string, StitchElement[]>()
  const rows = new Map<string, StitchElement[]>()

  for (const element of elements) {
    if (element.groupId) groups.set(element.groupId, [...(groups.get(element.groupId) ?? []), element])
    const rowId = element.parametricRow?.id
    if (rowId) rows.set(rowId, [...(rows.get(rowId) ?? []), element])
  }

  const result = new Set<string>()
  for (const id of seedIds) {
    const element = byId.get(id)
    if (!element || isElementLocked(element)) continue
    if (visibleSeedsOnly && !isElementVisible(element)) continue

    const rowId = expandRows ? element.parametricRow?.id : undefined
    if (rowId) {
      const members = rows.get(rowId) ?? []
      if (!members.length || members.some(isElementLocked)) continue
      members.forEach((member) => result.add(member.id))
      continue
    }

    if (expandGroups && element.groupId) {
      const members = groups.get(element.groupId) ?? []
      if (!members.length || members.some(isElementLocked)) continue
      members.forEach((member) => result.add(member.id))
      continue
    }

    result.add(element.id)
  }
  return [...result]
}

export function semanticLockIds(elements: StitchElement[], id: string) {
  const element = elements.find((item) => item.id === id)
  if (!element) return []
  if (element.parametricRow) {
    return elements.filter((item) => item.parametricRow?.id === element.parametricRow?.id).map((item) => item.id)
  }
  if (element.groupId) {
    return elements.filter((item) => item.groupId === element.groupId).map((item) => item.id)
  }
  return [id]
}
'''))

write('src/editor/selectionModel.test.ts', dedent('''\
import { describe, expect, it } from 'vitest'
import type { StitchElement } from '../types'
import { semanticLockIds, semanticSelectionIds } from './selectionModel'

const stitch = (id: string, patch: Partial<StitchElement> = {}): StitchElement => ({
  id, symbolId: 'single', x: 0, y: 0, rotation: 0, visible: true, locked: false, ...patch,
})

describe('semanticSelectionIds', () => {
  it('selects a complete unlocked group atomically', () => {
    const elements = [stitch('a', { groupId: 'g' }), stitch('b', { groupId: 'g' })]
    expect(semanticSelectionIds(elements, ['a'])).toEqual(['a', 'b'])
  })

  it('blocks a group when any member is locked', () => {
    const elements = [stitch('a', { groupId: 'g' }), stitch('b', { groupId: 'g', locked: true })]
    expect(semanticSelectionIds(elements, ['a'])).toEqual([])
    expect(semanticSelectionIds(elements, ['a'], { expandGroups: false })).toEqual(['a'])
  })

  it('blocks a parametric row when any member is locked', () => {
    const binding = {
      id: 'row', guideId: 'guide', symbolId: 'single',
      options: { distributionMode: 'count' as const, count: 2, spacing: 20, orientation: 'radial' as const, rotationOffset: 0, radialOffset: 0, ringIndex: 1 },
    }
    const elements = [stitch('a', { parametricRow: binding }), stitch('b', { parametricRow: binding, locked: true })]
    expect(semanticSelectionIds(elements, ['a'])).toEqual([])
    expect(semanticLockIds(elements, 'a')).toEqual(['a', 'b'])
  })
})
'''))

# ---------------------------------------------------------------------------
# Project-level validation: resource budgets, known symbols and references.
# ---------------------------------------------------------------------------
write('src/editor/projectIntegrity.ts', dedent('''\
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

function bindingIssue(binding: ParametricRowBinding, guides: Map<string, Guide>) {
  const guide = guides.get(binding.guideId)
  if (!guide || (guide.type !== 'arc' && guide.type !== 'radial-grid')) return 'Parametric row references an incompatible guide'
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

export function projectIntegrityIssue(project: CrochetProject): string | null {
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
    if (element.parentStitchIds?.some((id) => !elementIds.has(id))) return 'Stitch topology references a missing parent'

    if (element.guideAttachment) {
      const guide = guideById.get(element.guideAttachment.guideId)
      if (!guide || (guide.type !== 'arc' && guide.type !== 'line' && guide.type !== 'curve')) return 'Guide attachment references an incompatible guide'
      if (!bounded(element.guideAttachment.normalOffset) || !bounded(element.guideAttachment.rotationOffset)) return 'Guide attachment is out of bounds'
    }

    const binding = element.parametricRow
    if (binding) {
      const issue = bindingIssue(binding, guideById)
      if (issue) return issue
      if (binding.parentRowId && !rowIds.has(binding.parentRowId)) return 'Parametric row references a missing parent row'
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
'''))

replace(
    'src/editor/projectSchema.ts',
    "import { rowProgramMetrics } from './rowProgram'\n",
    "import { rowProgramMetrics } from './rowProgram'\nimport { MAX_PROJECT_ELEMENTS, MAX_PROJECT_GUIDES, MAX_PROJECT_ROW_MARKERS, projectIntegrityIssue } from './projectIntegrity'\n",
)
replace(
    'src/editor/projectSchema.ts',
    "  if (!Array.isArray(raw.elements)) throw new ProjectValidationError('Project elements are missing')\n  if (raw.guides !== undefined && !Array.isArray(raw.guides)) throw new ProjectValidationError('Project guides are invalid')\n  if (raw.rowMarkers !== undefined && !Array.isArray(raw.rowMarkers)) throw new ProjectValidationError('Project row markers are invalid')\n",
    "  if (!Array.isArray(raw.elements)) throw new ProjectValidationError('Project elements are missing')\n  if (raw.elements.length > MAX_PROJECT_ELEMENTS) throw new ProjectValidationError('Project contains too many stitch elements')\n  if (raw.guides !== undefined && !Array.isArray(raw.guides)) throw new ProjectValidationError('Project guides are invalid')\n  if (Array.isArray(raw.guides) && raw.guides.length > MAX_PROJECT_GUIDES) throw new ProjectValidationError('Project contains too many guides')\n  if (raw.rowMarkers !== undefined && !Array.isArray(raw.rowMarkers)) throw new ProjectValidationError('Project row markers are invalid')\n  if (Array.isArray(raw.rowMarkers) && raw.rowMarkers.length > MAX_PROJECT_ROW_MARKERS) throw new ProjectValidationError('Project contains too many row markers')\n",
)
replace(
    'src/editor/projectSchema.ts',
    "  return {\n    schemaVersion: 17,\n",
    "  const project: CrochetProject = {\n    schemaVersion: 17,\n",
)
replace(
    'src/editor/projectSchema.ts',
    "      autosave: parseAutosave(settings.autosave),\n    },\n  }\n}\n",
    "      autosave: parseAutosave(settings.autosave),\n    },\n  }\n  const integrityIssue = projectIntegrityIssue(project)\n  if (integrityIssue) throw new ProjectValidationError(integrityIssue)\n  return project\n}\n",
)

# Let normalizeProject be the boundary for unknown imported JSON.
replace(
    'src/editor/document.ts',
    "export function normalizeProject(\n  project: CrochetProject,\n  fallbackSnapping: SnappingSettings,\n): CrochetProject {\n",
    "export function normalizeProject(\n  project: unknown,\n  fallbackSnapping: SnappingSettings,\n): CrochetProject {\n",
)

# ---------------------------------------------------------------------------
# Background underlay: bounded upload and raster compression for large rasters.
# ---------------------------------------------------------------------------
write('src/editor/backgroundImage.ts', dedent('''\
import type { BackgroundImage, Point } from '../types'

export const DEFAULT_BACKGROUND_OPACITY = 0.45
export const MAX_BACKGROUND_DIMENSION = 1200
export const MAX_BACKGROUND_STORAGE_DIMENSION = 1800
export const MAX_BACKGROUND_UPLOAD_BYTES = 20_000_000
export const MAX_BACKGROUND_SOURCE_PIXELS = 60_000_000
const MAX_PRESERVED_DATA_URL_LENGTH = 3_000_000
const MAX_STORED_DATA_URL_LENGTH = 8_000_000

export function fittedBackgroundImage(
  dataUrl: string,
  sourceName: string,
  naturalWidth: number,
  naturalHeight: number,
  center: Point,
): BackgroundImage {
  const safeWidth = Math.max(1, Number.isFinite(naturalWidth) ? naturalWidth : 1)
  const safeHeight = Math.max(1, Number.isFinite(naturalHeight) ? naturalHeight : 1)
  const scale = Math.min(1, MAX_BACKGROUND_DIMENSION / Math.max(safeWidth, safeHeight))
  const width = safeWidth * scale
  const height = safeHeight * scale
  return {
    dataUrl,
    sourceName,
    x: center.x - width / 2,
    y: center.y - height / 2,
    width,
    height,
    opacity: DEFAULT_BACKGROUND_OPACITY,
    visible: true,
    locked: false,
    includeInExport: false,
  }
}

function fileDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read image'))
    reader.onerror = () => reject(reader.error ?? new Error('Could not read image'))
    reader.readAsDataURL(file)
  })
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not decode image'))
    image.src = dataUrl
  })
}

export async function prepareBackgroundImage(file: File, center: Point): Promise<BackgroundImage> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file')
  if (file.size > MAX_BACKGROUND_UPLOAD_BYTES) throw new Error('Image file is too large (20 MB max)')

  const original = await fileDataUrl(file)
  const image = await loadImage(original)
  const naturalWidth = Math.max(1, image.naturalWidth)
  const naturalHeight = Math.max(1, image.naturalHeight)
  if (naturalWidth * naturalHeight > MAX_BACKGROUND_SOURCE_PIXELS) {
    throw new Error('Image dimensions are too large')
  }

  // Small SVG underlays are already compact and remain vector in SVG export.
  if (file.type === 'image/svg+xml' && original.length <= MAX_PRESERVED_DATA_URL_LENGTH) {
    return fittedBackgroundImage(original, file.name, naturalWidth, naturalHeight, center)
  }

  const needsRasterization =
    file.type === 'image/gif' ||
    original.length > MAX_PRESERVED_DATA_URL_LENGTH ||
    Math.max(naturalWidth, naturalHeight) > MAX_BACKGROUND_STORAGE_DIMENSION

  if (!needsRasterization) {
    return fittedBackgroundImage(original, file.name, naturalWidth, naturalHeight, center)
  }

  const scale = Math.min(1, MAX_BACKGROUND_STORAGE_DIMENSION / Math.max(naturalWidth, naturalHeight))
  const width = Math.max(1, Math.round(naturalWidth * scale))
  const height = Math.max(1, Math.round(naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not prepare image')
  context.drawImage(image, 0, 0, width, height)
  const dataUrl = canvas.toDataURL('image/webp', 0.86)
  if (dataUrl.length > MAX_STORED_DATA_URL_LENGTH) throw new Error('Prepared image is still too large')
  return fittedBackgroundImage(dataUrl, file.name, width, height, center)
}

export function clampBackgroundOpacity(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_BACKGROUND_OPACITY
  return Math.min(1, Math.max(0.05, value))
}
'''))

# DraftNumberInput can now be used for transactional numeric inputs.
replace(
    'src/editor/DraftNumberInput.tsx',
    "  ariaLabel?: string\n}",
    "  ariaLabel?: string\n  commitOnBlur?: boolean\n}",
)
replace(
    'src/editor/DraftNumberInput.tsx',
    "export function DraftNumberInput({ value, onChange, min, max, step = 1, ariaLabel }: Props) {",
    "export function DraftNumberInput({ value, onChange, min, max, step = 1, ariaLabel, commitOnBlur = false }: Props) {",
)
replace(
    'src/editor/DraftNumberInput.tsx',
    "        if (parsed !== value) onChange(parsed)\n",
    "        if (!commitOnBlur && parsed !== value) onChange(parsed)\n",
)

# Background geometry no longer commits 0/1 while the user temporarily clears a field.
replace(
    'src/editor/BackgroundImagePanel.tsx',
    "import { useRef } from 'react'\n",
    "import { useRef } from 'react'\nimport { DraftNumberInput } from './DraftNumberInput'\n",
)
replace(
    'src/editor/BackgroundImagePanel.tsx',
    "              <label className=\"number-field\"><span>X</span><input type=\"number\" value={background.x} onChange={(event) => onChange({ x: numeric(event.target.value, background.x) })} /></label>\n              <label className=\"number-field\"><span>Y</span><input type=\"number\" value={background.y} onChange={(event) => onChange({ y: numeric(event.target.value, background.y) })} /></label>\n              <label className=\"number-field\"><span>{ru ? 'Ширина' : 'Width'}</span><input type=\"number\" min=\"1\" value={background.width} onChange={(event) => onChange({ width: Math.max(1, numeric(event.target.value, background.width)) })} /></label>\n              <label className=\"number-field\"><span>{ru ? 'Высота' : 'Height'}</span><input type=\"number\" min=\"1\" value={background.height} onChange={(event) => onChange({ height: Math.max(1, numeric(event.target.value, background.height)) })} /></label>\n",
    "              <label className=\"number-field\"><span>X</span><DraftNumberInput commitOnBlur value={background.x} onChange={(x) => onChange({ x })} /></label>\n              <label className=\"number-field\"><span>Y</span><DraftNumberInput commitOnBlur value={background.y} onChange={(y) => onChange({ y })} /></label>\n              <label className=\"number-field\"><span>{ru ? 'Ширина' : 'Width'}</span><DraftNumberInput commitOnBlur min={1} value={background.width} onChange={(width) => onChange({ width })} /></label>\n              <label className=\"number-field\"><span>{ru ? 'Высота' : 'Height'}</span><DraftNumberInput commitOnBlur min={1} value={background.height} onChange={(height) => onChange({ height })} /></label>\n",
)

# Parametric row numeric fields commit as one transaction on blur/Enter.
replace(
    'src/editor/ParametricRowEditorPanel.tsx',
    "import { RowConstructionEditor } from './RowConstructionEditor'\n",
    "import { RowConstructionEditor } from './RowConstructionEditor'\nimport { DraftNumberInput } from './DraftNumberInput'\n",
)
replace(
    'src/editor/ParametricRowEditorPanel.tsx',
    "          <input\n            type=\"number\"\n            min=\"1\"\n            max=\"500\"\n            value={options.count}\n            onChange={(event) => patchOptions({\n              count: Math.max(1, Math.min(500, Number(event.target.value) || 1)),\n            })}\n          />",
    "          <DraftNumberInput commitOnBlur min={1} max={500} value={options.count} onChange={(count) => patchOptions({ count })} />",
)
replace(
    'src/editor/ParametricRowEditorPanel.tsx',
    "                <input\n                  type=\"number\"\n                  min=\"1\"\n                  max={maxRowShapingChanges(shapingBase, binding.shaping.kind)}\n                  value={binding.shaping.count}\n                  onChange={(event) => updateShapingCount(Number(event.target.value) || 1)}\n                />",
    "                <DraftNumberInput commitOnBlur min={1} max={maxRowShapingChanges(shapingBase, binding.shaping.kind)} value={binding.shaping.count} onChange={updateShapingCount} />",
)
replace(
    'src/editor/ParametricRowEditorPanel.tsx',
    "                <input\n                  type=\"number\"\n                  min=\"1\"\n                  step=\"1\"\n                  value={options.spacing}\n                  onChange={(event) => patchOptions({ spacing: Math.max(1, Number(event.target.value) || 1) })}\n                />",
    "                <DraftNumberInput commitOnBlur min={1} step={1} value={options.spacing} onChange={(spacing) => patchOptions({ spacing })} />",
)
replace(
    'src/editor/ParametricRowEditorPanel.tsx',
    "                <input\n                  type=\"number\"\n                  min=\"1\"\n                  max={Math.max(1, Math.round(guide.ringCount))}\n                  value={options.ringIndex}\n                  onChange={(event) => patchOptions({\n                    ringIndex: Math.max(\n                      1,\n                      Math.min(Math.round(guide.ringCount), Math.round(Number(event.target.value) || 1)),\n                    ),\n                  })}\n                />",
    "                <DraftNumberInput commitOnBlur min={1} max={Math.max(1, Math.round(guide.ringCount))} value={options.ringIndex} onChange={(ringIndex) => patchOptions({ ringIndex: Math.round(ringIndex) })} />",
)
replace(
    'src/editor/ParametricRowEditorPanel.tsx',
    "              <input\n                type=\"number\"\n                step=\"1\"\n                value={options.radialOffset}\n                onChange={(event) => patchOptions({ radialOffset: Number(event.target.value) || 0 })}\n              />",
    "              <DraftNumberInput commitOnBlur step={1} value={options.radialOffset} onChange={(radialOffset) => patchOptions({ radialOffset })} />",
)
replace(
    'src/editor/ParametricRowEditorPanel.tsx',
    "              <input\n                type=\"number\"\n                step=\"1\"\n                value={options.rotationOffset}\n                onChange={(event) => patchOptions({ rotationOffset: Number(event.target.value) || 0 })}\n              />",
    "              <DraftNumberInput commitOnBlur step={1} value={options.rotationOffset} onChange={(rotationOffset) => patchOptions({ rotationOffset })} />",
)

# ---------------------------------------------------------------------------
# Persistence: metadata-only project listing and atomic document+summary writes.
# ---------------------------------------------------------------------------
write('src/editor/persistence.ts', dedent('''\
import type { CrochetProject } from '../types'

const DB_NAME = 'crochet-scheme-editor'
const DB_VERSION = 3
const LEGACY_STORE_NAME = 'autosave'
const PROJECTS_STORE_NAME = 'projects'
const SUMMARIES_STORE_NAME = 'project-summaries'
const LEGACY_CURRENT_KEY = 'current-project'
const ACTIVE_PROJECT_KEY = 'crochet-scheme-editor-active-project'
const DEFAULT_PROJECT_ID = 'default-project'

export type LocalProjectSummary = {
  id: string
  title: string
  updatedAt: string
}

function indexedDbAvailable() {
  return typeof window !== 'undefined' && 'indexedDB' in window
}

function randomProjectId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `project-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function summaryFor(id: string, project: CrochetProject): LocalProjectSummary {
  return {
    id,
    title: project.metadata?.title || 'Crochet scheme',
    updatedAt: project.metadata?.updatedAt || '',
  }
}

export function getActiveProjectId() {
  if (typeof window === 'undefined') return DEFAULT_PROJECT_ID
  return window.localStorage.getItem(ACTIVE_PROJECT_KEY) || DEFAULT_PROJECT_ID
}

export function setActiveProjectId(id: string) {
  if (typeof window !== 'undefined') window.localStorage.setItem(ACTIVE_PROJECT_KEY, id)
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (!indexedDbAvailable()) return Promise.resolve(null)

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      const transaction = request.transaction
      if (!database.objectStoreNames.contains(PROJECTS_STORE_NAME)) database.createObjectStore(PROJECTS_STORE_NAME)
      if (!database.objectStoreNames.contains(SUMMARIES_STORE_NAME)) database.createObjectStore(SUMMARIES_STORE_NAME)

      if (!transaction) return
      const projects = transaction.objectStore(PROJECTS_STORE_NAME)
      const summaries = transaction.objectStore(SUMMARIES_STORE_NAME)

      // Backfill summaries without pulling full project payloads during normal listing.
      const cursor = projects.openCursor()
      cursor.onsuccess = () => {
        const current = cursor.result
        if (!current) return
        const project = current.value as CrochetProject
        summaries.put(summaryFor(String(current.key), project), current.key)
        current.continue()
      }

      if (database.objectStoreNames.contains(LEGACY_STORE_NAME)) {
        const legacy = transaction.objectStore(LEGACY_STORE_NAME).get(LEGACY_CURRENT_KEY)
        legacy.onsuccess = () => {
          if (!legacy.result) return
          const project = legacy.result as CrochetProject
          projects.put(project, DEFAULT_PROJECT_ID)
          summaries.put(summaryFor(DEFAULT_PROJECT_ID, project), DEFAULT_PROJECT_ID)
        }
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open IndexedDB'))
  })
}

async function readProject(id: string): Promise<CrochetProject | null> {
  const database = await openDatabase()
  if (!database) return null
  try {
    return await new Promise<CrochetProject | null>((resolve, reject) => {
      const transaction = database.transaction(PROJECTS_STORE_NAME, 'readonly')
      const request = transaction.objectStore(PROJECTS_STORE_NAME).get(id)
      request.onsuccess = () => resolve((request.result as CrochetProject | undefined) ?? null)
      request.onerror = () => reject(request.error ?? new Error('Could not read project'))
    })
  } finally {
    database.close()
  }
}

async function writeProject(id: string, project: CrochetProject): Promise<void> {
  const database = await openDatabase()
  if (!database) return
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction([PROJECTS_STORE_NAME, SUMMARIES_STORE_NAME], 'readwrite')
      transaction.objectStore(PROJECTS_STORE_NAME).put(project, id)
      transaction.objectStore(SUMMARIES_STORE_NAME).put(summaryFor(id, project), id)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('Could not save project'))
      transaction.onabort = () => reject(transaction.error ?? new Error('Project transaction aborted'))
    })
  } finally {
    database.close()
  }
}

export async function loadAutosave(): Promise<CrochetProject | null> {
  return readProject(getActiveProjectId())
}

export async function saveAutosave(project: CrochetProject): Promise<void> {
  return writeProject(getActiveProjectId(), project)
}

export async function loadLocalProject(id: string) {
  return readProject(id)
}

export async function saveLocalProject(id: string, project: CrochetProject) {
  await writeProject(id, project)
}

export async function createLocalProject(project: CrochetProject) {
  const id = randomProjectId()
  await writeProject(id, project)
  setActiveProjectId(id)
  return id
}

export async function duplicateLocalProject(project: CrochetProject, title: string) {
  const copy: CrochetProject = {
    ...project,
    metadata: { title, updatedAt: new Date().toISOString() },
  }
  return createLocalProject(copy)
}

export async function listLocalProjects(): Promise<LocalProjectSummary[]> {
  const database = await openDatabase()
  if (!database) return []
  try {
    return await new Promise<LocalProjectSummary[]>((resolve, reject) => {
      const transaction = database.transaction(SUMMARIES_STORE_NAME, 'readonly')
      const request = transaction.objectStore(SUMMARIES_STORE_NAME).getAll()
      request.onsuccess = () => {
        const summaries = (request.result as LocalProjectSummary[]).slice()
        summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        resolve(summaries)
      }
      request.onerror = () => reject(request.error ?? new Error('Could not list projects'))
    })
  } finally {
    database.close()
  }
}

export async function deleteLocalProject(id: string): Promise<void> {
  const database = await openDatabase()
  if (!database) return
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction([PROJECTS_STORE_NAME, SUMMARIES_STORE_NAME], 'readwrite')
      transaction.objectStore(PROJECTS_STORE_NAME).delete(id)
      transaction.objectStore(SUMMARIES_STORE_NAME).delete(id)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('Could not delete project'))
    })
  } finally {
    database.close()
  }
}

export async function clearAutosave(): Promise<void> {
  await deleteLocalProject(getActiveProjectId())
}
'''))

# ---------------------------------------------------------------------------
# Repeat and snapping performance/resource budgets.
# ---------------------------------------------------------------------------
replace(
    'src/editor/productivity.ts',
    "const EPSILON = 1e-6\n",
    "const EPSILON = 1e-6\nexport const MAX_REPEAT_CREATED_ELEMENTS = 5_000\n",
)
replace(
    'src/editor/productivity.ts',
    "  const copies = clamp(Math.round(options.copies), 1, 100)\n  const created: StitchElement[] = []\n",
    "  const requestedCopies = clamp(Math.round(options.copies), 1, 100)\n  const copies = Math.min(requestedCopies, Math.floor(MAX_REPEAT_CREATED_ELEMENTS / source.length))\n  if (copies < 1) return []\n  const created: StitchElement[] = []\n",
)

replace(
    'src/editor/snapping.ts',
    "  } else {\n    winner = candidates\n      .map((candidate) => ({\n        candidate,\n        distancePx: distance(sourcePosition, candidate.point) * viewport.zoom,\n      }))\n      .filter(({ distancePx }) => distancePx <= settings.tolerancePx)\n      .sort((a, b) => a.distancePx - b.distancePx)[0]?.candidate\n  }\n",
    "  } else {\n    let bestDistance = Number.POSITIVE_INFINITY\n    for (const candidate of candidates) {\n      const distancePx = distance(sourcePosition, candidate.point) * viewport.zoom\n      if (distancePx <= settings.tolerancePx && distancePx < bestDistance) {\n        bestDistance = distancePx\n        winner = candidate\n      }\n    }\n  }\n",
)

# ---------------------------------------------------------------------------
# Project manager: destructive confirmation and surfaced IndexedDB errors.
# ---------------------------------------------------------------------------
replace(
    'src/editor/ProjectManagerPanel.tsx',
    "  const [nameDraft, setNameDraft] = useState(currentTitle)\n",
    "  const [nameDraft, setNameDraft] = useState(currentTitle)\n  const [error, setError] = useState('')\n",
)
replace(
    'src/editor/ProjectManagerPanel.tsx',
    "  const run = async (action: () => Promise<void>) => {\n    setBusy(true)\n    try {\n      await action()\n      await refresh()\n    } finally {\n      setBusy(false)\n    }\n  }\n",
    "  const run = async (action: () => Promise<void>) => {\n    setBusy(true)\n    setError('')\n    try {\n      await action()\n      await refresh()\n    } catch (reason) {\n      setError(reason instanceof Error ? reason.message : (locale === 'ru' ? 'Операция с проектом не выполнена' : 'Project operation failed'))\n    } finally {\n      setBusy(false)\n    }\n  }\n",
)
replace(
    'src/editor/ProjectManagerPanel.tsx',
    "          onClick={() => void run(() => onDelete(activeProjectId))}\n",
    "          onClick={() => {\n            const message = locale === 'ru'\n              ? `Удалить проект «${currentTitle}»? Это действие нельзя отменить.`\n              : `Delete “${currentTitle}”? This cannot be undone.`\n            if (window.confirm(message)) void run(() => onDelete(activeProjectId))\n          }}\n",
)
replace(
    'src/editor/ProjectManagerPanel.tsx',
    "      </div>\n    </section>\n  )\n}\n",
    "      </div>\n      {error && <p className=\"project-error\" role=\"alert\">{error}</p>}\n    </section>\n  )\n}\n",
)

# ---------------------------------------------------------------------------
# App: full-history snapshots, data-safe project transitions, semantic locks,
# bounded backgrounds and print readiness.
# ---------------------------------------------------------------------------
replace(
    'src/App.tsx',
    "import { clampBackgroundOpacity, fittedBackgroundImage } from './editor/backgroundImage'\n",
    "import { clampBackgroundOpacity, prepareBackgroundImage } from './editor/backgroundImage'\n",
)
replace(
    'src/App.tsx',
    "import { viewportForElements } from './editor/viewportFit'\n",
    "import { viewportForElements } from './editor/viewportFit'\nimport { semanticLockIds, semanticSelectionIds } from './editor/selectionModel'\n",
)
replace(
    'src/App.tsx',
    "  expandIdsToGroups,\n",
    "",
)
replace(
    'src/App.tsx',
    "  expandIdsToParametricRows,\n",
    "",
)
replace(
    'src/App.tsx',
    "type DocumentSnapshot = { elements: StitchElement[]; guides: Guide[]; rowMarkers: RowMarker[] }\n",
    "type DocumentSnapshot = {\n  elements: StitchElement[]\n  guides: Guide[]\n  rowMarkers: RowMarker[]\n  backgroundImage: BackgroundImage | null\n  legendVisible: boolean\n  snapping: SnappingSettings\n  projectTitle: string\n}\n",
)
replace(
    'src/App.tsx',
    "  const autosaveQueueRef = useRef<Promise<void>>(Promise.resolve())\n  const autosaveRevisionRef = useRef(0)\n",
    "  const autosaveQueueRef = useRef<Promise<void>>(Promise.resolve())\n  const autosaveTimerRef = useRef<number | null>(null)\n  const autosaveRevisionRef = useRef(0)\n",
)
replace(
    'src/App.tsx',
    "    const timeout = window.setTimeout(() => {\n",
    "    autosaveTimerRef.current = window.setTimeout(() => {\n      autosaveTimerRef.current = null\n",
)
replace(
    'src/App.tsx',
    "    return () => window.clearTimeout(timeout)\n",
    "    return () => {\n      if (autosaveTimerRef.current !== null) {\n        window.clearTimeout(autosaveTimerRef.current)\n        autosaveTimerRef.current = null\n      }\n    }\n",
)
replace(
    'src/App.tsx',
    "  const currentSnapshot = useCallback(\n    (): DocumentSnapshot => ({ elements, guides, rowMarkers }),\n    [elements, guides, rowMarkers],\n  )\n",
    "  const currentSnapshot = useCallback(\n    (): DocumentSnapshot => ({ elements, guides, rowMarkers, backgroundImage, legendVisible, snapping, projectTitle }),\n    [backgroundImage, elements, guides, legendVisible, projectTitle, rowMarkers, snapping],\n  )\n  const applySnapshot = useCallback((snapshot: DocumentSnapshot) => {\n    setElements(snapshot.elements)\n    setGuides(snapshot.guides)\n    setRowMarkers(snapshot.rowMarkers)\n    setBackgroundImage(snapshot.backgroundImage)\n    setLegendVisible(snapshot.legendVisible)\n    setSnapping(snapshot.snapping)\n    setProjectTitle(snapshot.projectTitle)\n  }, [])\n",
)
replace(
    'src/App.tsx',
    "  const commitRowMarkers = useCallback(\n    (next: RowMarker[]) => {\n      recordSnapshot(currentSnapshot())\n      setRowMarkers(next)\n    },\n    [currentSnapshot, recordSnapshot],\n  )\n\n  const clearElementSelection",
    "  const commitRowMarkers = useCallback(\n    (next: RowMarker[]) => {\n      recordSnapshot(currentSnapshot())\n      setRowMarkers(next)\n    },\n    [currentSnapshot, recordSnapshot],\n  )\n  const commitBackgroundImage = useCallback((next: BackgroundImage | null) => {\n    recordSnapshot(currentSnapshot())\n    setBackgroundImage(next)\n  }, [currentSnapshot, recordSnapshot])\n  const commitLegendVisible = useCallback((next: boolean) => {\n    recordSnapshot(currentSnapshot())\n    setLegendVisible(next)\n  }, [currentSnapshot, recordSnapshot])\n  const commitSnapping = useCallback((next: SnappingSettings) => {\n    recordSnapshot(currentSnapshot())\n    setSnapping(next)\n  }, [currentSnapshot, recordSnapshot])\n\n  const cancelPendingAutosave = useCallback(() => {\n    if (autosaveTimerRef.current !== null) {\n      window.clearTimeout(autosaveTimerRef.current)\n      autosaveTimerRef.current = null\n    }\n  }, [])\n  const enqueueProjectSave = useCallback((projectId: string, project: CrochetProject) => {\n    const task = autosaveQueueRef.current\n      .catch(() => undefined)\n      .then(() => saveLocalProject(projectId, project))\n    autosaveQueueRef.current = task\n    return task\n  }, [])\n  const flushCurrentProject = useCallback(async () => {\n    if (!hydrated) return\n    cancelPendingAutosave()\n    const revision = ++autosaveRevisionRef.current\n    const project = buildProject(projectTitle, elements, guides, snapping, rowMarkers, legendVisible, autosaveDelayMs, backgroundImage)\n    setAutosaveState('saving')\n    try {\n      await enqueueProjectSave(activeProjectId, project)\n      if (autosaveRevisionRef.current === revision) setAutosaveState(autosaveDelayMs === 0 ? 'off' : 'saved')\n    } catch {\n      if (autosaveRevisionRef.current === revision) setAutosaveState('error')\n      throw new Error(locale === 'ru' ? 'Не удалось сохранить текущий проект' : 'Could not save current project')\n    }\n  }, [activeProjectId, autosaveDelayMs, backgroundImage, cancelPendingAutosave, elements, enqueueProjectSave, guides, hydrated, legendVisible, locale, projectTitle, rowMarkers, snapping])\n\n  const clearElementSelection",
)
replace(
    'src/App.tsx',
    "    setElements(step.value.elements)\n    setGuides(step.value.guides)\n    setRowMarkers(step.value.rowMarkers)\n",
    "    applySnapshot(step.value)\n",
    count=2,
)
replace(
    'src/App.tsx',
    "  }, [clearElementSelection, currentSnapshot, history, t.statusUndo])\n",
    "  }, [applySnapshot, clearElementSelection, currentSnapshot, history, t.statusUndo])\n",
)
replace(
    'src/App.tsx',
    "  }, [clearElementSelection, currentSnapshot, history, t.statusRedo])\n",
    "  }, [applySnapshot, clearElementSelection, currentSnapshot, history, t.statusRedo])\n",
)
replace(
    'src/App.tsx',
    "      const deletable = new Set(expandIdsToParametricRows(elements, unlockedSelectedIds()))\n",
    "      const deletable = new Set(semanticSelectionIds(elements, unlockedSelectedIds(), { expandGroups: false, expandRows: true }))\n",
)
replace(
    'src/App.tsx',
    "    const manualIds = elements\n      .filter((element) => unlocked.has(element.id) && !element.parametricRow)\n      .map((element) => element.id)\n    const expanded = expandIdsToGroups(elements, manualIds)\n    return expanded.filter((id) => {\n      const element = elements.find((item) => item.id === id)\n      return Boolean(element && !isElementLocked(element) && !element.parametricRow)\n    })\n",
    "    return elements\n      .filter((element) => unlocked.has(element.id) && !element.parametricRow)\n      .map((element) => element.id)\n",
)
replace(
    'src/App.tsx',
    "    const copyIds = new Set(expandIdsToGroups(elements, unlockedSelectedIds()))\n",
    "    const copyIds = new Set(unlockedSelectedIds())\n",
)
replace(
    'src/App.tsx',
    "      const duplicateIds = new Set(expandIdsToGroups(elements, [...selected]))\n",
    "      const duplicateIds = selected\n",
)
replace(
    'src/App.tsx',
    "    const selectable = elements.filter(\n      (element) => isElementVisible(element) && !isElementLocked(element),\n    )\n    if (!selectable.length) return\n    setSelectedIds(selectable.map((element) => element.id))\n",
    "    const selectable = elements.filter((element) => isElementVisible(element) && !isElementLocked(element))\n    const ids = semanticSelectionIds(elements, selectable.map((element) => element.id), { visibleSeedsOnly: true })\n    if (!ids.length) return\n    setSelectedIds(ids)\n",
)
replace(
    'src/App.tsx',
    "    setStatus(`${t.selectedCount}: ${selectable.length}`)\n  }, [elements, t.selectedCount])\n",
    "    setStatus(`${t.selectedCount}: ${ids.length}`)\n  }, [elements, t.selectedCount])\n",
)
replace(
    'src/App.tsx',
    "      const targetIds = expandIdsToGroups(elements, expandIdsToParametricRows(elements, [id]))\n",
    "      const targetIds = semanticSelectionIds(elements, [id])\n",
)
replace(
    'src/App.tsx',
    "    const nextLocked = !isElementLocked(element)\n    commitElements(\n      elements.map((item) => item.id === id ? { ...item, locked: nextLocked } : item),\n    )\n    if (nextLocked) setSelectedIds((current) => current.filter((item) => item !== id))\n",
    "    const lockIds = new Set(semanticLockIds(elements, id))\n    const nextLocked = !isElementLocked(element)\n    commitElements(elements.map((item) => lockIds.has(item.id) ? { ...item, locked: nextLocked } : item))\n    if (nextLocked) setSelectedIds((current) => current.filter((item) => !lockIds.has(item)))\n",
)
replace(
    'src/App.tsx',
    "    setSnapping((current) => ({ ...current, enabled }))\n",
    "    commitSnapping({ ...snapping, enabled })\n",
)
replace(
    'src/App.tsx',
    "  }, [locale, snapping.enabled])\n",
    "  }, [commitSnapping, locale, snapping])\n",
)
replace(
    'src/App.tsx',
    "        const expandedHits = expandIdsToGroups(\n          elements,\n          expandIdsToParametricRows(elements, hits),\n        )\n",
    "        const expandedHits = semanticSelectionIds(elements, hits, { visibleSeedsOnly: true })\n",
)
replace(
    'src/App.tsx',
    "        const next = expandIdsToGroups(\n          elements,\n          expandIdsToParametricRows(elements, uniqueIds([...marquee.baseIds, ...hits])),\n        )\n",
    "        const next = semanticSelectionIds(elements, uniqueIds([...marquee.baseIds, ...hits]), { visibleSeedsOnly: false })\n",
)
replace(
    'src/App.tsx',
    "    if (element.parametricRow) {\n      const rowIds = rowElements(elements, element.parametricRow.id).map((item) => item.id)\n",
    "    if (element.parametricRow) {\n      const rowIds = semanticSelectionIds(elements, [element.id], { expandGroups: false, expandRows: true })\n      if (!rowIds.length) return\n",
)
replace(
    'src/App.tsx',
    "    const targetIds = element.groupId && !event.altKey\n      ? elements.filter((item) => item.groupId === element.groupId).map((item) => item.id)\n      : [element.id]\n",
    "    const targetIds = event.altKey\n      ? [element.id]\n      : semanticSelectionIds(elements, [element.id], { expandGroups: true, expandRows: false })\n    if (!targetIds.length) return\n",
)

# Safe project transitions and deletion serialization.
replace(
    'src/App.tsx',
    "  const openLocalProjectDocument = (project: CrochetProject, id: string) => {\n    const normalized = normalizeProject(project, DEFAULT_SNAPPING)\n",
    "  const openLocalProjectDocument = (project: CrochetProject, id: string) => {\n    cancelPendingAutosave()\n    autosaveRevisionRef.current += 1\n    const normalized = normalizeProject(project, DEFAULT_SNAPPING)\n",
)
replace(
    'src/App.tsx',
    "  const handleOpenLocalProject = async (id: string) => {\n    const project = await loadLocalProject(id)\n",
    "  const handleOpenLocalProject = async (id: string) => {\n    if (id === activeProjectId) return\n    await flushCurrentProject()\n    const project = await loadLocalProject(id)\n",
)
replace(
    'src/App.tsx',
    "  const handleNewLocalProject = async () => {\n    const existing = await listLocalProjects()\n",
    "  const handleNewLocalProject = async () => {\n    await flushCurrentProject()\n    const existing = await listLocalProjects()\n",
)
replace(
    'src/App.tsx',
    "  const handleDuplicateLocalProject = async () => {\n    const title = projectTitle + (locale === 'ru' ? ' — копия' : ' — copy')\n",
    "  const handleDuplicateLocalProject = async () => {\n    await flushCurrentProject()\n    const title = projectTitle + (locale === 'ru' ? ' — копия' : ' — copy')\n",
)
replace(
    'src/App.tsx',
    "  const handleDeleteLocalProject = async (id: string) => {\n    await deleteLocalProject(id)\n    const remaining = await listLocalProjects()\n    if (remaining[0]) {\n      await handleOpenLocalProject(remaining[0].id)\n    } else {\n      await handleNewLocalProject()\n    }\n  }\n",
    "  const handleDeleteLocalProject = async (id: string) => {\n    if (id === activeProjectId) {\n      cancelPendingAutosave()\n      await autosaveQueueRef.current.catch(() => undefined)\n      autosaveRevisionRef.current += 1\n    }\n    await deleteLocalProject(id)\n    const remaining = await listLocalProjects()\n    if (remaining[0]) {\n      const project = await loadLocalProject(remaining[0].id)\n      if (project) openLocalProjectDocument(project, remaining[0].id)\n      return\n    }\n    const base = locale === 'ru' ? 'Новая схема' : 'New pattern'\n    const project = buildProject(`${base} 1`, [], [], DEFAULT_SNAPPING)\n    const nextId = await createLocalProject(project)\n    openLocalProjectDocument(project, nextId)\n  }\n",
)
replace(
    'src/App.tsx',
    "  const handleAutosaveDelayChange = (delayMs: AutosaveDelayMs) => {\n    autosaveSettingsWriteRef.current = delayMs\n",
    "  const handleAutosaveDelayChange = (delayMs: AutosaveDelayMs) => {\n    cancelPendingAutosave()\n    autosaveSettingsWriteRef.current = delayMs\n",
)

# Background upload/editing is now bounded and undoable.
start = read('src/App.tsx').index('  const handleBackgroundUpload = async (file: File) => {')
end = read('src/App.tsx').index('\nconst openTiledPrint', start)
text = read('src/App.tsx')
new_background_block = dedent('''\
  const handleBackgroundUpload = async (file: File) => {
    const projectIdAtStart = activeProjectId
    try {
      const rect = svgRef.current?.getBoundingClientRect()
      const center = rect
        ? screenToDocument({ x: rect.width / 2, y: rect.height / 2 }, viewport)
        : { x: 0, y: 0 }
      const prepared = await prepareBackgroundImage(file, center)
      if (getActiveProjectId() !== projectIdAtStart) return
      commitBackgroundImage(prepared)
      setStatus(locale === 'ru' ? 'Фоновое изображение добавлено' : 'Background image added')
    } catch (error) {
      const fallback = locale === 'ru' ? 'Не удалось добавить изображение' : 'Could not add image'
      setStatus(error instanceof Error ? error.message : fallback)
    }
  }

  const updateBackgroundImage = (patch: Partial<BackgroundImage>) => {
    if (!backgroundImage) return
    commitBackgroundImage({
      ...backgroundImage,
      ...patch,
      width: patch.width === undefined ? backgroundImage.width : Math.max(1, patch.width),
      height: patch.height === undefined ? backgroundImage.height : Math.max(1, patch.height),
      opacity: patch.opacity === undefined ? backgroundImage.opacity : clampBackgroundOpacity(patch.opacity),
    })
  }

  const removeBackgroundImage = () => {
    if (!backgroundImage) return
    commitBackgroundImage(null)
    setStatus(locale === 'ru' ? 'Фоновое изображение удалено' : 'Background image removed')
  }
''')
write('src/App.tsx', text[:start] + new_background_block + text[end:])

# Print only after embedded background images decode.
replace(
    'src/App.tsx',
    "  popup.document.close()\n  window.setTimeout(() => popup.print(), 150)\n  setStatus(locale === 'ru' ? 'Макет печати открыт' : 'Print layout opened')\n",
    "  popup.document.close()\n  const images = Array.from(popup.document.images)\n  void Promise.all(images.map(async (image) => {\n    if (!image.complete) {\n      await new Promise<void>((resolve) => {\n        image.addEventListener('load', () => resolve(), { once: true })\n        image.addEventListener('error', () => resolve(), { once: true })\n      })\n    }\n    if ('decode' in image) await image.decode().catch(() => undefined)\n  })).then(() => {\n    popup.focus()\n    popup.print()\n  })\n  setStatus(locale === 'ru' ? 'Макет печати открыт' : 'Print layout opened')\n",
)

# Loading JSON is a document boundary, not a partial undo transaction.
replace(
    'src/App.tsx',
    "      const raw = JSON.parse(await file.text()) as CrochetProject\n      if (\n        ![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].includes(raw.schemaVersion) ||\n        !Array.isArray(raw.elements)\n      ) {\n        throw new Error(t.unsupportedProject)\n      }\n      const project = normalizeProject(raw, DEFAULT_SNAPPING)\n      setProjectTitle(project.metadata.title)\n      setHistory({ past: [currentSnapshot()], future: [] })\n",
    "      const raw = JSON.parse(await file.text()) as unknown\n      const project = normalizeProject(raw, DEFAULT_SNAPPING)\n      setProjectTitle(project.metadata.title)\n      setHistory(emptyHistory<DocumentSnapshot>())\n",
)

# Persisted settings participate in history.
replace(
    'src/App.tsx',
    "                setSnapping((value) => ({ ...value, enabled: event.target.checked }))\n",
    "                commitSnapping({ ...snapping, enabled: event.target.checked })\n",
)
replace(
    'src/App.tsx',
    "onClick={() => setSnapping((value) => ({ ...value, sourceAnchor: anchor }))}",
    "onClick={() => commitSnapping({ ...snapping, sourceAnchor: anchor })}",
    count=1,
)
replace(
    'src/App.tsx',
    "<select value={snapping.orientationMode} onChange={(event) => setSnapping((value) => ({ ...value, orientationMode: event.target.value as OrientationMode }))}>",
    "<select value={snapping.orientationMode} onChange={(event) => commitSnapping({ ...snapping, orientationMode: event.target.value as OrientationMode })}>",
)
replace(
    'src/App.tsx',
    "onChange={(event) => setSnapping((value) => ({ ...value, snapToVertices: event.target.checked }))}",
    "onChange={(event) => commitSnapping({ ...snapping, snapToVertices: event.target.checked })}",
)
replace(
    'src/App.tsx',
    "onChange={(event) => setSnapping((value) => ({ ...value, tolerancePx: Number(event.target.value) }))}",
    "onChange={(event) => commitSnapping({ ...snapping, tolerancePx: Number(event.target.value) })}",
)
replace(
    'src/App.tsx',
    "<input type=\"checkbox\" checked={legendVisible} onChange={(event) => setLegendVisible(event.target.checked)} />",
    "<input type=\"checkbox\" checked={legendVisible} onChange={(event) => commitLegendVisible(event.target.checked)} />",
)

# ---------------------------------------------------------------------------
# CI: deterministic installs and actual E2E gate for deployments.
# ---------------------------------------------------------------------------
write('.github/workflows/ci.yml', dedent('''\
name: CI

on:
  pull_request:
  workflow_dispatch:

permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v6
      - name: Setup Node
        uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: npm
      - name: Install dependencies
        run: npm ci --no-audit --no-fund
      - name: Typecheck, test and build
        run: npm run build

  e2e:
    runs-on: ubuntu-latest
    needs: verify
    steps:
      - name: Checkout
        uses: actions/checkout@v6
      - name: Setup Node
        uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: npm
      - name: Install dependencies
        run: npm ci --no-audit --no-fund
      - name: Install Chromium
        run: npx playwright install --with-deps chromium
      - name: Build preview
        run: npx vite build
      - name: Run Playwright E2E
        run: npm run test:e2e
'''))

write('.github/workflows/deploy-pages.yml', dedent('''\
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v6
      - name: Setup Node
        uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: npm
      - name: Install dependencies
        run: npm ci --no-audit --no-fund
      - name: Build and unit verification
        run: npm run build
      - name: Install Chromium
        run: npx playwright install --with-deps chromium
      - name: Chromium release gate
        run: npm run test:e2e
      - name: Configure Pages
        uses: actions/configure-pages@v5
      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v4
        with:
          path: ./dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
'''))

# ---------------------------------------------------------------------------
# Regression coverage.
# ---------------------------------------------------------------------------
write('src/editor/projectIntegrity.test.ts', dedent('''\
import { describe, expect, it } from 'vitest'
import type { CrochetProject, SnappingSettings } from '../types'
import { parseProject } from './projectSchema'

const snapping: SnappingSettings = { enabled: true, sourceAnchor: 'bottom', orientationMode: 'none', snapToVertices: true, tolerancePx: 12 }
const base = (): CrochetProject => ({
  schemaVersion: 17,
  metadata: { title: 'Test', updatedAt: '2026-08-26T00:00:00Z' },
  elements: [{ id: 'a', symbolId: 'single', x: 0, y: 0, rotation: 0 }],
  guides: [], rowMarkers: [], settings: { snapping },
})

describe('project integrity validation', () => {
  it('rejects duplicate ids and unknown symbols', () => {
    const duplicate = base() as any
    duplicate.elements.push({ ...duplicate.elements[0] })
    expect(() => parseProject(duplicate, snapping)).toThrow('Duplicate stitch element id')
    const unknown = base() as any
    unknown.elements[0].symbolId = 'mystery-stitch'
    expect(() => parseProject(unknown, snapping)).toThrow('Unknown stitch symbol')
  })

  it('rejects guide resource bombs before rendering', () => {
    const project = base() as any
    project.guides = [{ id: 'grid', type: 'grid', origin: { x: 0, y: 0 }, rows: 100000000, columns: 2, spacingX: 20, spacingY: 20, rotation: 0, visible: true }]
    expect(() => parseProject(project, snapping)).toThrow('Grid guide dimensions are out of bounds')
  })

  it('rejects broken cross references', () => {
    const project = base() as any
    project.elements[0].parentStitchIds = ['missing']
    expect(() => parseProject(project, snapping)).toThrow('missing parent')
  })
})
'''))

write('src/editor/productivityBudget.test.ts', dedent('''\
import { describe, expect, it } from 'vitest'
import type { StitchElement } from '../types'
import { MAX_REPEAT_CREATED_ELEMENTS, repeatSelection } from './productivity'

describe('repeat operation budget', () => {
  it('caps generated stitches for large motifs', () => {
    const elements: StitchElement[] = Array.from({ length: 200 }, (_, index) => ({
      id: `s-${index}`, symbolId: 'single', x: index, y: 0, rotation: 0,
    }))
    let serial = 0
    const created = repeatSelection(elements, elements.map((item) => item.id), { mode: 'linear', copies: 100, deltaX: 10, deltaY: 0 }, () => `copy-${serial++}`)
    expect(created.length).toBeLessThanOrEqual(MAX_REPEAT_CREATED_ELEMENTS)
    expect(created.length).toBeGreaterThan(0)
  })
})
'''))

write('e2e/dataIntegrity.e2e.ts', dedent('''\
import { expect, test, type Page } from '@playwright/test'

async function placeSingleCrochet(page: Page) {
  const canvas = page.locator('svg.editor-canvas')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas is not visible')
  await page.getByRole('button', { name: 'Столбик без накида' }).click()
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
}

test('flushes pending edits before switching local projects', async ({ page }) => {
  await page.goto('/Crochet-Scheme-Editor/')
  await page.getByLabel('Автосохранение').selectOption('60000')
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
  const projectSelect = page.locator('.project-select')
  const originalId = await projectSelect.inputValue()

  await placeSingleCrochet(page)
  await page.getByRole('button', { name: 'Новая', exact: true }).click()
  await expect(page.locator('.stitch-element')).toHaveCount(0)

  await projectSelect.selectOption(originalId)
  await expect(page.locator('.stitch-element')).toHaveCount(1)
})

test('does not resurrect a deleted project while autosave is pending', async ({ page }) => {
  await page.goto('/Crochet-Scheme-Editor/')
  await page.getByRole('button', { name: 'Новая', exact: true }).click()
  await expect(page.locator('.project-select option')).toHaveCount(2)
  await page.getByLabel('Автосохранение').selectOption('60000')
  await placeSingleCrochet(page)

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Удалить', exact: true }).click()
  await expect(page.locator('.project-select option')).toHaveCount(1)
  await page.waitForTimeout(1000)
  await page.reload()
  await expect(page.locator('.project-select option')).toHaveCount(1)
})

test('loading JSON starts a clean document history', async ({ page }) => {
  await page.goto('/Crochet-Scheme-Editor/')
  await placeSingleCrochet(page)
  const project = {
    schemaVersion: 17,
    metadata: { title: 'Imported', updatedAt: '2026-08-26T00:00:00Z' },
    elements: [], guides: [], rowMarkers: [],
    settings: { snapping: { enabled: false, sourceAnchor: 'center', orientationMode: 'none', snapToVertices: false, tolerancePx: 12 }, legend: { visible: false }, autosave: { delayMs: 650 } },
  }
  await page.locator('input[type=file][accept*="json"]').setInputFiles({ name: 'import.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) })
  await expect(page.locator('.stitch-element')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Отменить' })).toBeDisabled()
})
'''))

# Keep the patch script out of the resulting application commit.
print('stabilization patch applied')

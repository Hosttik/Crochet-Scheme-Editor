import type {
  AutosaveDelayMs,
  BackgroundImage,
  CrochetProject,
  GaugeProfile,
  GaugeSettings,
  Guide,
  GuideAttachment,
  MeasurementRuler,
  ParametricRowBinding,
  RowProgram,
  RowMarker,
  SnappingSettings,
  StitchElement,
  StitchGeometry,
} from '../types'
import { isStitchColor } from './elementColor'
import { rowProgramMetrics } from './rowProgram'
import { MAX_GAUGE_PROFILES, MAX_PROJECT_ELEMENTS, MAX_PROJECT_GUIDES, MAX_PROJECT_ROW_MARKERS, MAX_PROJECT_RULERS, projectIntegrityIssue } from './projectIntegrity'
import { CURRENT_PROJECT_SCHEMA_VERSION, MIN_PROJECT_SCHEMA_VERSION, STRICT_PROJECT_SCHEMA_VERSION } from './projectVersion'

export class ProjectValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProjectValidationError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function positiveInteger(value: unknown, max: number) {
  return finite(value) && Number.isInteger(value) && value >= 1 && value <= max
}

function nonNegativeInteger(value: unknown, max: number) {
  return finite(value) && Number.isInteger(value) && value >= 0 && value <= max
}

function optionalBoolean(value: unknown) {
  return value === undefined || typeof value === 'boolean'
}

function optionalStringArray(value: unknown) {
  return value === undefined || (
    Array.isArray(value) && value.length > 0 && value.every(nonEmptyString)
  )
}

function point(value: unknown) {
  return isRecord(value) && finite(value.x) && finite(value.y)
}

function validateRowSequence(value: unknown) {
  if (value === undefined) return
  if (!isRecord(value) || !Array.isArray(value.items) || value.items.length === 0 || value.items.length > 50) {
    throw new ProjectValidationError('Invalid row sequence')
  }
  for (const item of value.items) {
    if (!isRecord(item) || !nonEmptyString(item.symbolId) || !positiveInteger(item.count, 500)) {
      throw new ProjectValidationError('Invalid row sequence item')
    }
  }
}

function validateProgramLeaf(value: unknown) {
  if (!isRecord(value)) throw new ProjectValidationError('Invalid row program leaf')
  if (
    !['stitch', 'increase', 'decrease'].includes(String(value.kind)) ||
    !nonEmptyString(value.symbolId) ||
    !positiveInteger(value.count, 500)
  ) throw new ProjectValidationError('Invalid row program leaf')
}

function validateRowProgram(value: unknown) {
  if (value === undefined) return
  if (
    !isRecord(value) || !positiveInteger(value.repeat, 100) ||
    !Array.isArray(value.items) || value.items.length === 0 || value.items.length > 50
  ) throw new ProjectValidationError('Invalid row program')

  for (const item of value.items) {
    if (!isRecord(item)) throw new ProjectValidationError('Invalid row program item')
    if (item.kind === 'group') {
      if (
        !positiveInteger(item.repeat, 100) || !Array.isArray(item.items) ||
        item.items.length === 0 || item.items.length > 50
      ) throw new ProjectValidationError('Invalid row program group')
      item.items.forEach(validateProgramLeaf)
    } else validateProgramLeaf(item)
  }

  const metrics = rowProgramMetrics(value as unknown as RowProgram)
  if (metrics.producedChildren > 500 || metrics.consumedParents > 500) {
    throw new ProjectValidationError('Rich row program exceeds editor limits')
  }
}

function validateRowConstruction(value: unknown) {
  if (value === undefined) return
  if (
    !isRecord(value) ||
    !['spiral', 'joined', 'turning'].includes(String(value.mode)) ||
    !['along', 'reverse'].includes(String(value.direction)) ||
    !nonNegativeInteger(value.startChainCount, 10) ||
    typeof value.joinWithSlipStitch !== 'boolean' ||
    !optionalBoolean(value.startChainCountsAsStitch) ||
    !(value.skipFirstStitches === undefined || nonNegativeInteger(value.skipFirstStitches, 10)) ||
    !(value.joinTarget === undefined || ['first-stitch', 'start-chain-top'].includes(String(value.joinTarget)))
  ) throw new ProjectValidationError('Invalid row construction')

  if (value.startChainCountsAsStitch === true && value.startChainCount === 0) {
    throw new ProjectValidationError('Counted starting chain requires starting chains')
  }

  if (value.mode === 'spiral') {
    if (
      value.startChainCount !== 0 ||
      value.joinWithSlipStitch !== false ||
      value.startChainCountsAsStitch === true ||
      (value.skipFirstStitches !== undefined && value.skipFirstStitches !== 0) ||
      (value.joinTarget !== undefined && value.joinTarget !== 'first-stitch')
    ) throw new ProjectValidationError('Invalid spiral construction')
  }

  if (value.mode === 'turning') {
    if (
      value.joinWithSlipStitch !== false ||
      (value.joinTarget !== undefined && value.joinTarget !== 'first-stitch')
    ) throw new ProjectValidationError('Invalid turning construction')
  }

  if (
    value.mode === 'joined' &&
    value.joinTarget === 'start-chain-top' &&
    (value.joinWithSlipStitch !== true || value.startChainCount === 0)
  ) {
    throw new ProjectValidationError('Starting-chain join target requires a joined row with starting chains')
  }
}

function parseParametricRow(value: unknown): ParametricRowBinding | undefined {
  if (value === undefined) return undefined
  if (!isRecord(value)) throw new ProjectValidationError('Invalid parametric row binding')
  if (!nonEmptyString(value.id) || !nonEmptyString(value.guideId) || !nonEmptyString(value.symbolId)) {
    throw new ProjectValidationError('Parametric row is missing ids')
  }
  if (!isRecord(value.options)) throw new ProjectValidationError('Parametric row options are missing')
  const options = value.options
  if (
    (options.distributionMode !== 'count' && options.distributionMode !== 'spacing') ||
    !finite(options.count) || !finite(options.spacing) ||
    (options.orientation !== 'tangent' && options.orientation !== 'radial' && options.orientation !== 'fixed') ||
    !finite(options.rotationOffset) || !finite(options.radialOffset) || !finite(options.ringIndex)
  ) throw new ProjectValidationError('Invalid parametric row options')
  if (value.patternOrder !== undefined && !finite(value.patternOrder)) throw new ProjectValidationError('Invalid row order')
  if (value.parentRowId !== undefined && !nonEmptyString(value.parentRowId)) throw new ProjectValidationError('Invalid parent row id')
  if (value.generatedRadialOffset !== undefined && !finite(value.generatedRadialOffset)) {
    throw new ProjectValidationError('Invalid generated radial offset')
  }
  if (value.shaping !== undefined) {
    if (!isRecord(value.shaping)) throw new ProjectValidationError('Invalid row shaping')
    if (
      (value.shaping.kind !== 'increase' && value.shaping.kind !== 'decrease') ||
      !finite(value.shaping.count) || !finite(value.shaping.baseCount)
    ) throw new ProjectValidationError('Invalid row shaping')
  }
  if (value.topologyOverride !== undefined) {
    if (!isRecord(value.topologyOverride) || !Array.isArray(value.topologyOverride.changeParentIds)) {
      throw new ProjectValidationError('Invalid topology override')
    }
    const ids = value.topologyOverride.changeParentIds
    if (ids.length === 0 || !ids.every(nonEmptyString) || new Set(ids).size !== ids.length || value.shaping === undefined) {
      throw new ProjectValidationError('Invalid topology override')
    }
  }
  validateRowSequence(value.sequence)
  validateRowProgram(value.program)
  validateRowConstruction(value.construction)
  if (value.program !== undefined && value.sequence !== undefined) {
    throw new ProjectValidationError('Row cannot contain both sequence and rich program')
  }
  if (value.program !== undefined && (value.shaping !== undefined || value.topologyOverride !== undefined)) {
    throw new ProjectValidationError('Rich row program owns shaping and topology')
  }
  return value as unknown as ParametricRowBinding
}

function parseGuideAttachment(value: unknown): GuideAttachment | undefined {
  if (value === undefined) return undefined
  if (
    !isRecord(value) ||
    !nonEmptyString(value.guideId) ||
    !finite(value.t) || value.t < 0 || value.t > 1 ||
    !['keep', 'tangent', 'normal'].includes(String(value.orientation)) ||
    !finite(value.rotationOffset) ||
    !finite(value.normalOffset)
  ) throw new ProjectValidationError('Invalid guide attachment')
  return value as unknown as GuideAttachment
}

function parseStitchGeometry(value: unknown): StitchGeometry | undefined {
  if (value === undefined) return undefined
  if (!isRecord(value)) throw new ProjectValidationError('Invalid stitch geometry')
  const validScale = (candidate: unknown) => candidate === undefined || (finite(candidate) && candidate >= 0.35 && candidate <= 3)
  const validSpread = (candidate: unknown) => candidate === undefined || (finite(candidate) && candidate >= 0.45 && candidate <= 2.5)
  if (!validScale(value.scaleX) || !validScale(value.scaleY) || !validSpread(value.spread)) {
    throw new ProjectValidationError('Invalid stitch geometry')
  }
  if (value.scaleX === undefined && value.scaleY === undefined && value.spread === undefined) return undefined
  return {
    scaleX: value.scaleX as number | undefined,
    scaleY: value.scaleY as number | undefined,
    spread: value.spread as number | undefined,
  }
}

function parseElement(value: unknown): StitchElement {
  if (!isRecord(value)) throw new ProjectValidationError('Invalid stitch element')
  if (
    !nonEmptyString(value.id) || !nonEmptyString(value.symbolId) ||
    !finite(value.x) || !finite(value.y) || !finite(value.rotation) ||
    !(value.color === undefined || isStitchColor(value.color)) ||
    !optionalBoolean(value.mirrored) ||
    !optionalBoolean(value.visible) || !optionalBoolean(value.locked) ||
    !(value.groupId === undefined || nonEmptyString(value.groupId)) ||
    !optionalStringArray(value.parentStitchIds)
  ) throw new ProjectValidationError('Invalid stitch element fields')
  const parametricRow = parseParametricRow(value.parametricRow)
  const guideAttachment = parseGuideAttachment(value.guideAttachment)
  const geometry = parseStitchGeometry(value.geometry)
  if (parametricRow && guideAttachment) {
    throw new ProjectValidationError('Parametric rows cannot also use manual guide attachments')
  }
  return {
    id: value.id,
    symbolId: value.symbolId,
    x: value.x,
    y: value.y,
    rotation: value.rotation,
    color: typeof value.color === 'string' ? value.color.toLowerCase() : undefined,
    mirrored: value.mirrored === true,
    geometry,
    visible: value.visible !== false,
    locked: value.locked === true,
    groupId: value.groupId as string | undefined,
    parametricRow,
    parentStitchIds: value.parentStitchIds as string[] | undefined,
    guideAttachment,
  }
}

function parseGuide(value: unknown): Guide {
  if (!isRecord(value) || !nonEmptyString(value.id) || typeof value.visible !== 'boolean' || !optionalBoolean(value.locked)) throw new ProjectValidationError('Invalid guide')
  if (value.type === 'arc') {
    if (!point(value.center) || !finite(value.radius) || !finite(value.startAngle) || !finite(value.endAngle) || !finite(value.divisions)) throw new ProjectValidationError('Invalid arc guide')
    return value as unknown as Guide
  }
  if (value.type === 'line') {
    if (!point(value.start) || !point(value.end) || !finite(value.divisions)) throw new ProjectValidationError('Invalid line guide')
    return value as unknown as Guide
  }
  if (value.type === 'curve') {
    if (!point(value.start) || !point(value.control1) || !point(value.control2) || !point(value.end) || !finite(value.divisions)) throw new ProjectValidationError('Invalid curve guide')
    return value as unknown as Guide
  }
  if (value.type === 'parabola') {
    if (!point(value.start) || !point(value.control) || !point(value.end) || !finite(value.divisions)) throw new ProjectValidationError('Invalid parabola guide')
    return value as unknown as Guide
  }
  if (value.type === 'grid') {
    if (!point(value.origin) || !finite(value.rows) || !finite(value.columns) || !finite(value.spacingX) || !finite(value.spacingY) || !finite(value.rotation)) throw new ProjectValidationError('Invalid grid guide')
    return value as unknown as Guide
  }
  if (value.type === 'radial-grid') {
    if (!point(value.center) || !finite(value.ringCount) || !finite(value.ringSpacing) || !finite(value.sectorCount) || !finite(value.startAngle)) throw new ProjectValidationError('Invalid radial guide')
    return value as unknown as Guide
  }
  throw new ProjectValidationError('Unknown guide type')
}

function parseRowMarker(value: unknown): RowMarker {
  if (
    !isRecord(value) || !nonEmptyString(value.id) ||
    !positiveInteger(value.number, MAX_PROJECT_ROW_MARKERS) || !finite(value.x) || !finite(value.y) ||
    !optionalBoolean(value.visible) || !optionalBoolean(value.locked)
  ) throw new ProjectValidationError('Invalid row marker')
  return {
    id: value.id,
    number: value.number as number,
    x: value.x,
    y: value.y,
    visible: value.visible !== false,
    locked: value.locked === true,
  }
}

function parseBackgroundImage(value: unknown): BackgroundImage | undefined {
  if (value === undefined) return undefined
  if (
    !isRecord(value) ||
    !nonEmptyString(value.dataUrl) || !value.dataUrl.startsWith('data:image/') || value.dataUrl.length > 25_000_000 ||
    !(value.sourceName === undefined || typeof value.sourceName === 'string') ||
    !finite(value.x) || !finite(value.y) ||
    !finite(value.width) || value.width <= 0 ||
    !finite(value.height) || value.height <= 0 ||
    !(value.rotation === undefined || finite(value.rotation)) ||
    !finite(value.opacity) || value.opacity < 0 || value.opacity > 1 ||
    !optionalBoolean(value.visible) || !optionalBoolean(value.locked) || !optionalBoolean(value.includeInExport)
  ) throw new ProjectValidationError('Invalid background image')
  return {
    dataUrl: value.dataUrl,
    sourceName: value.sourceName as string | undefined,
    x: value.x,
    y: value.y,
    width: value.width,
    height: value.height,
    rotation: finite(value.rotation) ? value.rotation : 0,
    opacity: value.opacity,
    visible: value.visible !== false,
    locked: value.locked === true,
    includeInExport: value.includeInExport === true,
  }
}

function parseGaugeProfile(value: unknown): GaugeProfile {
  if (!isRecord(value)) throw new ProjectValidationError('Invalid gauge profile')
  if (
    !nonEmptyString(value.id) || typeof value.name !== 'string' || !nonEmptyString(value.symbolId) ||
    !positiveInteger(value.stitchCount, 10_000) || !positiveInteger(value.rowCount, 10_000) ||
    !finite(value.widthCm) || value.widthCm <= 0 || value.widthCm > 10_000 ||
    !finite(value.heightCm) || value.heightCm <= 0 || value.heightCm > 10_000
  ) throw new ProjectValidationError('Invalid gauge profile')
  return {
    id: value.id,
    name: value.name,
    symbolId: value.symbolId,
    stitchCount: value.stitchCount as number,
    rowCount: value.rowCount as number,
    widthCm: value.widthCm,
    heightCm: value.heightCm,
  }
}

function parseGauge(value: unknown): GaugeSettings {
  if (value === undefined) return { profiles: [] }
  if (!isRecord(value) || !Array.isArray(value.profiles) || value.profiles.length > MAX_GAUGE_PROFILES) {
    throw new ProjectValidationError('Invalid gauge settings')
  }
  if (!(value.activeProfileId === undefined || nonEmptyString(value.activeProfileId))) {
    throw new ProjectValidationError('Invalid active gauge profile')
  }
  return {
    profiles: value.profiles.map(parseGaugeProfile),
    activeProfileId: value.activeProfileId as string | undefined,
  }
}

function parseMeasurementRuler(value: unknown): MeasurementRuler {
  if (!isRecord(value) || !nonEmptyString(value.id) || !point(value.start) || !point(value.end)) {
    throw new ProjectValidationError('Invalid measurement ruler')
  }
  if (
    !(value.startElementId === undefined || nonEmptyString(value.startElementId)) ||
    !(value.endElementId === undefined || nonEmptyString(value.endElementId)) ||
    !(value.profileId === undefined || nonEmptyString(value.profileId)) ||
    !(value.mode === undefined || value.mode === 'stitches' || value.mode === 'rows') ||
    !(value.manualStitchCount === undefined || positiveInteger(value.manualStitchCount, MAX_PROJECT_ELEMENTS)) ||
    !(value.manualRowCount === undefined || positiveInteger(value.manualRowCount, MAX_PROJECT_ELEMENTS))
  ) throw new ProjectValidationError('Invalid measurement ruler')
  return {
    id: value.id,
    start: value.start as unknown as { x: number; y: number },
    end: value.end as unknown as { x: number; y: number },
    startElementId: value.startElementId as string | undefined,
    endElementId: value.endElementId as string | undefined,
    profileId: value.profileId as string | undefined,
    mode: value.mode as 'stitches' | 'rows' | undefined,
    manualStitchCount: value.manualStitchCount as number | undefined,
    manualRowCount: value.manualRowCount as number | undefined,
  }
}

function parseLegend(value: unknown) {
  if (value === undefined) return { visible: true }
  if (!isRecord(value) || typeof value.visible !== 'boolean') {
    throw new ProjectValidationError('Invalid legend settings')
  }
  return { visible: value.visible }
}

const AUTOSAVE_DELAYS = [0, 650, 5000, 15000, 30000, 60000]

function parseAutosave(value: unknown) {
  if (value === undefined) return { delayMs: 650 as AutosaveDelayMs }
  if (!isRecord(value) || !finite(value.delayMs) || !AUTOSAVE_DELAYS.includes(value.delayMs)) {
    throw new ProjectValidationError('Invalid autosave settings')
  }
  return { delayMs: value.delayMs as AutosaveDelayMs }
}

function parseSnapping(value: unknown, fallback: SnappingSettings): SnappingSettings {
  if (!isRecord(value)) return fallback
  if (
    typeof value.enabled !== 'boolean' ||
    !['top', 'center', 'bottom'].includes(String(value.sourceAnchor)) ||
    !['none', 'along', 'perpendicular'].includes(String(value.orientationMode)) ||
    typeof value.snapToVertices !== 'boolean' || !finite(value.tolerancePx)
  ) throw new ProjectValidationError('Invalid snapping settings')
  return value as unknown as SnappingSettings
}

export function parseProject(raw: unknown, fallbackSnapping: SnappingSettings): CrochetProject {
  if (!isRecord(raw)) throw new ProjectValidationError('Project must be an object')
  if (
    !finite(raw.schemaVersion) || !Number.isInteger(raw.schemaVersion) ||
    raw.schemaVersion < MIN_PROJECT_SCHEMA_VERSION || raw.schemaVersion > CURRENT_PROJECT_SCHEMA_VERSION
  ) throw new ProjectValidationError('Unsupported project schema')
  if (!Array.isArray(raw.elements)) throw new ProjectValidationError('Project elements are missing')
  if (raw.elements.length > MAX_PROJECT_ELEMENTS) throw new ProjectValidationError('Project contains too many stitch elements')
  if (raw.guides !== undefined && !Array.isArray(raw.guides)) throw new ProjectValidationError('Project guides are invalid')
  if (Array.isArray(raw.guides) && raw.guides.length > MAX_PROJECT_GUIDES) throw new ProjectValidationError('Project contains too many guides')
  if (raw.rowMarkers !== undefined && !Array.isArray(raw.rowMarkers)) throw new ProjectValidationError('Project row markers are invalid')
  if (Array.isArray(raw.rowMarkers) && raw.rowMarkers.length > MAX_PROJECT_ROW_MARKERS) throw new ProjectValidationError('Project contains too many row markers')
  if (raw.rulers !== undefined && !Array.isArray(raw.rulers)) throw new ProjectValidationError('Project measurement rulers are invalid')
  if (Array.isArray(raw.rulers) && raw.rulers.length > MAX_PROJECT_RULERS) throw new ProjectValidationError('Project contains too many measurement rulers')

  const metadata = isRecord(raw.metadata) ? raw.metadata : {}
  const settings = isRecord(raw.settings) ? raw.settings : {}
  const elements = raw.elements.map(parseElement)
  const guides = (raw.guides ?? []).map(parseGuide)
  const rowMarkers = (raw.rowMarkers ?? []).map(parseRowMarker)
  const backgroundImage = parseBackgroundImage(raw.backgroundImage)
  const gauge = parseGauge(raw.gauge)
  const rulers = (raw.rulers ?? []).map(parseMeasurementRuler)

  const project: CrochetProject = {
    schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
    metadata: {
      title: typeof metadata.title === 'string' && metadata.title.trim() ? metadata.title : 'Crochet scheme',
      updatedAt: typeof metadata.updatedAt === 'string' ? metadata.updatedAt : new Date().toISOString(),
    },
    elements,
    guides,
    rowMarkers,
    backgroundImage,
    gauge,
    rulers,
    settings: {
      snapping: parseSnapping(settings.snapping, fallbackSnapping),
      legend: parseLegend(settings.legend),
      autosave: parseAutosave(settings.autosave),
    },
  }
  const integrityIssue = projectIntegrityIssue(project, raw.schemaVersion >= STRICT_PROJECT_SCHEMA_VERSION)
  if (integrityIssue) throw new ProjectValidationError(integrityIssue)
  return project
}

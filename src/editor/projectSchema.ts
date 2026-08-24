import type {
  CrochetProject,
  Guide,
  ParametricRowBinding,
  SnappingSettings,
  StitchElement,
} from '../types'

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
  ) {
    throw new ProjectValidationError('Invalid parametric row options')
  }
  if (value.patternOrder !== undefined && !finite(value.patternOrder)) {
    throw new ProjectValidationError('Invalid row order')
  }
  if (value.parentRowId !== undefined && !nonEmptyString(value.parentRowId)) {
    throw new ProjectValidationError('Invalid parent row id')
  }
  if (value.shaping !== undefined) {
    if (!isRecord(value.shaping)) throw new ProjectValidationError('Invalid row shaping')
    if (
      (value.shaping.kind !== 'increase' && value.shaping.kind !== 'decrease') ||
      !finite(value.shaping.count) || !finite(value.shaping.baseCount)
    ) {
      throw new ProjectValidationError('Invalid row shaping')
    }
  }
  if (value.topologyOverride !== undefined) {
    if (!isRecord(value.topologyOverride) || !Array.isArray(value.topologyOverride.changeParentIds)) {
      throw new ProjectValidationError('Invalid topology override')
    }
    const ids = value.topologyOverride.changeParentIds
    if (
      ids.length === 0 ||
      !ids.every(nonEmptyString) ||
      new Set(ids).size !== ids.length ||
      value.shaping === undefined
    ) {
      throw new ProjectValidationError('Invalid topology override')
    }
  }
  return value as unknown as ParametricRowBinding
}

function parseElement(value: unknown): StitchElement {
  if (!isRecord(value)) throw new ProjectValidationError('Invalid stitch element')
  if (
    !nonEmptyString(value.id) || !nonEmptyString(value.symbolId) ||
    !finite(value.x) || !finite(value.y) || !finite(value.rotation) ||
    !optionalBoolean(value.visible) || !optionalBoolean(value.locked) ||
    !optionalStringArray(value.parentStitchIds)
  ) {
    throw new ProjectValidationError('Invalid stitch element fields')
  }
  return {
    id: value.id,
    symbolId: value.symbolId,
    x: value.x,
    y: value.y,
    rotation: value.rotation,
    visible: value.visible !== false,
    locked: value.locked === true,
    parametricRow: parseParametricRow(value.parametricRow),
    parentStitchIds: value.parentStitchIds as string[] | undefined,
  }
}

function parseGuide(value: unknown): Guide {
  if (!isRecord(value) || !nonEmptyString(value.id) || typeof value.visible !== 'boolean') {
    throw new ProjectValidationError('Invalid guide')
  }
  if (value.type === 'arc') {
    if (!point(value.center) || !finite(value.radius) || !finite(value.startAngle) || !finite(value.endAngle) || !finite(value.divisions)) {
      throw new ProjectValidationError('Invalid arc guide')
    }
    return value as unknown as Guide
  }
  if (value.type === 'grid') {
    if (!point(value.origin) || !finite(value.rows) || !finite(value.columns) || !finite(value.spacingX) || !finite(value.spacingY) || !finite(value.rotation)) {
      throw new ProjectValidationError('Invalid grid guide')
    }
    return value as unknown as Guide
  }
  if (value.type === 'radial-grid') {
    if (!point(value.center) || !finite(value.ringCount) || !finite(value.ringSpacing) || !finite(value.sectorCount) || !finite(value.startAngle)) {
      throw new ProjectValidationError('Invalid radial guide')
    }
    return value as unknown as Guide
  }
  throw new ProjectValidationError('Unknown guide type')
}

function parseSnapping(value: unknown, fallback: SnappingSettings): SnappingSettings {
  if (!isRecord(value)) return fallback
  if (
    typeof value.enabled !== 'boolean' ||
    !['top', 'center', 'bottom'].includes(String(value.sourceAnchor)) ||
    !['none', 'along', 'perpendicular'].includes(String(value.orientationMode)) ||
    typeof value.snapToVertices !== 'boolean' ||
    !finite(value.tolerancePx)
  ) {
    throw new ProjectValidationError('Invalid snapping settings')
  }
  return value as unknown as SnappingSettings
}

export function parseProject(raw: unknown, fallbackSnapping: SnappingSettings): CrochetProject {
  if (!isRecord(raw)) throw new ProjectValidationError('Project must be an object')
  if (!finite(raw.schemaVersion) || raw.schemaVersion < 1 || raw.schemaVersion > 8) {
    throw new ProjectValidationError('Unsupported project schema')
  }
  if (!Array.isArray(raw.elements)) throw new ProjectValidationError('Project elements are missing')
  if (raw.guides !== undefined && !Array.isArray(raw.guides)) {
    throw new ProjectValidationError('Project guides are invalid')
  }

  const metadata = isRecord(raw.metadata) ? raw.metadata : {}
  const settings = isRecord(raw.settings) ? raw.settings : {}
  const elements = raw.elements.map(parseElement)
  const guides = (raw.guides ?? []).map(parseGuide)

  return {
    schemaVersion: 8,
    metadata: {
      title: typeof metadata.title === 'string' && metadata.title.trim() ? metadata.title : 'Crochet scheme',
      updatedAt: typeof metadata.updatedAt === 'string' ? metadata.updatedAt : new Date().toISOString(),
    },
    elements,
    guides,
    settings: {
      snapping: parseSnapping(settings.snapping, fallbackSnapping),
    },
  }
}

export type Point = { x: number; y: number }
export type AnchorName = 'top' | 'center' | 'bottom'
export type OrientationMode = 'none' | 'along' | 'perpendicular'

export type RowDistributionMode = 'count' | 'spacing'
export type RowOrientation = 'tangent' | 'radial' | 'fixed'
export type RowShapingKind = 'increase' | 'decrease'
export type RowConstructionMode = 'spiral' | 'joined' | 'turning'
export type RowWorkDirection = 'along' | 'reverse'
export type RowJoinTarget = 'first-stitch' | 'start-chain-top'
export type AutosaveDelayMs = 0 | 650 | 5000 | 15000 | 30000 | 60000
export type RulerMeasurementMode = 'stitches' | 'rows'

export type GaugeProfile = {
  id: string
  name: string
  symbolId: string
  stitchCount: number
  rowCount: number
  widthCm: number
  heightCm: number
}

export type GaugeSettings = {
  profiles: GaugeProfile[]
  activeProfileId?: string
}

export type MeasurementRuler = {
  id: string
  start: Point
  end: Point
  startElementId?: string
  endElementId?: string
  profileId?: string
  /** Defaults to stitches for backwards-compatible schema v19 rulers. */
  mode?: RulerMeasurementMode
  /** Legacy compatibility only; v1.23+ chart measurement ignores manual overrides. */
  manualStitchCount?: number
  /** Legacy compatibility only; v1.23+ chart measurement ignores manual overrides. */
  manualRowCount?: number
}

export type GuideRowOptions = {
  distributionMode: RowDistributionMode
  count: number
  spacing: number
  orientation: RowOrientation
  rotationOffset: number
  radialOffset: number
  ringIndex: number
}

export type RowShaping = {
  kind: RowShapingKind
  count: number
  baseCount: number
}

export type RowTopologyOverride = {
  changeParentIds: string[]
}

export type RowSequenceItem = {
  symbolId: string
  count: number
}

export type RowSequence = {
  items: RowSequenceItem[]
}

export type RowProgramLeaf = {
  kind: 'stitch' | 'increase' | 'decrease'
  symbolId: string
  count: number
}

export type RowProgramGroup = {
  kind: 'group'
  repeat: number
  items: RowProgramLeaf[]
}

export type RowProgramItem = RowProgramLeaf | RowProgramGroup

export type RowProgram = {
  repeat: number
  items: RowProgramItem[]
}

export type RowConstruction = {
  mode: RowConstructionMode
  direction: RowWorkDirection
  startChainCount: number
  joinWithSlipStitch: boolean
  /**
   * A starting chain may contribute one logical stitch to the written row total.
   * It remains boundary metadata rather than an ordinary topology node.
   * Optional for schema v1-v15 compatibility; normalization supplies false.
   */
  startChainCountsAsStitch?: boolean
  /** Number of base stitches intentionally skipped before the first worked stitch. */
  skipFirstStitches?: number
  /** Exact target used by a joined-round slip-stitch closure. */
  joinTarget?: RowJoinTarget
}

export type ParametricRowBinding = {
  id: string
  guideId: string
  symbolId: string
  options: GuideRowOptions
  patternOrder?: number
  parentRowId?: string
  generatedRadialOffset?: number
  shaping?: RowShaping
  topologyOverride?: RowTopologyOverride
  sequence?: RowSequence
  program?: RowProgram
  construction?: RowConstruction
}

export type GuideAttachmentOrientation = 'keep' | 'tangent' | 'normal'

export type GuideAttachment = {
  guideId: string
  t: number
  orientation: GuideAttachmentOrientation
  rotationOffset: number
  normalOffset: number
}

export type StitchGeometry = {
  /** Independent horizontal scale of the complete glyph. Defaults to 1. */
  scaleX?: number
  /** Independent vertical scale of the complete glyph. Defaults to 1. */
  scaleY?: number
  /** Semantic branch spread for increase/shell symbols. Defaults to 1. */
  spread?: number
}

export type StitchElement = {
  id: string
  symbolId: string
  x: number
  y: number
  rotation: number
  color?: string
  /** True when the glyph has odd reflection parity. */
  mirrored?: boolean
  /** Optional user-edited glyph geometry introduced in schema v22. */
  geometry?: StitchGeometry
  visible?: boolean
  locked?: boolean
  groupId?: string
  parametricRow?: ParametricRowBinding
  parentStitchIds?: string[]
  guideAttachment?: GuideAttachment
}

export type ArcGuide = {
  id: string
  type: 'arc'
  center: Point
  radius: number
  startAngle: number
  endAngle: number
  divisions: number
  visible: boolean
  locked?: boolean
}

export type LineGuide = {
  id: string
  type: 'line'
  start: Point
  end: Point
  divisions: number
  visible: boolean
  locked?: boolean
}

export type CurveGuide = {
  id: string
  type: 'curve'
  start: Point
  control1: Point
  control2: Point
  end: Point
  divisions: number
  visible: boolean
  locked?: boolean
}

export type ParabolaGuide = {
  id: string
  type: 'parabola'
  start: Point
  control: Point
  end: Point
  divisions: number
  visible: boolean
  locked?: boolean
}

export type GridGuide = {
  id: string
  type: 'grid'
  origin: Point
  rows: number
  columns: number
  spacingX: number
  spacingY: number
  rotation: number
  visible: boolean
  locked?: boolean
}

export type RadialGridGuide = {
  id: string
  type: 'radial-grid'
  center: Point
  ringCount: number
  ringSpacing: number
  sectorCount: number
  startAngle: number
  visible: boolean
  locked?: boolean
}

export type Guide = ArcGuide | LineGuide | CurveGuide | ParabolaGuide | GridGuide | RadialGridGuide

export type RowMarker = {
  id: string
  number: number
  x: number
  y: number
  visible?: boolean
  locked?: boolean
}

export type BackgroundImage = {
  dataUrl: string
  sourceName?: string
  x: number
  y: number
  width: number
  height: number
  /** Rotation in degrees around the image center; omitted by legacy projects. */
  rotation?: number
  opacity: number
  visible?: boolean
  locked?: boolean
  /** Tracing underlays stay editor-only unless the user explicitly opts into output. */
  includeInExport?: boolean
}

export type LegendSettings = {
  visible: boolean
}

export type AutosaveSettings = {
  /** Delay after the latest document change; 0 disables automatic document saves. */
  delayMs: AutosaveDelayMs
}

export type Viewport = {
  zoom: number
  panX: number
  panY: number
}

export type SnappingSettings = {
  enabled: boolean
  sourceAnchor: AnchorName
  orientationMode: OrientationMode
  snapToVertices: boolean
  tolerancePx: number
}

export type CrochetProject = {
  schemaVersion: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22
  metadata: {
    title: string
    updatedAt: string
  }
  elements: StitchElement[]
  guides?: Guide[]
  rowMarkers?: RowMarker[]
  backgroundImage?: BackgroundImage
  gauge?: GaugeSettings
  rulers?: MeasurementRuler[]
  settings: {
    snapping: SnappingSettings
    legend?: LegendSettings
    autosave?: AutosaveSettings
  }
}

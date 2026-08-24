export type Point = { x: number; y: number }
export type AnchorName = 'top' | 'center' | 'bottom'
export type OrientationMode = 'none' | 'along' | 'perpendicular'

export type RowDistributionMode = 'count' | 'spacing'
export type RowOrientation = 'tangent' | 'radial' | 'fixed'
export type RowShapingKind = 'increase' | 'decrease'

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

export type ParametricRowBinding = {
  id: string
  guideId: string
  symbolId: string
  options: GuideRowOptions
  patternOrder?: number
  parentRowId?: string
  shaping?: RowShaping
  topologyOverride?: RowTopologyOverride
  sequence?: RowSequence
}

export type StitchElement = {
  id: string
  symbolId: string
  x: number
  y: number
  rotation: number
  visible?: boolean
  locked?: boolean
  parametricRow?: ParametricRowBinding
  parentStitchIds?: string[]
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
}

export type Guide = ArcGuide | GridGuide | RadialGridGuide

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
  schemaVersion: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
  metadata: {
    title: string
    updatedAt: string
  }
  elements: StitchElement[]
  guides?: Guide[]
  settings: {
    snapping: SnappingSettings
  }
}

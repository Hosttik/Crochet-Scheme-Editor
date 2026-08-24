export type Point = { x: number; y: number }
export type AnchorName = 'top' | 'center' | 'bottom'
export type OrientationMode = 'none' | 'along' | 'perpendicular'

export type StitchElement = {
  id: string
  symbolId: string
  x: number
  y: number
  rotation: number
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
  schemaVersion: 1
  metadata: {
    title: string
    updatedAt: string
  }
  elements: StitchElement[]
  settings: {
    snapping: SnappingSettings
  }
}

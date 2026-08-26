import type {
  ArcGuide,
  CurveGuide,
  GridGuide,
  Guide,
  LineGuide,
  Point,
  RadialGridGuide,
} from '../types'
import { rotatePoint } from './geometry'
import { pathPoseAt, pathRenderPoints } from './pathGuides'

export type GuideSnapPoint = {
  key: string
  point: Point
  targetRotation: number
  guideId: string
  guideType: Guide['type']
  pathT?: number
}

function polarPoint(center: Point, radius: number, angleDegrees: number): Point {
  const radians = (angleDegrees * Math.PI) / 180
  return {
    x: center.x + Math.cos(radians) * radius,
    y: center.y + Math.sin(radians) * radius,
  }
}

export function arcGuideSnapPoints(guide: ArcGuide): GuideSnapPoint[] {
  const divisions = Math.max(1, Math.round(guide.divisions))
  const sweep = guide.endAngle - guide.startAngle

  return Array.from({ length: divisions + 1 }, (_, index) => {
    const t = index / divisions
    const angle = guide.startAngle + sweep * t
    return {
      key: `${guide.id}:arc:${index}`,
      point: polarPoint(guide.center, guide.radius, angle),
      targetRotation: angle + (sweep < 0 ? -90 : 90),
      guideId: guide.id,
      guideType: guide.type,
      pathT: t,
    }
  })
}

function continuousPathSnapPoints(guide: LineGuide | CurveGuide): GuideSnapPoint[] {
  const divisions = Math.max(1, Math.round(guide.divisions))
  return Array.from({ length: divisions + 1 }, (_, index) => {
    const t = index / divisions
    const pose = pathPoseAt(guide, t)
    return {
      key: `${guide.id}:${guide.type}:${index}`,
      point: pose.point,
      targetRotation: pose.tangent,
      guideId: guide.id,
      guideType: guide.type,
      pathT: t,
    }
  })
}

export function lineGuideSnapPoints(guide: LineGuide) {
  return continuousPathSnapPoints(guide)
}

export function curveGuideSnapPoints(guide: CurveGuide) {
  return continuousPathSnapPoints(guide)
}

export function gridGuideSnapPoints(guide: GridGuide): GuideSnapPoint[] {
  const rows = Math.max(1, Math.round(guide.rows))
  const columns = Math.max(1, Math.round(guide.columns))
  const rowCenter = (rows - 1) / 2
  const columnCenter = (columns - 1) / 2
  const points: GuideSnapPoint[] = []

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const local = {
        x: (column - columnCenter) * guide.spacingX,
        y: (row - rowCenter) * guide.spacingY,
      }
      const rotated = rotatePoint(local, guide.rotation)
      points.push({
        key: `${guide.id}:grid:${row}:${column}`,
        point: {
          x: guide.origin.x + rotated.x,
          y: guide.origin.y + rotated.y,
        },
        targetRotation: guide.rotation,
        guideId: guide.id,
        guideType: guide.type,
      })
    }
  }

  return points
}

export function radialGridGuideSnapPoints(guide: RadialGridGuide): GuideSnapPoint[] {
  const ringCount = Math.max(1, Math.round(guide.ringCount))
  const sectorCount = Math.max(2, Math.round(guide.sectorCount))
  const points: GuideSnapPoint[] = [
    {
      key: `${guide.id}:radial:center`,
      point: guide.center,
      targetRotation: guide.startAngle,
      guideId: guide.id,
      guideType: guide.type,
    },
  ]

  for (let ring = 1; ring <= ringCount; ring += 1) {
    const radius = ring * guide.ringSpacing
    for (let sector = 0; sector < sectorCount; sector += 1) {
      const angle = guide.startAngle + (sector * 360) / sectorCount
      points.push({
        key: `${guide.id}:radial:${ring}:${sector}`,
        point: polarPoint(guide.center, radius, angle),
        targetRotation: angle + 90,
        guideId: guide.id,
        guideType: guide.type,
      })
    }
  }

  return points
}

export function guideSnapPoints(guide: Guide): GuideSnapPoint[] {
  if (!guide.visible) return []
  switch (guide.type) {
    case 'arc':
      return arcGuideSnapPoints(guide)
    case 'line':
      return lineGuideSnapPoints(guide)
    case 'curve':
      return curveGuideSnapPoints(guide)
    case 'grid':
      return gridGuideSnapPoints(guide)
    case 'radial-grid':
      return radialGridGuideSnapPoints(guide)
  }
}

export function buildGuideSnapPoints(guides: Guide[]): GuideSnapPoint[] {
  return guides.flatMap(guideSnapPoints)
}

export function arcRenderPoints(guide: ArcGuide, segments = 64): Point[] {
  const count = Math.max(2, segments)
  const sweep = guide.endAngle - guide.startAngle
  return Array.from({ length: count + 1 }, (_, index) => {
    const angle = guide.startAngle + (sweep * index) / count
    return polarPoint(guide.center, guide.radius, angle)
  })
}

export function lineRenderPoints(guide: LineGuide): Point[] {
  return [guide.start, guide.end]
}

export function curveRenderPoints(guide: CurveGuide, segments = 64): Point[] {
  return pathRenderPoints(guide, segments)
}

export function gridLocalBounds(guide: GridGuide) {
  return {
    halfWidth: ((Math.max(1, guide.columns) - 1) * guide.spacingX) / 2,
    halfHeight: ((Math.max(1, guide.rows) - 1) * guide.spacingY) / 2,
  }
}

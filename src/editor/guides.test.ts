import { describe, expect, it } from 'vitest'
import type { ArcGuide, GridGuide, RadialGridGuide } from '../types'
import {
  arcGuideSnapPoints,
  gridGuideSnapPoints,
  radialGridGuideSnapPoints,
} from './guides'

describe('guide snap geometry', () => {
  it('creates evenly spaced arc points with tangent orientation', () => {
    const guide: ArcGuide = {
      id: 'arc',
      type: 'arc',
      center: { x: 0, y: 0 },
      radius: 100,
      startAngle: 0,
      endAngle: 180,
      divisions: 2,
      visible: true,
    }

    const points = arcGuideSnapPoints(guide)
    expect(points).toHaveLength(3)
    expect(points[0]?.point.x).toBeCloseTo(100)
    expect(points[0]?.point.y).toBeCloseTo(0)
    expect(points[1]?.point.x).toBeCloseTo(0)
    expect(points[1]?.point.y).toBeCloseTo(100)
    expect(points[0]?.targetRotation).toBe(90)
    expect(points[1]?.targetRotation).toBe(180)
  })

  it('centers rectangular grid intersections around origin', () => {
    const guide: GridGuide = {
      id: 'grid',
      type: 'grid',
      origin: { x: 10, y: 20 },
      rows: 3,
      columns: 3,
      spacingX: 20,
      spacingY: 10,
      rotation: 0,
      visible: true,
    }

    const points = gridGuideSnapPoints(guide)
    expect(points).toHaveLength(9)
    expect(points[4]?.point).toEqual({ x: 10, y: 20 })
    expect(points[0]?.point).toEqual({ x: -10, y: 10 })
    expect(points[8]?.point).toEqual({ x: 30, y: 30 })
  })

  it('rotates rectangular grid points around its origin', () => {
    const guide: GridGuide = {
      id: 'grid',
      type: 'grid',
      origin: { x: 0, y: 0 },
      rows: 1,
      columns: 3,
      spacingX: 10,
      spacingY: 10,
      rotation: 90,
      visible: true,
    }

    const points = gridGuideSnapPoints(guide)
    expect(points[0]?.point.x).toBeCloseTo(0)
    expect(points[0]?.point.y).toBeCloseTo(-10)
    expect(points[2]?.point.x).toBeCloseTo(0)
    expect(points[2]?.point.y).toBeCloseTo(10)
  })

  it('creates center and ring-sector intersections for radial grid', () => {
    const guide: RadialGridGuide = {
      id: 'radial',
      type: 'radial-grid',
      center: { x: 0, y: 0 },
      ringCount: 2,
      ringSpacing: 25,
      sectorCount: 4,
      startAngle: 0,
      visible: true,
    }

    const points = radialGridGuideSnapPoints(guide)
    expect(points).toHaveLength(9)
    expect(points[0]?.point).toEqual({ x: 0, y: 0 })
    expect(points[1]?.point).toEqual({ x: 25, y: 0 })
    expect(points[5]?.point).toEqual({ x: 50, y: 0 })
  })
})

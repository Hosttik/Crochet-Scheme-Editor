import { describe, expect, it } from 'vitest'
import type { ArcGuide, RadialGridGuide } from '../types'
import {
  generateGuideRowPlacements,
  resolveGuideRowCount,
  rowPlacementsToElements,
  type GuideRowOptions,
} from './rowGenerator'

const baseOptions: GuideRowOptions = {
  distributionMode: 'count',
  count: 5,
  spacing: 40,
  orientation: 'radial',
  rotationOffset: 0,
  radialOffset: 0,
  ringIndex: 2,
}

const arc: ArcGuide = {
  id: 'arc-1',
  type: 'arc',
  center: { x: 10, y: 20 },
  radius: 100,
  startAngle: 0,
  endAngle: 180,
  divisions: 12,
  visible: true,
}

const radial: RadialGridGuide = {
  id: 'radial-1',
  type: 'radial-grid',
  center: { x: 0, y: 0 },
  ringCount: 4,
  ringSpacing: 50,
  sectorCount: 12,
  startAngle: 0,
  visible: true,
}

describe('guide row generator', () => {
  it('includes both endpoints for an open arc', () => {
    const placements = generateGuideRowPlacements(arc, baseOptions)
    expect(placements).toHaveLength(5)
    expect(placements[0].x).toBeCloseTo(110)
    expect(placements[0].y).toBeCloseTo(20)
    expect(placements[4].x).toBeCloseTo(-90)
    expect(placements[4].y).toBeCloseTo(20)
  })

  it('does not duplicate the first point on a closed 360 degree arc', () => {
    const placements = generateGuideRowPlacements(
      { ...arc, startAngle: 0, endAngle: 360 },
      { ...baseOptions, count: 4 },
    )
    expect(placements).toHaveLength(4)
    expect(placements.map((placement) => Math.round(placement.angle))).toEqual([0, 90, 180, 270])
  })

  it('supports tangent, radial and fixed orientation with rotation offset', () => {
    const tangent = generateGuideRowPlacements(
      arc,
      { ...baseOptions, count: 1, orientation: 'tangent', rotationOffset: 10 },
    )[0]
    const radialPlacement = generateGuideRowPlacements(
      arc,
      { ...baseOptions, count: 1, orientation: 'radial', rotationOffset: 10 },
    )[0]
    const fixed = generateGuideRowPlacements(
      arc,
      { ...baseOptions, count: 1, orientation: 'fixed', rotationOffset: 10 },
    )[0]

    expect(tangent.rotation).toBeCloseTo(190)
    expect(radialPlacement.rotation).toBeCloseTo(100)
    expect(fixed.rotation).toBeCloseTo(10)
  })

  it('places a radial row on the requested ring', () => {
    const placements = generateGuideRowPlacements(
      radial,
      { ...baseOptions, count: 4, ringIndex: 2 },
    )
    expect(placements).toHaveLength(4)
    expect(placements[0]).toMatchObject({ x: 100, y: 0 })
    expect(placements[1].x).toBeCloseTo(0)
    expect(placements[1].y).toBeCloseTo(100)
  })

  it('uses approximate spacing to resolve count', () => {
    const count = resolveGuideRowCount(
      { ...arc, startAngle: 0, endAngle: 180, radius: 100 },
      { ...baseOptions, distributionMode: 'spacing', spacing: 50 },
    )
    expect(count).toBe(7)
  })

  it('applies radial offset before calculating spacing-based count', () => {
    const withoutOffset = resolveGuideRowCount(
      radial,
      { ...baseOptions, distributionMode: 'spacing', spacing: 50, ringIndex: 1 },
    )
    const withOffset = resolveGuideRowCount(
      radial,
      { ...baseOptions, distributionMode: 'spacing', spacing: 50, ringIndex: 1, radialOffset: 50 },
    )
    expect(withOffset).toBeGreaterThan(withoutOffset)
  })

  it('converts placements to preview or persisted stitch elements without changing geometry', () => {
    const placements = generateGuideRowPlacements(
      radial,
      { ...baseOptions, count: 3, rotationOffset: 12 },
    )
    const elements = rowPlacementsToElements(
      placements,
      'double',
      (_placement, index) => `preview-${index}`,
    )

    expect(elements).toHaveLength(3)
    expect(elements[0]).toMatchObject({
      id: 'preview-0',
      symbolId: 'double',
      x: placements[0].x,
      y: placements[0].y,
      rotation: placements[0].rotation,
      visible: true,
      locked: false,
    })
    expect(elements[2].id).toBe('preview-2')
  })
})

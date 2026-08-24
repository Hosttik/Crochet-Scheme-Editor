import { describe, expect, it } from 'vitest'
import type { ParametricRowBinding, StitchElement } from '../types'
import {
  createRowShaping,
  maxRowShapingChanges,
  rowShapingMarkerIndices,
  rowShapingMarkers,
  targetCountForRowShaping,
} from './rowShaping'

const baseBinding: ParametricRowBinding = {
  id: 'row-2',
  guideId: 'guide',
  symbolId: 'single',
  options: {
    distributionMode: 'count',
    count: 30,
    spacing: 40,
    orientation: 'radial',
    rotationOffset: 0,
    radialOffset: 0,
    ringIndex: 1,
  },
  shaping: { kind: 'increase', count: 6, baseCount: 24 },
}

function children(binding = baseBinding): StitchElement[] {
  return Array.from({ length: binding.options.count }, (_, index) => ({
    id: `stitch-${index}`,
    symbolId: binding.symbolId,
    x: index,
    y: 0,
    rotation: 0,
    parametricRow: binding,
  }))
}

describe('row shaping', () => {
  it('turns six increases on 24 stitches into 30 stitches', () => {
    expect(targetCountForRowShaping(24, 'increase', 6)).toBe(30)
    expect(createRowShaping(24, 'increase', 6)).toEqual({
      kind: 'increase',
      count: 6,
      baseCount: 24,
    })
  })

  it('turns six decreases on 24 stitches into 18 stitches', () => {
    expect(targetCountForRowShaping(24, 'decrease', 6)).toBe(18)
  })

  it('limits simple increases and decreases to crochet-valid ranges', () => {
    expect(maxRowShapingChanges(6, 'increase')).toBe(6)
    expect(maxRowShapingChanges(6, 'decrease')).toBe(3)
    expect(targetCountForRowShaping(6, 'increase', 20)).toBe(12)
    expect(targetCountForRowShaping(6, 'decrease', 20)).toBe(3)
  })

  it('distributes six markers evenly across a 30-stitch increase row', () => {
    expect(rowShapingMarkerIndices(baseBinding.shaping!, 30)).toEqual([4, 9, 14, 19, 24, 29])
  })

  it('distributes six markers evenly across an 18-stitch decrease row', () => {
    expect(
      rowShapingMarkerIndices({ kind: 'decrease', count: 6, baseCount: 24 }, 18),
    ).toEqual([2, 5, 8, 11, 14, 17])
  })

  it('maps visual shaping markers back to child element ids', () => {
    const markers = rowShapingMarkers(children())
    expect([...markers.entries()]).toEqual([
      ['stitch-4', 'increase'],
      ['stitch-9', 'increase'],
      ['stitch-14', 'increase'],
      ['stitch-19', 'increase'],
      ['stitch-24', 'increase'],
      ['stitch-29', 'increase'],
    ])
  })
})

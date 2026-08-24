import { describe, expect, it } from 'vitest'
import type { ParametricRowBinding, StitchElement } from '../types'
import { nextPatternOrder, patternRows } from './parametricRows'

function binding(id: string, patternOrder?: number): ParametricRowBinding {
  return {
    id,
    guideId: 'guide',
    symbolId: 'single',
    patternOrder,
    options: {
      distributionMode: 'count',
      count: 2,
      spacing: 40,
      orientation: 'radial',
      rotationOffset: 0,
      radialOffset: 0,
      ringIndex: 1,
    },
  }
}

function row(rowBinding: ParametricRowBinding, count: number): StitchElement[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${rowBinding.id}-${index}`,
    symbolId: rowBinding.symbolId,
    x: index,
    y: 0,
    rotation: 0,
    parametricRow: rowBinding,
  }))
}

describe('pattern row migration ordering', () => {
  it('keeps legacy v0.8 rows before newly sequenced rows', () => {
    const legacyFirst = binding('legacy-1')
    const legacySecond = binding('legacy-2')
    const newThird = binding('new-3', 3)
    const elements = [
      ...row(legacyFirst, 8),
      ...row(legacySecond, 12),
      ...row(newThird, 18),
    ]

    expect(patternRows(elements).map((item) => item.id)).toEqual([
      'legacy-1',
      'legacy-2',
      'new-3',
    ])
    expect(patternRows(elements).map((item) => item.displayOrder)).toEqual([1, 2, 3])
    expect(nextPatternOrder(elements)).toBe(4)
  })
})

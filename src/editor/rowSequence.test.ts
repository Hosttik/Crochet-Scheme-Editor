import { describe, expect, it } from 'vitest'
import type { ParametricRowBinding } from '../types'
import {
  normalizeRowSequenceItems,
  rowBindingSymbolIds,
  rowHasMixedSequence,
  rowSequenceCycleInfo,
  rowSequenceRunsForCount,
  rowSequenceSymbolIds,
} from './rowSequence'

const binding: ParametricRowBinding = {
  id: 'row-1',
  guideId: 'guide-1',
  symbolId: 'single',
  options: {
    distributionMode: 'count', count: 10, spacing: 20,
    orientation: 'radial', rotationOffset: 0, radialOffset: 0, ringIndex: 1,
  },
}

describe('row sequence', () => {
  it('normalizes adjacent runs of the same stitch', () => {
    expect(normalizeRowSequenceItems([
      { symbolId: 'single', count: 2 },
      { symbolId: 'single', count: 1 },
      { symbolId: 'chain', count: 1 },
    ])).toEqual([
      { symbolId: 'single', count: 3 },
      { symbolId: 'chain', count: 1 },
    ])
  })

  it('cycles a rapport across the actual row count', () => {
    const sequence = { items: [
      { symbolId: 'single', count: 3 },
      { symbolId: 'chain', count: 1 },
      { symbolId: 'double', count: 1 },
    ] }
    expect(rowSequenceSymbolIds(sequence, 10, 'single')).toEqual([
      'single', 'single', 'single', 'chain', 'double',
      'single', 'single', 'single', 'chain', 'double',
    ])
    expect(rowSequenceCycleInfo(sequence, 12)).toEqual({
      templateLength: 5, repeats: 2, remainder: 2,
    })
  })

  it('falls back to the row base stitch without a sequence', () => {
    expect(rowBindingSymbolIds(binding, 3)).toEqual(['single', 'single', 'single'])
    expect(rowHasMixedSequence(binding)).toBe(false)
  })

  it('reports and expands a mixed binding', () => {
    const mixed = {
      ...binding,
      sequence: { items: [
        { symbolId: 'single', count: 2 },
        { symbolId: 'double', count: 1 },
      ] },
    }
    expect(rowHasMixedSequence(mixed)).toBe(true)
    expect(rowBindingSymbolIds(mixed, 5)).toEqual([
      'single', 'single', 'double', 'single', 'single',
    ])
    expect(rowSequenceRunsForCount(mixed.sequence, 2, mixed.symbolId)).toEqual([
      { symbolId: 'single', count: 2 },
    ])
  })
})

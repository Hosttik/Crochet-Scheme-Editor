import { describe, expect, it } from 'vitest'
import type { ArcGuide, ParametricRowBinding, StitchElement } from '../types'
import { createNextPatternRow, reconcileParametricRows } from './parametricRows'

const guide: ArcGuide = {
  id: 'guide-1',
  type: 'arc',
  center: { x: 0, y: 0 },
  radius: 100,
  startAngle: 0,
  endAngle: 180,
  divisions: 4,
  visible: true,
}

const mixed: ParametricRowBinding = {
  id: 'row-1',
  guideId: guide.id,
  symbolId: 'single',
  sequence: { items: [
    { symbolId: 'single', count: 2 },
    { symbolId: 'chain', count: 1 },
    { symbolId: 'double', count: 1 },
  ] },
  options: {
    distributionMode: 'count', count: 8, spacing: 40,
    orientation: 'radial', rotationOffset: 0, radialOffset: 0, ringIndex: 1,
  },
}

function row(binding: ParametricRowBinding, count: number): StitchElement[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${binding.id}-${index}`,
    symbolId: 'single',
    x: index,
    y: 0,
    rotation: 0,
    parametricRow: binding,
  }))
}

describe('mixed parametric rows', () => {
  it('applies the rapport stitch types while keeping stable element ids', () => {
    const result = reconcileParametricRows(row(mixed, 8), [guide], () => 'unused')
    expect(result.map((element) => element.id)).toEqual(
      Array.from({ length: 8 }, (_, index) => `row-1-${index}`),
    )
    expect(result.map((element) => element.symbolId)).toEqual([
      'single', 'single', 'chain', 'double',
      'single', 'single', 'chain', 'double',
    ])
  })

  it('inherits the rapport into a shaped next row without changing topology count', () => {
    let serial = 0
    const source = reconcileParametricRows(row(mixed, 8), [guide], () => `source-${++serial}`)
    const created = createNextPatternRow(source, [guide], mixed, 2, () => `new-${++serial}`)
    expect(created).not.toBeNull()
    expect(created!.binding.sequence).toEqual(mixed.sequence)
    expect(created!.elements).toHaveLength(10)
    expect(created!.elements.map((element) => element.symbolId)).toEqual([
      'single', 'single', 'chain', 'double',
      'single', 'single', 'chain', 'double',
      'single', 'single',
    ])
    expect(created!.elements.filter((element, index, all) =>
      index > 0 && element.parentStitchIds?.[0] === all[index - 1].parentStitchIds?.[0],
    )).toHaveLength(2)
  })

  it('uses a rich program as the source of both stitch types and parent-child topology', () => {
    const parentBinding: ParametricRowBinding = {
      ...mixed,
      id: 'parent',
      sequence: undefined,
      options: { ...mixed.options, count: 6 },
    }
    const childBinding: ParametricRowBinding = {
      ...mixed,
      id: 'child',
      parentRowId: parentBinding.id,
      sequence: undefined,
      program: {
        repeat: 1,
        items: [
          { kind: 'stitch', symbolId: 'single', count: 2 },
          { kind: 'increase', symbolId: 'double', count: 1 },
          { kind: 'group', repeat: 1, items: [
            { kind: 'stitch', symbolId: 'chain', count: 1 },
            { kind: 'decrease', symbolId: 'half-double', count: 1 },
          ] },
        ],
      },
      options: { ...mixed.options, count: 6, radialOffset: 40 },
    }
    const result = reconcileParametricRows(
      [...row(parentBinding, 6), ...row(childBinding, 6)],
      [guide],
      () => 'unused',
    )
    const child = result.filter((element) => element.parametricRow?.id === childBinding.id)
    expect(child.map((element) => element.symbolId)).toEqual([
      'single', 'single', 'double', 'double', 'chain', 'half-double',
    ])
    expect(child.map((element) => element.parentStitchIds)).toEqual([
      ['parent-0'], ['parent-1'], ['parent-2'], ['parent-2'], ['parent-3'], ['parent-4', 'parent-5'],
    ])
  })
})

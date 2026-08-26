import { describe, expect, it } from 'vitest'
import type { ArcGuide, ParametricRowBinding, StitchElement } from '../types'
import {
  createNextPatternRow,
  createPatternIncreaseSequence,
  deleteParametricRow,
  expandIdsToParametricRows,
  nextPatternOrder,
  patternRows,
  reconcileParametricRows,
  updateParametricRow,
} from './parametricRows'

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

const binding: ParametricRowBinding = {
  id: 'row-1',
  guideId: guide.id,
  symbolId: 'single',
  options: {
    distributionMode: 'count',
    count: 3,
    spacing: 40,
    orientation: 'radial',
    rotationOffset: 0,
    radialOffset: 0,
    ringIndex: 1,
  },
}

function row(count = 3, rowBinding = binding): StitchElement[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${rowBinding.id}-${index}`,
    symbolId: rowBinding.symbolId,
    x: index,
    y: index,
    rotation: 0,
    visible: index !== 1,
    locked: index === 1,
    parametricRow: rowBinding,
  }))
}

describe('parametric rows', () => {
  it('rebuilds geometry and preserves existing ids and flags', () => {
    const result = reconcileParametricRows(row(), [guide], () => 'new-id')
    expect(result.map((element) => element.id)).toEqual(['row-1-0', 'row-1-1', 'row-1-2'])
    expect(result[0].x).toBeCloseTo(100)
    expect(result[0].y).toBeCloseTo(0)
    expect(result[1].visible).toBe(false)
    expect(result[1].locked).toBe(true)
  })

  it('adds only the missing ids when the row grows', () => {
    let serial = 0
    const nextBinding = { ...binding, options: { ...binding.options, count: 5 } }
    const result = updateParametricRow(
      row(),
      [guide],
      binding.id,
      nextBinding,
      () => `new-${++serial}`,
    )
    expect(result).toHaveLength(5)
    expect(result.slice(0, 3).map((element) => element.id)).toEqual([
      'row-1-0',
      'row-1-1',
      'row-1-2',
    ])
    expect(result.slice(3).map((element) => element.id)).toEqual(['new-1', 'new-2'])
  })

  it('keeps a uniform row color and applies it to new stitches when the row grows', () => {
    let serial = 0
    const colored = row().map((element) => ({ ...element, color: '#c2413b' }))
    const nextBinding = { ...binding, options: { ...binding.options, count: 5 } }
    const result = updateParametricRow(
      colored,
      [guide],
      binding.id,
      nextBinding,
      () => `new-${++serial}`,
    )
    expect(result).toHaveLength(5)
    expect(result.map((element) => element.color)).toEqual(Array(5).fill('#c2413b'))
  })

  it('drops trailing children when the row shrinks', () => {
    const nextBinding = { ...binding, options: { ...binding.options, count: 2 } }
    const result = updateParametricRow(row(4), [guide], binding.id, nextBinding, () => 'unused')
    expect(result.map((element) => element.id)).toEqual(['row-1-0', 'row-1-1'])
  })

  it('follows guide geometry changes', () => {
    const moved = { ...guide, center: { x: 50, y: -20 } }
    const result = reconcileParametricRows(row(), [moved], () => 'unused')
    expect(result[0].x).toBeCloseTo(150)
    expect(result[0].y).toBeCloseTo(-20)
  })

  it('detaches a row instead of deleting stitches when its guide disappears', () => {
    const result = reconcileParametricRows(row(), [], () => 'unused')
    expect(result).toHaveLength(3)
    expect(result.every((element) => element.parametricRow === undefined)).toBe(true)
  })

  it('expands a child selection to the entire parametric row', () => {
    const elements = [
      ...row(),
      { id: 'manual', symbolId: 'single', x: 0, y: 0, rotation: 0 },
    ]
    expect(new Set(expandIdsToParametricRows(elements, ['row-1-1', 'manual']))).toEqual(
      new Set(['row-1-0', 'row-1-1', 'row-1-2', 'manual']),
    )
  })

  it('deletes the whole row as one logical object', () => {
    const manual: StitchElement = { id: 'manual', symbolId: 'single', x: 0, y: 0, rotation: 0 }
    expect(deleteParametricRow([...row(), manual], binding.id)).toEqual([manual])
  })

  it('sorts pattern rows by explicit pattern order', () => {
    const second = { ...binding, id: 'row-2', patternOrder: 2 }
    const first = { ...binding, id: 'row-0', patternOrder: 1 }
    const summaries = patternRows([...row(2, second), ...row(4, first)])
    expect(summaries.map((summary) => summary.id)).toEqual(['row-0', 'row-2'])
    expect(summaries.map((summary) => summary.stitchCount)).toEqual([4, 2])
    expect(summaries.map((summary) => summary.displayOrder)).toEqual([1, 2])
    expect(nextPatternOrder([...row(2, second), ...row(4, first)])).toBe(3)
  })

  it('creates six semantic increases from 6 to 12 stitches', () => {
    let serial = 0
    const parent: ParametricRowBinding = {
      ...binding,
      patternOrder: 1,
      options: { ...binding.options, count: 6 },
    }
    const result = createNextPatternRow(
      row(6, parent),
      [guide],
      parent,
      6,
      () => `id-${++serial}`,
    )
    expect(result).not.toBeNull()
    expect(result!.binding.parentRowId).toBe(parent.id)
    expect(result!.binding.patternOrder).toBe(2)
    expect(result!.binding.shaping).toEqual({ kind: 'increase', count: 6, baseCount: 6 })
    expect(result!.binding.options.count).toBe(12)
    expect(result!.binding.options.radialOffset).toBe(40)
    expect(result!.elements).toHaveLength(12)
  })

  it('creates six semantic decreases from 24 to 18 stitches', () => {
    let serial = 0
    const parent: ParametricRowBinding = {
      ...binding,
      options: { ...binding.options, count: 24 },
    }
    const result = createNextPatternRow(
      row(24, parent),
      [guide],
      parent,
      -6,
      () => `id-${++serial}`,
    )
    expect(result!.binding.shaping).toEqual({ kind: 'decrease', count: 6, baseCount: 24 })
    expect(result!.elements).toHaveLength(18)
  })

  it('keeps a valid manual topology override while rebuilding the row', () => {
    const parent: ParametricRowBinding = {
      ...binding,
      id: 'parent-row',
      patternOrder: 1,
      options: { ...binding.options, count: 8 },
    }
    const child: ParametricRowBinding = {
      ...binding,
      id: 'child-row',
      patternOrder: 2,
      parentRowId: parent.id,
      shaping: { kind: 'increase', count: 2, baseCount: 8 },
      topologyOverride: { changeParentIds: ['parent-row-4', 'parent-row-7'] },
      options: { ...binding.options, count: 10, radialOffset: 40 },
    }
    const result = reconcileParametricRows(
      [...row(8, parent), ...row(10, child)],
      [guide],
      () => 'unused',
    )
    const rebuilt = result.filter((element) => element.parametricRow?.id === child.id)
    expect(rebuilt[0].parametricRow?.topologyOverride).toEqual(child.topologyOverride)
    expect(rebuilt.filter((element, index) =>
      index > 0 && element.parentStitchIds?.[0] === rebuilt[index - 1].parentStitchIds?.[0],
    )).toHaveLength(2)
  })

  it('drops an invalid manual override when the parent stitch count changes', () => {
    const parent: ParametricRowBinding = {
      ...binding,
      id: 'parent-row',
      patternOrder: 1,
      options: { ...binding.options, count: 7 },
    }
    const child: ParametricRowBinding = {
      ...binding,
      id: 'child-row',
      patternOrder: 2,
      parentRowId: parent.id,
      shaping: { kind: 'increase', count: 2, baseCount: 8 },
      topologyOverride: { changeParentIds: ['parent-row-3', 'parent-row-7'] },
      options: { ...binding.options, count: 10, radialOffset: 40 },
    }
    const result = reconcileParametricRows(
      [...row(7, parent), ...row(10, child)],
      [guide],
      () => 'unused',
    )
    const rebuilt = result.filter((element) => element.parametricRow?.id === child.id)
    expect(rebuilt[0].parametricRow?.topologyOverride).toBeUndefined()
    expect(rebuilt.every((element) => element.parentStitchIds === undefined)).toBe(true)
  })

  it('builds a 6 → 12 → 18 → 24 → 30 increase sequence', () => {
    let serial = 0
    const parent: ParametricRowBinding = {
      ...binding,
      patternOrder: 1,
      options: { ...binding.options, count: 6 },
    }
    const source = row(6, parent)
    const result = createPatternIncreaseSequence(
      source,
      [guide],
      parent,
      6,
      4,
      () => `seq-${++serial}`,
    )
    expect(result.rows.map((item) => item.elements.length)).toEqual([12, 18, 24, 30])
    expect(result.rows.map((item) => item.binding.parentRowId)).toEqual([
      parent.id,
      result.rows[0].binding.id,
      result.rows[1].binding.id,
      result.rows[2].binding.id,
    ])
    expect(result.rows.map((item) => item.binding.patternOrder)).toEqual([2, 3, 4, 5])
  })
  it('detaches a legacy row from a line guide instead of deleting its stitches', () => {
    const lineGuide = {
      id: guide.id,
      type: 'line' as const,
      start: { x: -100, y: 0 },
      end: { x: 100, y: 0 },
      divisions: 4,
      visible: true,
    }
    const result = reconcileParametricRows(row(), [lineGuide], () => 'unused')
    expect(result).toHaveLength(3)
    expect(result.every((element) => element.parametricRow === undefined)).toBe(true)
  })

  it('applies reverse direction and skipped base stitches to parent topology', () => {
    const parent: ParametricRowBinding = {
      ...binding,
      id: 'parent-row',
      patternOrder: 1,
      options: { ...binding.options, count: 3 },
    }
    const child: ParametricRowBinding = {
      ...binding,
      id: 'child-row',
      patternOrder: 2,
      parentRowId: parent.id,
      construction: {
        mode: 'turning',
        direction: 'reverse',
        startChainCount: 1,
        startChainCountsAsStitch: false,
        skipFirstStitches: 1,
        joinWithSlipStitch: false,
        joinTarget: 'first-stitch',
      },
      options: { ...binding.options, count: 2, radialOffset: 40 },
    }
    const result = reconcileParametricRows(
      [...row(3, parent), ...row(2, child)],
      [guide],
      () => 'unused',
    )
    const children = result.filter((element) => element.parametricRow?.id === child.id)
    expect(children.map((element) => element.parentStitchIds)).toEqual([
      ['parent-row-1'],
      ['parent-row-0'],
    ])
  })

})

import { describe, expect, it } from 'vitest'
import type { ArcGuide, ParametricRowBinding, StitchElement } from '../types'
import {
  deleteParametricRow,
  expandIdsToParametricRows,
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

function row(count = 3): StitchElement[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `existing-${index}`,
    symbolId: 'single',
    x: index,
    y: index,
    rotation: 0,
    visible: index !== 1,
    locked: index === 1,
    parametricRow: binding,
  }))
}

describe('parametric rows', () => {
  it('rebuilds geometry and preserves existing ids and flags', () => {
    const result = reconcileParametricRows(row(), [guide], () => 'new-id')
    expect(result.map((element) => element.id)).toEqual(['existing-0', 'existing-1', 'existing-2'])
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
      'existing-0',
      'existing-1',
      'existing-2',
    ])
    expect(result.slice(3).map((element) => element.id)).toEqual(['new-1', 'new-2'])
  })

  it('drops trailing children when the row shrinks', () => {
    const nextBinding = { ...binding, options: { ...binding.options, count: 2 } }
    const result = updateParametricRow(row(4), [guide], binding.id, nextBinding, () => 'unused')
    expect(result.map((element) => element.id)).toEqual(['existing-0', 'existing-1'])
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
    expect(new Set(expandIdsToParametricRows(elements, ['existing-1', 'manual']))).toEqual(
      new Set(['existing-0', 'existing-1', 'existing-2', 'manual']),
    )
  })

  it('deletes the whole row as one logical object', () => {
    const manual: StitchElement = { id: 'manual', symbolId: 'single', x: 0, y: 0, rotation: 0 }
    expect(deleteParametricRow([...row(), manual], binding.id)).toEqual([manual])
  })
})

import { describe, expect, it } from 'vitest'
import type { ArcGuide, RadialGridGuide, StitchElement } from '../types'
import {
  cloneSelectionWithOffset,
  cloneWithRepeatedDelta,
  expandIdsToGroups,
  groupElements,
  mirrorElements,
  repeatSelection,
  selectionPivot,
  ungroupElements,
} from './productivity'

function ids() {
  let index = 0
  return () => `new-${++index}`
}

const base: StitchElement[] = [
  { id: 'a', symbolId: 'single', x: 10, y: 20, rotation: 0 },
  { id: 'b', symbolId: 'double', x: 30, y: 40, rotation: 30 },
]

const arc: ArcGuide = {
  id: 'arc',
  type: 'arc',
  center: { x: 0, y: 0 },
  radius: 100,
  startAngle: 0,
  endAngle: 360,
  divisions: 12,
  visible: true,
}

const radial: RadialGridGuide = {
  id: 'radial',
  type: 'radial-grid',
  center: { x: 0, y: 0 },
  ringCount: 4,
  ringSpacing: 50,
  sectorCount: 12,
  startAngle: 0,
  visible: true,
}

describe('productivity groups', () => {
  it('groups manual stitches and expands any selected member to the whole group', () => {
    const grouped = groupElements(base, ['a', 'b'], 'motif')
    expect(grouped.map((element) => element.groupId)).toEqual(['motif', 'motif'])
    expect(new Set(expandIdsToGroups(grouped, ['a']))).toEqual(new Set(['a', 'b']))
  })

  it('does not bind parametric stitches into a manual group', () => {
    const row: StitchElement = {
      ...base[1],
      parametricRow: {
        id: 'row',
        guideId: 'guide',
        symbolId: 'double',
        options: {
          distributionMode: 'count', count: 1, spacing: 20,
          orientation: 'fixed', rotationOffset: 0, radialOffset: 0, ringIndex: 1,
        },
      },
    }
    const grouped = groupElements([base[0], row], ['a', 'b'], 'motif')
    expect(grouped[0].groupId).toBe('motif')
    expect(grouped[1].groupId).toBeUndefined()
  })

  it('ungroups every member when only one member is targeted', () => {
    const grouped = base.map((element) => ({ ...element, groupId: 'motif' }))
    expect(ungroupElements(grouped, ['a']).every((element) => !element.groupId)).toBe(true)
  })
})

describe('productivity transforms', () => {
  it('uses the selection bounding-box center as pivot', () => {
    expect(selectionPivot(base, ['a', 'b'])).toEqual({ x: 20, y: 30 })
  })

  it('mirrors left/right and updates orientation', () => {
    const mirrored = mirrorElements(base, ['a', 'b'], 'left-right')
    expect(mirrored[0]).toMatchObject({ x: 30, y: 20, rotation: -180 })
    expect(mirrored[1].x).toBe(10)
    expect(mirrored[1].rotation).toBe(150)
  })

  it('mirrors top/bottom and updates orientation', () => {
    const mirrored = mirrorElements(base, ['a', 'b'], 'top-bottom')
    expect(mirrored[0]).toMatchObject({ x: 10, y: 40, rotation: 0 })
    expect(mirrored[1]).toMatchObject({ x: 30, y: 20, rotation: -30 })
  })

  it('duplicates with an offset while detaching semantic row topology', () => {
    const source: StitchElement[] = [{
      ...base[0],
      groupId: 'old-group',
      parentStitchIds: ['parent'],
      parametricRow: {
        id: 'row', guideId: 'guide', symbolId: 'single',
        options: {
          distributionMode: 'count', count: 1, spacing: 20,
          orientation: 'fixed', rotationOffset: 0, radialOffset: 0, ringIndex: 1,
        },
      },
    }]
    const cloned = cloneSelectionWithOffset(source, ['a'], 24, 24, ids())
    expect(cloned).toHaveLength(1)
    expect(cloned[0]).toMatchObject({ x: 34, y: 44, locked: false })
    expect(cloned[0].id).not.toBe('a')
    expect(cloned[0].groupId).not.toBe('old-group')
    expect(cloned[0].parametricRow).toBeUndefined()
    expect(cloned[0].parentStitchIds).toBeUndefined()
  })

  it('creates a linear array and groups each repeated motif', () => {
    const created = repeatSelection(base, ['a', 'b'], {
      mode: 'linear', copies: 2, deltaX: 50, deltaY: -10,
    }, ids())
    expect(created).toHaveLength(4)
    expect(created[0]).toMatchObject({ x: 60, y: 10 })
    expect(created[1]).toMatchObject({ x: 80, y: 30 })
    expect(created[2]).toMatchObject({ x: 110, y: 0 })
    expect(created[0].groupId).toBe(created[1].groupId)
    expect(created[2].groupId).toBe(created[3].groupId)
    expect(created[0].groupId).not.toBe(created[2].groupId)
  })

  it('creates a circular array around an explicit center', () => {
    const source: StitchElement[] = [{ id: 'a', symbolId: 'single', x: 100, y: 0, rotation: 0 }]
    const created = repeatSelection(source, ['a'], {
      mode: 'circular', copies: 3, angleStep: 90, center: { x: 0, y: 0 },
    }, ids())
    expect(created).toHaveLength(3)
    expect(created[0].x).toBeCloseTo(0)
    expect(created[0].y).toBeCloseTo(100)
    expect(created[0].rotation).toBe(90)
    expect(created[1].x).toBeCloseTo(-100)
    expect(created[2].y).toBeCloseTo(-100)
  })

  it('walks a motif along a closed arc and follows its tangent', () => {
    const source: StitchElement[] = [{ id: 'a', symbolId: 'single', x: 100, y: 0, rotation: 90 }]
    const quarterArc = Math.PI * 100 / 2
    const created = repeatSelection(source, ['a'], {
      mode: 'guide', copies: 1, spacing: quarterArc, orientation: 'tangent', guide: arc,
    }, ids())
    expect(created).toHaveLength(1)
    expect(created[0].x).toBeCloseTo(0, 3)
    expect(created[0].y).toBeCloseTo(100, 3)
    expect(created[0].rotation).toBeCloseTo(-180)
  })

  it('walks around the nearest radial ring', () => {
    const source: StitchElement[] = [{ id: 'a', symbolId: 'single', x: 100, y: 0, rotation: 0 }]
    const quarterRing = Math.PI * 100 / 2
    const created = repeatSelection(source, ['a'], {
      mode: 'guide', copies: 1, spacing: quarterRing, orientation: 'radial', guide: radial,
    }, ids())
    expect(created).toHaveLength(1)
    expect(created[0].x).toBeCloseTo(0, 3)
    expect(created[0].y).toBeCloseTo(100, 3)
    expect(created[0].rotation).toBeCloseTo(90)
  })

  it('repeats the delta between the source duplicate and its transformed copy', () => {
    const previous = [
      { id: 'a', symbolId: 'single', x: 0, y: 0, rotation: 0 },
      { id: 'b', symbolId: 'double', x: 20, y: 0, rotation: 10 },
    ] satisfies StitchElement[]
    const current = [
      { ...previous[0], id: 'c', x: 40, y: 15, rotation: 15 },
      { ...previous[1], id: 'd', x: 60, y: 15, rotation: 25 },
    ]
    const next = cloneWithRepeatedDelta(previous, current, ids())
    expect(next[0]).toMatchObject({ x: 80, y: 30, rotation: 30 })
    expect(next[1]).toMatchObject({ x: 100, y: 30, rotation: 40 })
  })
})

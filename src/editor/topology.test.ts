import { describe, expect, it } from 'vitest'
import type { RowShaping, StitchElement } from '../types'
import {
  applyRowTopology,
  automaticTopologyOverride,
  buildParentGroups,
  shiftTopologyChange,
  topologyChangeMarkers,
  topologyLinks,
  topologyOverrideIsCustom,
} from './topology'

function stitches(count: number, prefix: string): StitchElement[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}${index}`,
    symbolId: 'single',
    x: index * 10,
    y: 0,
    rotation: 0,
  }))
}

describe('stitch topology', () => {
  it('maps equal rows one-to-one', () => {
    const parents = stitches(4, 'p')
    expect(buildParentGroups(parents, 4)).toEqual([
      ['p0'], ['p1'], ['p2'], ['p3'],
    ])
  })

  it('maps six evenly distributed increases as 1-to-2', () => {
    const parents = stitches(24, 'p')
    const shaping: RowShaping = { kind: 'increase', count: 6, baseCount: 24 }
    const groups = buildParentGroups(parents, 30, shaping)

    expect(groups).toHaveLength(30)
    expect(groups.filter((group, index) => index > 0 && group[0] === groups[index - 1][0])).toHaveLength(6)
    expect(groups.slice(0, 5)).toEqual([['p0'], ['p1'], ['p2'], ['p3'], ['p3']])
    expect(groups.slice(-5)).toEqual([['p20'], ['p21'], ['p22'], ['p23'], ['p23']])
  })

  it('maps six evenly distributed decreases as 2-to-1', () => {
    const parents = stitches(24, 'p')
    const shaping: RowShaping = { kind: 'decrease', count: 6, baseCount: 24 }
    const groups = buildParentGroups(parents, 18, shaping)

    expect(groups).toHaveLength(18)
    expect(groups.filter((group) => group.length === 2)).toHaveLength(6)
    expect(groups.slice(0, 3)).toEqual([['p0'], ['p1'], ['p2', 'p3']])
    expect(groups.slice(-3)).toEqual([['p20'], ['p21'], ['p22', 'p23']])
  })

  it('leaves topology unresolved when manual child count differs', () => {
    expect(buildParentGroups(stitches(4, 'p'), 5)).toEqual([[], [], [], [], []])
  })

  it('persists parent ids on child stitches and exposes links', () => {
    const parents = stitches(2, 'p')
    const children = stitches(2, 'c').map((element) => ({
      ...element,
      parametricRow: {
        id: 'row-2',
        guideId: 'guide-1',
        symbolId: 'single',
        parentRowId: 'row-1',
        options: {
          distributionMode: 'count' as const,
          count: 2,
          spacing: 20,
          orientation: 'radial' as const,
          rotationOffset: 0,
          radialOffset: 40,
          ringIndex: 1,
        },
      },
    }))
    const linked = applyRowTopology(children, parents)

    expect(linked.map((element) => element.parentStitchIds)).toEqual([['p0'], ['p1']])
    expect(topologyLinks(linked, 'row-2')).toEqual([
      { childId: 'c0', parentIds: ['p0'] },
      { childId: 'c1', parentIds: ['p1'] },
    ])
  })

  it('moves an increase from one parent stitch to its neighbor', () => {
    const parents = stitches(8, 'p')
    const shaping: RowShaping = { kind: 'increase', count: 2, baseCount: 8 }
    const automatic = automaticTopologyOverride(parents, shaping)!
    expect(automatic.changeParentIds).toEqual(['p3', 'p7'])

    const moved = shiftTopologyChange(parents, shaping, automatic, 'p3', 1)!
    expect(moved.changeParentIds).toEqual(['p4', 'p7'])
    expect(topologyOverrideIsCustom(parents, shaping, moved)).toBe(true)
    expect(buildParentGroups(parents, 10, shaping, moved).slice(3, 7)).toEqual([
      ['p3'], ['p4'], ['p4'], ['p5'],
    ])
  })

  it('prevents decrease overrides from overlapping neighboring pairs', () => {
    const parents = stitches(8, 'p')
    const shaping: RowShaping = { kind: 'decrease', count: 2, baseCount: 8 }
    const automatic = automaticTopologyOverride(parents, shaping)!
    expect(automatic.changeParentIds).toEqual(['p3', 'p7'])
    expect(shiftTopologyChange(parents, shaping, automatic, 'p3', 1)).not.toBeNull()

    const crowded = { changeParentIds: ['p2', 'p3'] }
    expect(buildParentGroups(parents, 6, shaping, crowded)).toEqual([[], [], [], [], [], []])
  })

  it('derives editable change markers from resolved topology', () => {
    const parents = stitches(4, 'p')
    const binding = {
      id: 'row-2',
      guideId: 'guide-1',
      symbolId: 'single',
      parentRowId: 'row-1',
      shaping: { kind: 'increase' as const, count: 1, baseCount: 4 },
      options: {
        distributionMode: 'count' as const,
        count: 5,
        spacing: 20,
        orientation: 'radial' as const,
        rotationOffset: 0,
        radialOffset: 40,
        ringIndex: 1,
      },
    }
    const children = applyRowTopology(
      stitches(5, 'c').map((child) => ({ ...child, parametricRow: binding })),
      parents,
      binding.shaping,
    )
    const markers = topologyChangeMarkers(children, binding.id)
    expect(markers).toEqual([{ childId: 'c4', parentId: 'p3', kind: 'increase' }])
  })
})

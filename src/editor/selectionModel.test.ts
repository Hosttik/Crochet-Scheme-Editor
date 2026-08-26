import { describe, expect, it } from 'vitest'
import type { StitchElement } from '../types'
import { semanticLockIds, semanticSelectionIds } from './selectionModel'

const stitch = (id: string, patch: Partial<StitchElement> = {}): StitchElement => ({
  id, symbolId: 'single', x: 0, y: 0, rotation: 0, visible: true, locked: false, ...patch,
})

describe('semanticSelectionIds', () => {
  it('selects a complete unlocked group atomically', () => {
    const elements = [stitch('a', { groupId: 'g' }), stitch('b', { groupId: 'g' })]
    expect(semanticSelectionIds(elements, ['a'])).toEqual(['a', 'b'])
  })

  it('blocks a group when any member is locked', () => {
    const elements = [stitch('a', { groupId: 'g' }), stitch('b', { groupId: 'g', locked: true })]
    expect(semanticSelectionIds(elements, ['a'])).toEqual([])
    expect(semanticSelectionIds(elements, ['a'], { expandGroups: false })).toEqual(['a'])
  })

  it('blocks a parametric row when any member is locked', () => {
    const binding = {
      id: 'row', guideId: 'guide', symbolId: 'single',
      options: { distributionMode: 'count' as const, count: 2, spacing: 20, orientation: 'radial' as const, rotationOffset: 0, radialOffset: 0, ringIndex: 1 },
    }
    const elements = [stitch('a', { parametricRow: binding }), stitch('b', { parametricRow: binding, locked: true })]
    expect(semanticSelectionIds(elements, ['a'])).toEqual([])
    expect(semanticLockIds(elements, 'a')).toEqual(['a', 'b'])
  })
})

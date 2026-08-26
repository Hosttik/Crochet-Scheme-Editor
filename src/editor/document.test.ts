import { describe, expect, it } from 'vitest'
import type { CrochetProject, SnappingSettings, StitchElement } from '../types'
import {
  bringForward,
  bringToFront,
  normalizeProject,
  sendBackward,
  sendToBack,
} from './document'

const snapping: SnappingSettings = {
  enabled: true,
  sourceAnchor: 'bottom',
  orientationMode: 'none',
  snapToVertices: true,
  tolerancePx: 12,
}

function element(id: string): StitchElement {
  return { id, symbolId: 'chain', x: 0, y: 0, rotation: 0, visible: true, locked: false }
}

function ids(elements: StitchElement[]) {
  return elements.map((item) => item.id)
}

describe('layer ordering', () => {
  const source = ['a', 'b', 'c', 'd', 'e'].map(element)

  it('moves a disjoint selection one step forward without changing selected order', () => {
    expect(ids(bringForward(source, ['b', 'd']))).toEqual(['a', 'c', 'b', 'e', 'd'])
  })

  it('moves a selection one step backward', () => {
    expect(ids(sendBackward(source, ['b', 'd']))).toEqual(['b', 'a', 'd', 'c', 'e'])
  })

  it('moves a selection to the front and preserves its internal order', () => {
    expect(ids(bringToFront(source, ['b', 'd']))).toEqual(['a', 'c', 'e', 'b', 'd'])
  })

  it('moves a selection to the back and preserves its internal order', () => {
    expect(ids(sendToBack(source, ['b', 'd']))).toEqual(['b', 'd', 'a', 'c', 'e'])
  })
})

describe('project migration', () => {
  it('upgrades legacy stitch visibility and lock flags to schema v18', () => {
    const legacy = {
      schemaVersion: 2,
      metadata: { title: 'Legacy', updatedAt: '2026-01-01T00:00:00.000Z' },
      elements: [{ id: 'a', symbolId: 'chain', x: 1, y: 2, rotation: 0 }],
      guides: [],
      settings: { snapping },
    } as CrochetProject

    const migrated = normalizeProject(legacy, snapping)
    expect(migrated.schemaVersion).toBe(18)
    expect(migrated.elements[0]).toMatchObject({ visible: true, locked: false })
  })

  it('preserves explicit hidden, locked and topology fields', () => {
    const project: CrochetProject = {
      schemaVersion: 7,
      metadata: { title: 'Current', updatedAt: '2026-01-01T00:00:00.000Z' },
      elements: [{ ...element('a'), visible: false, locked: true, parentStitchIds: ['parent'] }],
      guides: [],
      settings: { snapping },
    }

    const migrated = normalizeProject(project, snapping)
    expect(migrated.schemaVersion).toBe(18)
    expect(migrated.elements[0]).toMatchObject({
      visible: false,
      locked: true,
      parentStitchIds: ['parent'],
    })
  })
})

import { describe, expect, it } from 'vitest'
import type { StitchElement } from '../types'
import { usedLegendItems } from './legend'

function stitch(id: string, symbolId: string, visible = true): StitchElement {
  return { id, symbolId, x: 0, y: 0, rotation: 0, visible, locked: false }
}

describe('automatic legend', () => {
  it('includes each visible used symbol once in palette order', () => {
    const items = usedLegendItems([
      stitch('a', 'double'),
      stitch('b', 'single'),
      stitch('c', 'double'),
      stitch('d', 'treble', false),
    ])
    expect(items.map((item) => item.id)).toEqual(['single', 'double'])
  })
})

import { describe, expect, it } from 'vitest'
import type { StitchElement } from '../types'
import { MAX_REPEAT_CREATED_ELEMENTS, repeatSelection } from './productivity'

describe('repeat operation budget', () => {
  it('caps generated stitches for large motifs', () => {
    const elements: StitchElement[] = Array.from({ length: 200 }, (_, index) => ({
      id: `s-${index}`, symbolId: 'single', x: index, y: 0, rotation: 0,
    }))
    let serial = 0
    const created = repeatSelection(elements, elements.map((item) => item.id), { mode: 'linear', copies: 100, deltaX: 10, deltaY: 0 }, () => `copy-${serial++}`)
    expect(created.length).toBeLessThanOrEqual(MAX_REPEAT_CREATED_ELEMENTS)
    expect(created.length).toBeGreaterThan(0)
  })
})

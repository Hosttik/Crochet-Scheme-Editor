import { describe, expect, it } from 'vitest'
import type { StitchElement } from '../types'
import { DEFAULT_STITCH_COLOR, normalizedStitchColor } from './elementColor'
import { cloneSelectionWithOffset } from './productivity'

describe('visual styling propagation', () => {
  it('keeps custom colors when a stitch is duplicated', () => {
    const source: StitchElement[] = [
      { id: 'a', symbolId: 'single', x: 0, y: 0, rotation: 0, color: '#2563eb' },
    ]
    const copy = cloneSelectionWithOffset(source, ['a'], 20, 20, () => 'copy')
    expect(copy[0].color).toBe('#2563eb')
  })

  it('renders missing persisted color as the visual default', () => {
    expect(normalizedStitchColor()).toBe(DEFAULT_STITCH_COLOR)
  })
})

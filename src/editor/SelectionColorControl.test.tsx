import { describe, expect, it } from 'vitest'
import { DEFAULT_STITCH_COLOR, normalizedStitchColor } from './elementColor'

describe('selection color display values', () => {
  it('resolves missing colors to the default visual color', () => {
    expect(normalizedStitchColor(undefined)).toBe(DEFAULT_STITCH_COLOR)
  })
})

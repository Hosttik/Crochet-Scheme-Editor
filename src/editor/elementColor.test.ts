import { describe, expect, it } from 'vitest'
import {
  DEFAULT_STITCH_COLOR,
  isStitchColor,
  normalizedStitchColor,
  storedStitchColor,
} from './elementColor'

describe('element colors', () => {
  it('accepts six-digit hex colors and normalizes case', () => {
    expect(isStitchColor('#C2413B')).toBe(true)
    expect(normalizedStitchColor('#C2413B')).toBe('#c2413b')
    expect(isStitchColor('red')).toBe(false)
    expect(isStitchColor('#123')).toBe(false)
  })

  it('omits the default stitch color from persisted elements', () => {
    expect(storedStitchColor(DEFAULT_STITCH_COLOR)).toBeUndefined()
    expect(storedStitchColor('#2563EB')).toBe('#2563eb')
  })
})

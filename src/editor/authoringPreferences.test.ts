import { describe, expect, it } from 'vitest'
import { validGuideSpacing } from './authoringPreferences'

describe('authoring preferences', () => {
  it('accepts a persisted non-negative path gap', () => {
    expect(validGuideSpacing(0)).toBe(0)
    expect(validGuideSpacing(12.5)).toBe(12.5)
  })

  it('rejects invalid path gap preferences', () => {
    expect(validGuideSpacing(-1)).toBeNull()
    expect(validGuideSpacing(Number.NaN)).toBeNull()
    expect(validGuideSpacing('12')).toBeNull()
  })
})

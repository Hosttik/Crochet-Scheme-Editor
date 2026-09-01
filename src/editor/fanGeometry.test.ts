import { describe, expect, it } from 'vitest'
import {
  semanticBaseStemSpacing,
  semanticStemCount,
  semanticStemSpacing,
  spreadForSemanticStemSpacing,
} from './fanGeometry'

describe('semantic fan geometry', () => {
  it('maps supported increases to their stem count', () => {
    expect(semanticStemCount('single-2-in-1')).toBe(2)
    expect(semanticStemCount('double-5-shell')).toBe(5)
    expect(semanticStemCount('double')).toBeNull()
  })

  it('expresses spread as actual neighboring-stem spacing', () => {
    expect(semanticBaseStemSpacing('double-3-in-1')).toBe(9)
    expect(semanticStemSpacing('double-3-in-1', 2)).toBe(18)
    expect(spreadForSemanticStemSpacing('double-3-in-1', 18)).toBe(2)
  })

  it('keeps the wider two-stem base geometry reversible', () => {
    expect(semanticBaseStemSpacing('single-2-in-1')).toBe(18)
    expect(spreadForSemanticStemSpacing('single-2-in-1', 27)).toBe(1.5)
  })
})

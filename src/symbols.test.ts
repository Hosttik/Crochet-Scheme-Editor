import { describe, expect, it } from 'vitest'
import { SYMBOL_BY_ID, symbolSvgMarkup } from './symbols'

describe('crochet chart glyphs', () => {
  it('uses source abbreviations for the core stitches', () => {
    expect(SYMBOL_BY_ID.get('chain')?.abbreviation).toBe('ch')
    expect(SYMBOL_BY_ID.get('slip')?.abbreviation).toBe('sl st')
    expect(SYMBOL_BY_ID.get('single')?.abbreviation).toBe('sc')
    expect(SYMBOL_BY_ID.get('half-double')?.abbreviation).toBe('hdc')
    expect(SYMBOL_BY_ID.get('double')?.abbreviation).toBe('dc')
    expect(SYMBOL_BY_ID.get('treble')?.abbreviation).toBe('tr')
  })

  it('renders single crochet as an upright plus', () => {
    expect(symbolSvgMarkup('single')).toContain('M -9 0 L 9 0 M 0 -9 L 0 9')
  })

  it('renders tall stitches with perpendicular top bars instead of chevrons', () => {
    expect(symbolSvgMarkup('half-double')).toContain('M -9 -18 L 9 -18')
    expect(symbolSvgMarkup('double')).toContain('M -9 -25 L 9 -25')
    expect(symbolSvgMarkup('treble')).toContain('M -9 -30 L 9 -30')
    expect(symbolSvgMarkup('half-double')).not.toContain('L 0 -14')
    expect(symbolSvgMarkup('double')).not.toContain('L 0 -21')
    expect(symbolSvgMarkup('treble')).not.toContain('L 0 -26')
  })

  it('renders the magic ring as a plain circle', () => {
    const markup = symbolSvgMarkup('magic-ring')
    expect(markup).toContain('<circle')
    expect(markup).not.toContain('<path')
  })
})

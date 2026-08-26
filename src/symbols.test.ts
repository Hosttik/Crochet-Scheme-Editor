import { describe, expect, it } from 'vitest'
import { categoryName, symbolName } from './i18n'
import { hasSymbolGlyph, STITCH_SYMBOLS, SYMBOLS, SYMBOL_BY_ID, symbolSvgMarkup } from './symbols'

const LEGACY_SYMBOL_IDS = [
  'chain',
  'slip',
  'single',
  'half-double',
  'double',
  'treble',
  'picot',
  'magic-ring',
]

describe('crochet chart glyphs', () => {
  it('contains the complete supplied reference set plus the existing picot symbol', () => {
    expect(SYMBOLS).toHaveLength(44)
    expect(SYMBOL_BY_ID.size).toBe(SYMBOLS.length)
  })

  it('preserves every legacy symbol id for stored project compatibility', () => {
    for (const id of LEGACY_SYMBOL_IDS) expect(SYMBOL_BY_ID.has(id)).toBe(true)
  })

  it('has unique ids, valid geometry, localized names and explicit SVG glyphs', () => {
    const ids = SYMBOLS.map((symbol) => symbol.id)
    expect(new Set(ids).size).toBe(ids.length)

    for (const symbol of SYMBOLS) {
      expect(symbol.width).toBeGreaterThan(0)
      expect(symbol.height).toBeGreaterThan(0)
      expect(hasSymbolGlyph(symbol.id)).toBe(true)
      expect(symbolSvgMarkup(symbol.id)).not.toBe('')
      expect(symbolName(symbol.id, '__missing__', 'ru')).not.toBe('__missing__')
      expect(symbolName(symbol.id, '__missing__', 'en')).not.toBe('__missing__')
      expect(categoryName(symbol.category, 'ru')).not.toBe(symbol.category)
    }
  })

  it('keeps start/end markers out of the stitch-only catalog', () => {
    expect(STITCH_SYMBOLS).toHaveLength(42)
    expect(STITCH_SYMBOLS.some((symbol) => symbol.id === 'start-marker')).toBe(false)
    expect(STITCH_SYMBOLS.some((symbol) => symbol.id === 'end-marker')).toBe(false)
  })

  it('uses the supplied abbreviations for the core and tall stitches', () => {
    expect(SYMBOL_BY_ID.get('chain')?.abbreviation).toBe('ch')
    expect(SYMBOL_BY_ID.get('slip')?.abbreviation).toBe('sl st / ss')
    expect(SYMBOL_BY_ID.get('single')?.abbreviation).toBe('sc')
    expect(SYMBOL_BY_ID.get('half-double')?.abbreviation).toBe('hdc')
    expect(SYMBOL_BY_ID.get('double')?.abbreviation).toBe('dc')
    expect(SYMBOL_BY_ID.get('treble')?.abbreviation).toBe('tr')
    expect(SYMBOL_BY_ID.get('double-treble')?.abbreviation).toBe('dtr')
    expect(SYMBOL_BY_ID.get('triple-treble')?.abbreviation).toBe('trtr / ddtr')
  })

  it('renders chain and slip stitch according to the supplied chart notation', () => {
    expect(symbolSvgMarkup('chain')).toContain('<ellipse')
    expect(symbolSvgMarkup('chain')).toContain('rx="10"')
    expect(symbolSvgMarkup('chain')).toContain('ry="4"')
    expect(symbolSvgMarkup('slip')).toContain('fill="currentColor"')
    expect(symbolSvgMarkup('slip')).toContain('stroke="none"')
  })

  it('renders single crochet as an upright plus', () => {
    expect(symbolSvgMarkup('single')).toContain('M -9 0 L 9 0 M 0 -9 L 0 9')
  })

  it('renders tall stitches with perpendicular top bars and increasing yarn-over marks', () => {
    expect(symbolSvgMarkup('half-double')).toContain('M -9 -18 L 9 -18')
    expect(symbolSvgMarkup('double')).toContain('M -9 -25 L 9 -25')
    expect(symbolSvgMarkup('treble')).toContain('M -9 -30 L 9 -30')
    expect(symbolSvgMarkup('double-treble')).toContain('M -9 -32 L 9 -32')
    expect(symbolSvgMarkup('triple-treble')).toContain('M -9 -34 L 9 -34')
  })

  it('renders the magic ring as a plain circle', () => {
    const markup = symbolSvgMarkup('magic-ring')
    expect(markup).toContain('<circle')
    expect(markup).not.toContain('<path')
  })
})

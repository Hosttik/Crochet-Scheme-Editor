import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PRINT_SETTINGS,
  buildTiledPrintHtml,
  layoutPrintTiles,
  parseSvgViewBox,
} from './printLayout'

describe('tiled print layout', () => {
  it('keeps small content on one A4 page', () => {
    const layout = layoutPrintTiles({ left: 0, top: 0, width: 400, height: 400 }, DEFAULT_PRINT_SETTINGS)
    expect(layout.columns).toBe(1)
    expect(layout.rows).toBe(1)
    expect(layout.tiles).toHaveLength(1)
  })

  it('creates overlapping tiles for large content', () => {
    const settings = { ...DEFAULT_PRINT_SETTINGS, scalePercent: 100, overlapMm: 10 }
    const layout = layoutPrintTiles({ left: -100, top: 20, width: 2200, height: 1600 }, settings)
    expect(layout.columns).toBeGreaterThan(1)
    expect(layout.rows).toBeGreaterThan(1)
    const first = layout.tiles[0]
    const second = layout.tiles[1]
    expect(second.x - first.x).toBeLessThan(first.width)
  })

  it('uses landscape dimensions when requested', () => {
    const layout = layoutPrintTiles(
      { left: 0, top: 0, width: 1000, height: 400 },
      { ...DEFAULT_PRINT_SETTINGS, orientation: 'landscape' },
    )
    expect(layout.paperWidthMm).toBeGreaterThan(layout.paperHeightMm)
  })

  it('parses exported SVG viewBox', () => {
    expect(parseSvgViewBox('<svg viewBox="-20 10 640 480"></svg>')).toEqual({
      left: -20,
      top: 10,
      width: 640,
      height: 480,
    })
  })

  it('builds printable HTML with page labels and crop marks', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2000 1500"><circle cx="10" cy="10" r="5"/></svg>'
    const html = buildTiledPrintHtml(svg, parseSvgViewBox(svg), DEFAULT_PRINT_SETTINGS, 'Chart', 'en')
    expect(html).toContain('class="print-page"')
    expect(html).toContain('class="crop tl h"')
    expect(html).toContain('Chart · 1/')
    expect(html).toContain('@page')
  })
})

import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PRINT_SETTINGS,
  buildTiledPrintHtml,
  layoutPrintTiles,
  parseLegendPrintBounds,
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

  it('builds printable HTML with complete page frames and registration crosses', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2000 1500"><circle cx="10" cy="10" r="5"/></svg>'
    const html = buildTiledPrintHtml(svg, parseSvgViewBox(svg), DEFAULT_PRINT_SETTINGS, 'Chart', 'en')
    expect(html).toContain('class="print-page"')
    expect(html).toContain('class="page-frame"')
    expect(html).toContain('class="registration-cross"')
    expect(html).not.toContain('class="crop ')
    expect(html).toContain('Chart · 1/')
    expect(html).toContain('@page')
  })

  it('can omit printed page frames without changing the page grid', () => {
    const svg = '<svg viewBox="0 0 2000 1500"></svg>'
    const settings = { ...DEFAULT_PRINT_SETTINGS, pageFrames: false }
    const html = buildTiledPrintHtml(svg, parseSvgViewBox(svg), settings, 'Chart', 'en')
    expect(html).not.toContain('class="page-frame"')
    expect(layoutPrintTiles(parseSvgViewBox(svg), settings).tiles.length).toBeGreaterThan(1)
  })

  it('does not print alignment marks without a shared overlap', () => {
    const svg = '<svg viewBox="0 0 2000 1500"></svg>'
    const settings = { ...DEFAULT_PRINT_SETTINGS, overlapMm: 0 }
    const html = buildTiledPrintHtml(svg, parseSvgViewBox(svg), settings, 'Chart', 'en')
    expect(html).not.toContain('class="registration-cross"')
  })

  it('accounts for long legend labels and renders the legend inside a printable overlay', () => {
    const svg = '<svg viewBox="0 0 1300 800"><rect x="0" y="0" width="1300" height="800" fill="white"/><g class="crochet-legend"><rect x="980" y="40" width="250" height="220"/><text x="992" y="63">Legend</text><g><text x="1028" y="100">A very long stitch label that extends beyond the old fixed frame</text></g></g></svg>'
    const legendBounds = parseLegendPrintBounds(svg)
    expect(legendBounds).not.toBeNull()
    expect(legendBounds!.width).toBeGreaterThan(250)

    const html = buildTiledPrintHtml(svg, parseSvgViewBox(svg), DEFAULT_PRINT_SETTINGS, 'Chart', 'en')
    expect(html).toContain('class="print-legend-overlay"')
    expect(html).toContain('.chart-svg .crochet-legend { display: none; }')
    expect(html).toContain('.print-legend-overlay svg > :not(.crochet-legend) { display: none; }')
  })
})

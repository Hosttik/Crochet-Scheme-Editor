import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PRINT_SETTINGS,
  buildTiledPrintHtml,
  layoutPrintTiles,
  parseLegendPrintBounds,
  parsePrintViewBox,
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

  it('fits a wide chart on one page and automatically chooses landscape', () => {
    const layout = layoutPrintTiles(
      { left: 0, top: 0, width: 1600, height: 500 },
      { ...DEFAULT_PRINT_SETTINGS, mode: 'fit-one', orientation: 'portrait' },
    )
    expect(layout.columns).toBe(1)
    expect(layout.rows).toBe(1)
    expect(layout.tiles).toHaveLength(1)
    expect(layout.resolvedOrientation).toBe('landscape')
    expect(layout.resolvedScalePercent).toBeGreaterThan(0)
  })

  it('keeps the complete chart inside the single fit-to-page tile', () => {
    const bounds = { left: -420, top: 135, width: 2870, height: 1640 }
    const layout = layoutPrintTiles(
      bounds,
      { ...DEFAULT_PRINT_SETTINGS, mode: 'fit-one', pageFillPercent: 100, marginMm: 2 },
    )
    const [tile] = layout.tiles
    expect(tile).toBeDefined()
    expect(tile.x).toBeLessThanOrEqual(bounds.left)
    expect(tile.y).toBeLessThanOrEqual(bounds.top)
    expect(tile.x + tile.width).toBeGreaterThanOrEqual(bounds.left + bounds.width)
    expect(tile.y + tile.height).toBeGreaterThanOrEqual(bounds.top + bounds.height)
  })

  it('fits a tall chart on one page and automatically chooses portrait', () => {
    const layout = layoutPrintTiles(
      { left: 0, top: 0, width: 500, height: 1600 },
      { ...DEFAULT_PRINT_SETTINGS, mode: 'fit-one', orientation: 'landscape' },
    )
    expect(layout.columns).toBe(1)
    expect(layout.rows).toBe(1)
    expect(layout.resolvedOrientation).toBe('portrait')
  })

  it('lets automatic fit use less than the maximum page fill', () => {
    const bounds = { left: 0, top: 0, width: 1200, height: 800 }
    const full = layoutPrintTiles(
      bounds,
      { ...DEFAULT_PRINT_SETTINGS, mode: 'fit-one', pageFillPercent: 100 },
    )
    const reduced = layoutPrintTiles(
      bounds,
      { ...DEFAULT_PRINT_SETTINGS, mode: 'fit-one', pageFillPercent: 75 },
    )
    expect(reduced.resolvedScalePercent).toBeCloseTo(full.resolvedScalePercent * 0.75, 6)
    expect(reduced.tiles).toHaveLength(1)
  })

  it('uses user-controlled page margins when calculating the available A4 area', () => {
    const bounds = { left: 0, top: 0, width: 1200, height: 800 }
    const compact = layoutPrintTiles(
      bounds,
      { ...DEFAULT_PRINT_SETTINGS, mode: 'fit-one', marginMm: 2 },
    )
    const roomy = layoutPrintTiles(
      bounds,
      { ...DEFAULT_PRINT_SETTINGS, mode: 'fit-one', marginMm: 20 },
    )
    expect(compact.printableWidthMm).toBeGreaterThan(roomy.printableWidthMm)
    expect(compact.printableHeightMm).toBeGreaterThan(roomy.printableHeightMm)
    expect(compact.resolvedScalePercent).toBeGreaterThan(roomy.resolvedScalePercent)
  })

  it('creates exactly the requested custom page grid', () => {
    const layout = layoutPrintTiles(
      { left: -100, top: 20, width: 2400, height: 1400 },
      {
        ...DEFAULT_PRINT_SETTINGS,
        mode: 'fixed-grid',
        pageColumns: 3,
        pageRows: 2,
        orientation: 'landscape',
        overlapMm: 8,
      },
    )
    expect(layout.columns).toBe(3)
    expect(layout.rows).toBe(2)
    expect(layout.tiles).toHaveLength(6)
    expect(layout.resolvedOrientation).toBe('landscape')
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

  it('prefers tight print bounds over the padded export SVG viewBox', () => {
    const svg = '<svg viewBox="-40 -40 900 700" data-print-view-box="10 20 500 300"></svg>'
    expect(parsePrintViewBox(svg)).toEqual({
      left: 10,
      top: 20,
      width: 500,
      height: 300,
    })
  })

  it('falls back to the SVG viewBox when tight print bounds are absent', () => {
    const svg = '<svg viewBox="-20 10 640 480"></svg>'
    expect(parsePrintViewBox(svg)).toEqual(parseSvgViewBox(svg))
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
    expect(html).toContain('shape-rendering: geometricPrecision')
    expect(html).toContain('print-color-adjust: exact')
  })

  it('scales non-scaling editor strokes with the chart in print output', () => {
    const svg = '<svg viewBox="0 0 1800 1200"><path d="M 0 0 L 100 100" stroke="black" stroke-width="2.4" vector-effect="non-scaling-stroke"/></svg>'
    const settings = { ...DEFAULT_PRINT_SETTINGS, mode: 'fit-one' as const }
    const html = buildTiledPrintHtml(svg, parseSvgViewBox(svg), settings, 'Chart', 'en')
    expect(html).toContain('.chart-svg [vector-effect="non-scaling-stroke"] { vector-effect: none; }')
    expect(html).toContain('preserveAspectRatio="xMidYMid meet"')
  })

  it('renders exactly one printable section in fit-one mode', () => {
    const svg = '<svg viewBox="0 0 1800 600"></svg>'
    const settings = { ...DEFAULT_PRINT_SETTINGS, mode: 'fit-one' as const }
    const html = buildTiledPrintHtml(svg, parseSvgViewBox(svg), settings, 'Chart', 'en')
    expect((html.match(/<section class="print-page">/g) ?? [])).toHaveLength(1)
    expect(html).toContain('@page')
  })

  it('renders the requested number of printable sections for a custom grid', () => {
    const svg = '<svg viewBox="0 0 2400 1400"></svg>'
    const settings = {
      ...DEFAULT_PRINT_SETTINGS,
      mode: 'fixed-grid' as const,
      pageColumns: 2,
      pageRows: 3,
    }
    const html = buildTiledPrintHtml(svg, parseSvgViewBox(svg), settings, 'Chart', 'en')
    expect((html.match(/<section class="print-page">/g) ?? [])).toHaveLength(6)
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

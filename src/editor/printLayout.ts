export type PrintPaper = 'a4' | 'letter'
export type PrintOrientation = 'portrait' | 'landscape'

export type PrintSettings = {
  paper: PrintPaper
  orientation: PrintOrientation
  scalePercent: number
  overlapMm: number
  marginMm: number
  pageFrames: boolean
  alignmentMarks: boolean
}

export type PrintBounds = {
  left: number
  top: number
  width: number
  height: number
}

export type PrintTile = {
  row: number
  column: number
  x: number
  y: number
  width: number
  height: number
}

export type PrintLayout = {
  paperWidthMm: number
  paperHeightMm: number
  printableWidthMm: number
  printableHeightMm: number
  rows: number
  columns: number
  tiles: PrintTile[]
}

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  paper: 'a4',
  orientation: 'portrait',
  scalePercent: 100,
  overlapMm: 5,
  marginMm: 10,
  pageFrames: true,
  alignmentMarks: true,
}

const PAPER_MM: Record<PrintPaper, { width: number; height: number }> = {
  a4: { width: 210, height: 297 },
  letter: { width: 215.9, height: 279.4 },
}

const PX_PER_MM = 96 / 25.4

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function normalizedPrintSettings(settings: PrintSettings): PrintSettings {
  const base = PAPER_MM[settings.paper] ?? PAPER_MM.a4
  const width = settings.orientation === 'landscape' ? base.height : base.width
  const height = settings.orientation === 'landscape' ? base.width : base.height
  const maxMargin = Math.max(0, Math.min(width, height) / 2 - 5)
  const marginMm = clamp(Number.isFinite(settings.marginMm) ? settings.marginMm : 10, 0, maxMargin)
  const printableMin = Math.min(width - marginMm * 2, height - marginMm * 2)
  return {
    paper: settings.paper === 'letter' ? 'letter' : 'a4',
    orientation: settings.orientation === 'landscape' ? 'landscape' : 'portrait',
    scalePercent: clamp(Number.isFinite(settings.scalePercent) ? settings.scalePercent : 100, 10, 400),
    overlapMm: clamp(Number.isFinite(settings.overlapMm) ? settings.overlapMm : 5, 0, Math.max(0, printableMin - 1)),
    marginMm,
    pageFrames: settings.pageFrames !== false,
    alignmentMarks: settings.alignmentMarks !== false,
  }
}

function axisPositions(start: number, contentSize: number, tileSize: number, overlap: number) {
  if (contentSize <= tileSize) return [start]
  const stride = Math.max(1, tileSize - overlap)
  const count = 1 + Math.ceil((contentSize - tileSize) / stride)
  const maxStart = start + contentSize - tileSize
  return Array.from({ length: count }, (_, index) => Math.min(start + index * stride, maxStart))
}

export function layoutPrintTiles(bounds: PrintBounds, rawSettings: PrintSettings): PrintLayout {
  const settings = normalizedPrintSettings(rawSettings)
  const base = PAPER_MM[settings.paper]
  const paperWidthMm = settings.orientation === 'landscape' ? base.height : base.width
  const paperHeightMm = settings.orientation === 'landscape' ? base.width : base.height
  const printableWidthMm = paperWidthMm - settings.marginMm * 2
  const printableHeightMm = paperHeightMm - settings.marginMm * 2
  const scale = settings.scalePercent / 100
  const docUnitsPerMm = PX_PER_MM / scale
  const tileWidth = printableWidthMm * docUnitsPerMm
  const tileHeight = printableHeightMm * docUnitsPerMm
  const overlap = settings.overlapMm * docUnitsPerMm
  const safeBounds = {
    left: Number.isFinite(bounds.left) ? bounds.left : 0,
    top: Number.isFinite(bounds.top) ? bounds.top : 0,
    width: Math.max(1, Number.isFinite(bounds.width) ? bounds.width : 1),
    height: Math.max(1, Number.isFinite(bounds.height) ? bounds.height : 1),
  }
  const xs = axisPositions(safeBounds.left, safeBounds.width, tileWidth, overlap)
  const ys = axisPositions(safeBounds.top, safeBounds.height, tileHeight, overlap)
  const tiles = ys.flatMap((y, row) => xs.map((x, column) => ({
    row,
    column,
    x,
    y,
    width: tileWidth,
    height: tileHeight,
  })))
  return {
    paperWidthMm,
    paperHeightMm,
    printableWidthMm,
    printableHeightMm,
    rows: ys.length,
    columns: xs.length,
    tiles,
  }
}

export function parseSvgViewBox(markup: string): PrintBounds {
  const match = markup.match(/viewBox=["']\s*([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s*["']/)
  if (!match) return { left: 0, top: 0, width: 640, height: 480 }
  const [, left, top, width, height] = match.map(Number)
  if (![left, top, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
    return { left: 0, top: 0, width: 640, height: 480 }
  }
  return { left, top, width, height }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] ?? character)
}

function svgInner(markup: string) {
  return markup.replace(/^\s*<svg\b[^>]*>/i, '').replace(/<\/svg>\s*$/i, '')
}

function numberAttribute(fragment: string, name: string) {
  const match = fragment.match(new RegExp(`\\b${name}=["']([-+\\d.eE]+)["']`, 'i'))
  const value = match ? Number(match[1]) : Number.NaN
  return Number.isFinite(value) ? value : null
}

export function parseLegendPrintBounds(markup: string): PrintBounds | null {
  const marker = markup.search(/<g\b[^>]*class=["'][^"']*\bcrochet-legend\b[^"']*["'][^>]*>/i)
  if (marker < 0) return null
  const fragment = markup.slice(marker)
  const rect = fragment.match(/<rect\b[^>]*>/i)?.[0]
  if (!rect) return null
  const left = numberAttribute(rect, 'x')
  const top = numberAttribute(rect, 'y')
  const width = numberAttribute(rect, 'width')
  const height = numberAttribute(rect, 'height')
  if (left === null || top === null || width === null || height === null || width <= 0 || height <= 0) return null

  // The SVG legend rectangle historically had a fixed width. Account for the
  // actual label text too so the print viewport never clips a long symbol name.
  let right = left + width
  for (const match of fragment.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/gi)) {
    const x = numberAttribute(match[1], 'x')
    if (x === null) continue
    const plainText = match[2].replace(/&[^;]+;/g, 'X')
    right = Math.max(right, x + plainText.length * 7.2 + 8)
  }
  return { left, top, width: Math.max(width, right - left), height }
}

function tileAt(layout: PrintLayout, row: number, column: number) {
  return layout.tiles.find((candidate) => candidate.row === row && candidate.column === column) ?? null
}

function horizontalOverlapMm(left: PrintTile, right: PrintTile, layout: PrintLayout) {
  const overlapDoc = Math.max(0, Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x))
  return (overlapDoc / left.width) * layout.printableWidthMm
}

function verticalOverlapMm(top: PrintTile, bottom: PrintTile, layout: PrintLayout) {
  const overlapDoc = Math.max(0, Math.min(top.y + top.height, bottom.y + bottom.height) - Math.max(top.y, bottom.y))
  return (overlapDoc / top.height) * layout.printableHeightMm
}

function registrationMarks(tile: PrintTile, layout: PrintLayout, settings: PrintSettings) {
  if (!settings.alignmentMarks || settings.overlapMm <= 0 || (layout.rows === 1 && layout.columns === 1)) return ''
  const marks: string[] = []
  const add = (style: string) => marks.push(`<i class="registration-cross" style="${style}"></i>`)

  const leftNeighbor = tile.column > 0 ? tileAt(layout, tile.row, tile.column - 1) : null
  if (leftNeighbor) {
    const offset = horizontalOverlapMm(leftNeighbor, tile, layout) / 2
    add(`left:${offset}mm;top:28%`)
    add(`left:${offset}mm;top:72%`)
  }

  const rightNeighbor = tile.column < layout.columns - 1 ? tileAt(layout, tile.row, tile.column + 1) : null
  if (rightNeighbor) {
    const offset = horizontalOverlapMm(tile, rightNeighbor, layout) / 2
    add(`right:${offset}mm;top:28%`)
    add(`right:${offset}mm;top:72%`)
  }

  const topNeighbor = tile.row > 0 ? tileAt(layout, tile.row - 1, tile.column) : null
  if (topNeighbor) {
    const offset = verticalOverlapMm(topNeighbor, tile, layout) / 2
    add(`top:${offset}mm;left:28%`)
    add(`top:${offset}mm;left:72%`)
  }

  const bottomNeighbor = tile.row < layout.rows - 1 ? tileAt(layout, tile.row + 1, tile.column) : null
  if (bottomNeighbor) {
    const offset = verticalOverlapMm(tile, bottomNeighbor, layout) / 2
    add(`bottom:${offset}mm;left:28%`)
    add(`bottom:${offset}mm;left:72%`)
  }

  return marks.length ? `<div class="registration-marks" aria-hidden="true">${marks.join('')}</div>` : ''
}

function tileContains(tile: PrintTile, point: { x: number; y: number }) {
  return point.x >= tile.x && point.x <= tile.x + tile.width && point.y >= tile.y && point.y <= tile.y + tile.height
}

export function buildTiledPrintHtml(
  svgMarkup: string,
  bounds: PrintBounds,
  rawSettings: PrintSettings,
  title: string,
  locale: 'ru' | 'en',
) {
  const settings = normalizedPrintSettings(rawSettings)
  const layout = layoutPrintTiles(bounds, settings)
  const inner = svgInner(svgMarkup)
  const frame = settings.pageFrames ? '<div class="page-frame" aria-hidden="true"></div>' : ''
  const legendBounds = parseLegendPrintBounds(svgMarkup)
  const legendCenter = legendBounds
    ? { x: legendBounds.left + legendBounds.width / 2, y: legendBounds.top + legendBounds.height / 2 }
    : null
  let legendHostIndex = -1
  if (legendCenter) {
    layout.tiles.forEach((tile, index) => {
      if (tileContains(tile, legendCenter)) legendHostIndex = index
    })
    if (legendHostIndex < 0) legendHostIndex = layout.tiles.length - 1
  }

  const docUnitsPerMm = PX_PER_MM / (settings.scalePercent / 100)
  const legendOverlaySize = legendBounds
    ? (() => {
        const naturalWidthMm = legendBounds.width / docUnitsPerMm
        const naturalHeightMm = legendBounds.height / docUnitsPerMm
        const fit = Math.min(
          1,
          Math.max(0.01, (layout.printableWidthMm - 4) / naturalWidthMm),
          Math.max(0.01, (layout.printableHeightMm - 4) / naturalHeightMm),
        )
        return { width: naturalWidthMm * fit, height: naturalHeightMm * fit }
      })()
    : null

  const pages = layout.tiles.map((tile, index) => {
    const legendOverlay = legendBounds && legendOverlaySize && index === legendHostIndex
      ? `<div class="print-legend-overlay" style="width:${legendOverlaySize.width}mm;height:${legendOverlaySize.height}mm"><svg xmlns="http://www.w3.org/2000/svg" viewBox="${legendBounds.left} ${legendBounds.top} ${legendBounds.width} ${legendBounds.height}" preserveAspectRatio="xMinYMin meet">${inner}</svg></div>`
      : ''
    return `
    <section class="print-page">
      <div class="printable">
        <svg class="chart-svg" xmlns="http://www.w3.org/2000/svg" viewBox="${tile.x} ${tile.y} ${tile.width} ${tile.height}" preserveAspectRatio="xMinYMin meet">${inner}</svg>
        ${legendOverlay}
        ${registrationMarks(tile, layout, settings)}
      </div>
      ${frame}
      <div class="page-label">${escapeHtml(title)} · ${index + 1}/${layout.tiles.length}</div>
    </section>`
  }).join('')
  const instruction = locale === 'ru'
    ? 'Для точного масштаба оставьте масштаб печати браузера 100%. Кресты в зоне перекрытия совпадают на соседних листах; совмещайте их при склейке.'
    : 'For exact sizing, keep the browser print scale at 100%. Registration crosses in the overlap represent the same points on adjacent sheets.'
  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  @page { size: ${layout.paperWidthMm}mm ${layout.paperHeightMm}mm; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #eee; font-family: system-ui, sans-serif; }
  .screen-note { padding: 10px 14px; font-size: 12px; color: #555; background: white; position: sticky; top: 0; z-index: 5; }
  .print-page { position: relative; width: ${layout.paperWidthMm}mm; height: ${layout.paperHeightMm}mm; margin: 8px auto; background: white; break-after: page; page-break-after: always; overflow: hidden; }
  .printable { position: absolute; left: ${settings.marginMm}mm; top: ${settings.marginMm}mm; width: ${layout.printableWidthMm}mm; height: ${layout.printableHeightMm}mm; overflow: hidden; }
  .printable > .chart-svg { display: block; width: 100%; height: 100%; }
  .chart-svg .crochet-legend { display: none; }
  .page-frame { position: absolute; left: ${settings.marginMm}mm; top: ${settings.marginMm}mm; width: ${layout.printableWidthMm}mm; height: ${layout.printableHeightMm}mm; border: .25mm solid #222; pointer-events: none; }
  .page-label { position: absolute; right: ${Math.max(2, settings.marginMm / 2)}mm; bottom: ${Math.max(2, settings.marginMm / 2)}mm; font-size: 8pt; color: #666; }
  .registration-marks { position: absolute; inset: 0; pointer-events: none; z-index: 4; }
  .registration-cross { position: absolute; width: 5mm; height: 5mm; transform: translate(-50%, -50%); }
  .registration-cross::before, .registration-cross::after { content: ""; position: absolute; left: 50%; top: 50%; background: #111; transform: translate(-50%, -50%); }
  .registration-cross::before { width: 5mm; height: .18mm; }
  .registration-cross::after { width: .18mm; height: 5mm; }
  .print-legend-overlay { position: absolute; top: 2mm; right: 2mm; z-index: 3; overflow: hidden; background: white; }
  .print-legend-overlay svg { display: block; width: 100%; height: 100%; }
  .print-legend-overlay svg > :not(.crochet-legend) { display: none; }
  @media print {
    html, body { background: white; }
    .screen-note { display: none; }
    .print-page { margin: 0; }
  }
</style>
</head>
<body>
<div class="screen-note">${escapeHtml(instruction)}</div>
${pages}
</body>
</html>`
}

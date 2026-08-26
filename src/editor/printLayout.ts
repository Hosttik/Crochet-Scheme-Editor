export type PrintPaper = 'a4' | 'letter'
export type PrintOrientation = 'portrait' | 'landscape'

export type PrintSettings = {
  paper: PrintPaper
  orientation: PrintOrientation
  scalePercent: number
  overlapMm: number
  marginMm: number
  cropMarks: boolean
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
  cropMarks: true,
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
    cropMarks: settings.cropMarks !== false,
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
  const crop = settings.cropMarks
    ? '<span class="crop tl h"></span><span class="crop tl v"></span><span class="crop tr h"></span><span class="crop tr v"></span><span class="crop bl h"></span><span class="crop bl v"></span><span class="crop br h"></span><span class="crop br v"></span>'
    : ''
  const pages = layout.tiles.map((tile, index) => `
    <section class="print-page">
      <div class="printable">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="${tile.x} ${tile.y} ${tile.width} ${tile.height}" preserveAspectRatio="xMinYMin meet">${inner}</svg>
      </div>
      ${crop}
      <div class="page-label">${escapeHtml(title)} · ${index + 1}/${layout.tiles.length}</div>
    </section>`).join('')
  const instruction = locale === 'ru'
    ? 'Для точного масштаба оставьте масштаб печати браузера 100%.'
    : 'For exact sizing, keep the browser print scale at 100%.'
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
  .printable svg { display: block; width: 100%; height: 100%; }
  .page-label { position: absolute; right: ${Math.max(2, settings.marginMm / 2)}mm; bottom: ${Math.max(2, settings.marginMm / 2)}mm; font-size: 8pt; color: #666; }
  .crop { position: absolute; background: #111; }
  .crop.h { width: 5mm; height: .2mm; }
  .crop.v { width: .2mm; height: 5mm; }
  .crop.tl.h { left: ${Math.max(0, settings.marginMm - 6)}mm; top: ${settings.marginMm}mm; }
  .crop.tl.v { left: ${settings.marginMm}mm; top: ${Math.max(0, settings.marginMm - 6)}mm; }
  .crop.tr.h { left: ${settings.marginMm + layout.printableWidthMm + 1}mm; top: ${settings.marginMm}mm; }
  .crop.tr.v { left: ${settings.marginMm + layout.printableWidthMm}mm; top: ${Math.max(0, settings.marginMm - 6)}mm; }
  .crop.bl.h { left: ${Math.max(0, settings.marginMm - 6)}mm; top: ${settings.marginMm + layout.printableHeightMm}mm; }
  .crop.bl.v { left: ${settings.marginMm}mm; top: ${settings.marginMm + layout.printableHeightMm + 1}mm; }
  .crop.br.h { left: ${settings.marginMm + layout.printableWidthMm + 1}mm; top: ${settings.marginMm + layout.printableHeightMm}mm; }
  .crop.br.v { left: ${settings.marginMm + layout.printableWidthMm}mm; top: ${settings.marginMm + layout.printableHeightMm + 1}mm; }
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

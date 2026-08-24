import type { AnchorName, Point } from './types'

export type SymbolDefinition = {
  id: string
  name: string
  category: string
  width: number
  height: number
  anchors: Record<AnchorName, Point>
}

const anchors = (height: number): Record<AnchorName, Point> => ({
  top: { x: 0, y: -height / 2 },
  center: { x: 0, y: 0 },
  bottom: { x: 0, y: height / 2 },
})

export const SYMBOLS: SymbolDefinition[] = [
  { id: 'chain', name: 'Chain', category: 'Base', width: 22, height: 30, anchors: anchors(30) },
  { id: 'slip', name: 'Slip stitch', category: 'Base', width: 18, height: 18, anchors: anchors(18) },
  { id: 'single', name: 'Single crochet', category: 'Short stitches', width: 24, height: 32, anchors: anchors(32) },
  { id: 'half-double', name: 'Half double crochet', category: 'Tall stitches', width: 28, height: 44, anchors: anchors(44) },
  { id: 'double', name: 'Double crochet', category: 'Tall stitches', width: 30, height: 58, anchors: anchors(58) },
  { id: 'treble', name: 'Treble crochet', category: 'Tall stitches', width: 32, height: 68, anchors: anchors(68) },
  { id: 'picot', name: 'Picot', category: 'Decorative', width: 28, height: 32, anchors: anchors(32) },
  { id: 'magic-ring', name: 'Magic ring', category: 'Base', width: 38, height: 38, anchors: anchors(38) },
]

export const SYMBOL_BY_ID = new Map(SYMBOLS.map((symbol) => [symbol.id, symbol]))

export function SymbolGlyph({ symbolId }: { symbolId: string }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    vectorEffect: 'non-scaling-stroke' as const,
  }

  switch (symbolId) {
    case 'chain':
      return <ellipse cx="0" cy="0" rx="8" ry="13" {...common} />
    case 'slip':
      return <circle cx="0" cy="0" r="5" {...common} />
    case 'single':
      return <path d="M -9 -9 L 9 9 M 9 -9 L -9 9" {...common} />
    case 'half-double':
      return <path d="M 0 20 L 0 -18 M -9 -6 L 9 3 M -7 -20 L 0 -14 L 7 -20" {...common} />
    case 'double':
      return <path d="M 0 27 L 0 -25 M -9 -4 L 9 5 M -7 -27 L 0 -21 L 7 -27" {...common} />
    case 'treble':
      return <path d="M 0 32 L 0 -30 M -9 -9 L 9 0 M -9 -2 L 9 7 M -7 -32 L 0 -26 L 7 -32" {...common} />
    case 'picot':
      return (
        <g {...common}>
          <circle cx="0" cy="-5" r="7" />
          <path d="M 0 2 L 0 15" />
        </g>
      )
    case 'magic-ring':
      return (
        <g {...common}>
          <circle cx="0" cy="0" r="14" />
          <path d="M -15 10 C -4 20 10 18 16 7" />
          <path d="M 12 4 L 17 7 L 13 12" />
        </g>
      )
    default:
      return <circle cx="0" cy="0" r="7" {...common} />
  }
}

export function symbolSvgMarkup(symbolId: string): string {
  const common = 'fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"'
  switch (symbolId) {
    case 'chain':
      return `<ellipse cx="0" cy="0" rx="8" ry="13" ${common}/>`
    case 'slip':
      return `<circle cx="0" cy="0" r="5" ${common}/>`
    case 'single':
      return `<path d="M -9 -9 L 9 9 M 9 -9 L -9 9" ${common}/>`
    case 'half-double':
      return `<path d="M 0 20 L 0 -18 M -9 -6 L 9 3 M -7 -20 L 0 -14 L 7 -20" ${common}/>`
    case 'double':
      return `<path d="M 0 27 L 0 -25 M -9 -4 L 9 5 M -7 -27 L 0 -21 L 7 -27" ${common}/>`
    case 'treble':
      return `<path d="M 0 32 L 0 -30 M -9 -9 L 9 0 M -9 -2 L 9 7 M -7 -32 L 0 -26 L 7 -32" ${common}/>`
    case 'picot':
      return `<circle cx="0" cy="-5" r="7" ${common}/><path d="M 0 2 L 0 15" ${common}/>`
    case 'magic-ring':
      return `<circle cx="0" cy="0" r="14" ${common}/><path d="M -15 10 C -4 20 10 18 16 7 M 12 4 L 17 7 L 13 12" ${common}/>`
    default:
      return `<circle cx="0" cy="0" r="7" ${common}/>`
  }
}

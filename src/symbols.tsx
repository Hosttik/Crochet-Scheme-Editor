import type { AnchorName, Point } from './types'

export type SymbolDefinition = {
  id: string
  name: string
  abbreviation?: string
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
  { id: 'chain', name: 'Chain', abbreviation: 'ch', category: 'Base', width: 22, height: 30, anchors: anchors(30) },
  { id: 'slip', name: 'Slip stitch', abbreviation: 'sl st', category: 'Base', width: 18, height: 18, anchors: anchors(18) },
  { id: 'single', name: 'Single crochet', abbreviation: 'sc', category: 'Short stitches', width: 24, height: 32, anchors: anchors(32) },
  { id: 'half-double', name: 'Half double crochet', abbreviation: 'hdc', category: 'Tall stitches', width: 28, height: 44, anchors: anchors(44) },
  { id: 'double', name: 'Double crochet', abbreviation: 'dc', category: 'Tall stitches', width: 30, height: 58, anchors: anchors(58) },
  { id: 'treble', name: 'Treble crochet', abbreviation: 'tr', category: 'Tall stitches', width: 32, height: 68, anchors: anchors(68) },
  { id: 'picot', name: 'Picot', abbreviation: 'p', category: 'Decorative', width: 28, height: 32, anchors: anchors(32) },
  { id: 'magic-ring', name: 'Magic ring', abbreviation: 'MR', category: 'Base', width: 38, height: 38, anchors: anchors(38) },
]

export const SYMBOL_BY_ID = new Map(SYMBOLS.map((symbol) => [symbol.id, symbol]))

const commonProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  vectorEffect: 'non-scaling-stroke' as const,
}

export function SymbolGlyph({ symbolId }: { symbolId: string }) {
  switch (symbolId) {
    case 'chain':
      return <ellipse cx="0" cy="0" rx="8" ry="13" {...commonProps} />
    case 'slip':
      return <circle cx="0" cy="0" r="5" {...commonProps} />
    case 'single':
      return <path d="M -9 0 L 9 0 M 0 -9 L 0 9" {...commonProps} />
    case 'half-double':
      return <path d="M 0 20 L 0 -18 M -9 -18 L 9 -18" {...commonProps} />
    case 'double':
      return <path d="M 0 27 L 0 -25 M -9 -25 L 9 -25 M -9 -4 L 9 5" {...commonProps} />
    case 'treble':
      return <path d="M 0 32 L 0 -30 M -9 -30 L 9 -30 M -9 -9 L 9 0 M -9 -2 L 9 7" {...commonProps} />
    case 'picot':
      return (
        <g {...commonProps}>
          <circle cx="0" cy="-5" r="7" />
          <path d="M 0 2 L 0 15" />
        </g>
      )
    case 'magic-ring':
      return <circle cx="0" cy="0" r="14" {...commonProps} />
    default:
      return <circle cx="0" cy="0" r="7" {...commonProps} />
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
      return `<path d="M -9 0 L 9 0 M 0 -9 L 0 9" ${common}/>`
    case 'half-double':
      return `<path d="M 0 20 L 0 -18 M -9 -18 L 9 -18" ${common}/>`
    case 'double':
      return `<path d="M 0 27 L 0 -25 M -9 -25 L 9 -25 M -9 -4 L 9 5" ${common}/>`
    case 'treble':
      return `<path d="M 0 32 L 0 -30 M -9 -30 L 9 -30 M -9 -9 L 9 0 M -9 -2 L 9 7" ${common}/>`
    case 'picot':
      return `<circle cx="0" cy="-5" r="7" ${common}/><path d="M 0 2 L 0 15" ${common}/>`
    case 'magic-ring':
      return `<circle cx="0" cy="0" r="14" ${common}/>`
    default:
      return `<circle cx="0" cy="0" r="7" ${common}/>`
  }
}

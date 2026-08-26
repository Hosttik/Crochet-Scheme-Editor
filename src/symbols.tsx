import type { AnchorName, Point } from './types'

export type SymbolRole = 'stitch' | 'marker'

export type SymbolDefinition = {
  id: string
  name: string
  abbreviation?: string
  category: string
  role?: SymbolRole
  width: number
  height: number
  anchors: Record<AnchorName, Point>
}

type GlyphPart =
  | { kind: 'path'; d: string; fill?: string; stroke?: string; strokeWidth?: number }
  | { kind: 'circle'; cx: number; cy: number; r: number; fill?: string; stroke?: string; strokeWidth?: number }
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number; fill?: string; stroke?: string; strokeWidth?: number }

const anchors = (height: number): Record<AnchorName, Point> => ({
  top: { x: 0, y: -height / 2 },
  center: { x: 0, y: 0 },
  bottom: { x: 0, y: height / 2 },
})

const symbol = (
  id: string,
  name: string,
  abbreviation: string | undefined,
  category: string,
  width: number,
  height: number,
  role: SymbolRole = 'stitch',
): SymbolDefinition => ({ id, name, abbreviation, category, width, height, role, anchors: anchors(height) })

export const SYMBOLS: SymbolDefinition[] = [
  symbol('start-marker', 'Start', undefined, 'Markers', 28, 18, 'marker'),
  symbol('end-marker', 'End', undefined, 'Markers', 28, 18, 'marker'),

  symbol('chain', 'Chain', 'ch', 'Base', 24, 16),
  symbol('slip', 'Slip stitch', 'sl st / ss', 'Base', 16, 16),
  symbol('magic-ring', 'Magic ring', 'MR', 'Base', 38, 38),
  symbol('solomons-knot', "Solomon's knot", 'SK', 'Base', 34, 48),

  symbol('single', 'Single crochet', 'sc', 'Short stitches', 24, 32),
  symbol('single-blo', 'Single crochet in back loop only', 'sc BLO', 'Short stitches', 24, 36),
  symbol('extended-single', 'Extended single crochet', 'esc', 'Short stitches', 28, 44),

  symbol('half-double', 'Half double crochet', 'hdc', 'Tall stitches', 28, 44),
  symbol('half-double-blo', 'Half double crochet in back loop only', 'hdc BLO', 'Tall stitches', 28, 48),
  symbol('double', 'Double crochet', 'dc', 'Tall stitches', 30, 58),
  symbol('double-blo', 'Double crochet in back loop only', 'dc BLO', 'Tall stitches', 30, 62),
  symbol('treble', 'Treble crochet', 'tr', 'Tall stitches', 32, 68),
  symbol('double-treble', 'Double treble crochet', 'dtr', 'Tall stitches', 34, 72),
  symbol('triple-treble', 'Triple treble crochet', 'trtr / ddtr', 'Tall stitches', 36, 76),

  symbol('single-2-together', 'Single crochet 2 together', 'sc2tog', 'Decreases', 36, 46),
  symbol('single-3-together', 'Single crochet 3 together', 'sc3tog', 'Decreases', 44, 46),
  symbol('single-4-together', 'Single crochet 4 together', 'sc4tog', 'Decreases', 52, 46),
  symbol('half-double-2-together', 'Half double crochet 2 together', 'hdc2tog', 'Decreases', 38, 50),
  symbol('double-2-together', 'Double crochet 2 together', 'dc2tog', 'Decreases', 40, 60),
  symbol('double-3-together', 'Double crochet 3 together', 'dc3tog', 'Decreases', 48, 60),
  symbol('double-4-together', 'Double crochet 4 together', 'dc4tog', 'Decreases', 56, 60),
  symbol('double-5-together', 'Double crochet 5 together', 'dc5tog', 'Decreases', 64, 60),

  symbol('single-2-in-1', '2 single crochet in 1 stitch', '2 sc in 1', 'Increases & shells', 36, 46),
  symbol('single-3-in-1', '3 single crochet in 1 stitch', '3 sc in 1', 'Increases & shells', 44, 46),
  symbol('half-double-2-in-1', '2 half double crochet in 1 stitch', '2 hdc in 1', 'Increases & shells', 38, 50),
  symbol('half-double-3-in-1', '3 half double crochet in 1 stitch', '3 hdc in 1', 'Increases & shells', 48, 50),
  symbol('double-2-in-1', '2 double crochet in 1 stitch', '2 dc in 1', 'Increases & shells', 40, 60),
  symbol('double-3-in-1', '3 double crochet in 1 stitch', '3 dc in 1', 'Increases & shells', 48, 60),
  symbol('double-4-in-1', '4 double crochet in 1 stitch', '4 dc in 1', 'Increases & shells', 56, 60),
  symbol('double-5-shell', '5 double crochet shell', '5-dc shell', 'Increases & shells', 68, 60),

  symbol('front-post-single', 'Front post single crochet', 'FPsc', 'Post stitches', 30, 42),
  symbol('front-post-half-double', 'Front post half double crochet', 'FPhdc', 'Post stitches', 30, 50),
  symbol('front-post-double', 'Front post double crochet', 'FPdc', 'Post stitches', 32, 60),
  symbol('front-post-treble', 'Front post treble crochet', 'FPtr', 'Post stitches', 34, 70),
  symbol('back-post-single', 'Back post single crochet', 'BPsc', 'Post stitches', 30, 42),
  symbol('back-post-half-double', 'Back post half double crochet', 'BPhdc', 'Post stitches', 30, 50),
  symbol('back-post-double', 'Back post double crochet', 'BPdc', 'Post stitches', 32, 60),
  symbol('back-post-treble', 'Back post treble crochet', 'BPtr', 'Post stitches', 34, 70),
  symbol('front-post-double-2-together', 'Front post double crochet 2 together', 'FPdc2tog', 'Post stitches', 48, 62),
  symbol('front-post-treble-2-together', 'Front post treble crochet 2 together', 'FPtr2tog', 'Post stitches', 50, 72),

  symbol('puff-3-half-double', 'Puff stitch of 3 half double crochet', 'puff 3 hdc', 'Decorative', 38, 54),
  symbol('picot', 'Picot', 'p', 'Decorative', 28, 32),
]

export const STITCH_SYMBOLS = SYMBOLS.filter((item) => item.role !== 'marker')
export const SYMBOL_BY_ID = new Map(SYMBOLS.map((item) => [item.id, item]))

const path = (d: string, options: Partial<Extract<GlyphPart, { kind: 'path' }>> = {}): GlyphPart => ({ kind: 'path', d, ...options })
const circle = (cx: number, cy: number, r: number, options: Partial<Extract<GlyphPart, { kind: 'circle' }>> = {}): GlyphPart => ({ kind: 'circle', cx, cy, r, ...options })
const ellipse = (cx: number, cy: number, rx: number, ry: number, options: Partial<Extract<GlyphPart, { kind: 'ellipse' }>> = {}): GlyphPart => ({ kind: 'ellipse', cx, cy, rx, ry, ...options })

function tallGlyph(height: number, yarnOvers: number, blo = false): GlyphPart[] {
  const top = -height / 2 + 4
  const bottom = height / 2 - 4
  const parts: GlyphPart[] = [
    path(`M 0 ${bottom} L 0 ${top}`),
    path(`M -9 ${top} L 9 ${top}`),
  ]
  for (let index = 0; index < yarnOvers; index += 1) {
    const y = -8 + index * 8
    parts.push(path(`M -8 ${y - 3} L 8 ${y + 4}`))
  }
  if (blo) parts.push(path(`M -7 ${bottom - 1} L 7 ${bottom - 1}`))
  return parts
}

function multiStemGlyph(count: number, mode: 'decrease' | 'increase', family: 'single' | 'half-double' | 'double'): GlyphPart[] {
  const topY = -22
  const bottomY = 22
  const spread = Math.max(18, (count - 1) * 9)
  const startX = -spread / 2
  const step = count === 1 ? 0 : spread / (count - 1)
  const parts: GlyphPart[] = []

  for (let index = 0; index < count; index += 1) {
    const outsideX = startX + step * index
    const x1 = mode === 'decrease' ? outsideX : 0
    const y1 = bottomY
    const x2 = mode === 'decrease' ? 0 : outsideX
    const y2 = topY
    parts.push(path(`M ${x1} ${y1} L ${x2} ${y2}`))

    const mx = x1 + (x2 - x1) * 0.55
    const my = y1 + (y2 - y1) * 0.55
    if (family === 'single') {
      parts.push(path(`M ${mx - 4} ${my - 4} L ${mx + 4} ${my + 4}`))
    } else if (family === 'double') {
      parts.push(path(`M ${mx - 5} ${my - 3} L ${mx + 5} ${my + 3}`))
    }

    if (mode === 'increase' && family !== 'single') {
      parts.push(path(`M ${outsideX - 6} ${topY} L ${outsideX + 6} ${topY}`))
    }
  }

  if (mode === 'decrease' && family !== 'single') parts.push(path(`M -7 ${topY} L 7 ${topY}`))
  return parts
}

function postSingleGlyph(side: 'front' | 'back'): GlyphPart[] {
  const direction = side === 'front' ? -1 : 1
  return [
    path(`M 0 -17 L 0 7 C 0 15 ${direction * 11} 16 ${direction * 11} 8 C ${direction * 11} 3 ${direction * 5} 2 ${direction * 3} 6`),
    path('M -7 -8 L 7 -8'),
  ]
}

function postGlyph(height: number, yarnOvers: number, side: 'front' | 'back'): GlyphPart[] {
  const top = -height / 2 + 4
  const direction = side === 'front' ? -1 : 1
  const parts: GlyphPart[] = [
    path(`M 0 ${top} L 0 8 C 0 17 ${direction * 11} 18 ${direction * 11} 9 C ${direction * 11} 4 ${direction * 5} 3 ${direction * 3} 7`),
    path(`M -8 ${top} L 8 ${top}`),
  ]
  for (let index = 0; index < yarnOvers; index += 1) {
    const y = -8 + index * 8
    parts.push(path(`M -7 ${y - 3} L 7 ${y + 3}`))
  }
  return parts
}

function postDecreaseGlyph(yarnOvers: number): GlyphPart[] {
  const topY = -27
  const bottomY = 23
  const parts: GlyphPart[] = [
    path(`M -12 ${bottomY - 5} C -18 ${bottomY - 2} -18 ${bottomY - 13} -11 ${bottomY - 15} L 0 ${topY}`),
    path(`M 12 ${bottomY - 5} C 18 ${bottomY - 2} 18 ${bottomY - 13} 11 ${bottomY - 15} L 0 ${topY}`),
    path(`M -7 ${topY} L 7 ${topY}`),
  ]
  for (const side of [-1, 1]) {
    for (let index = 0; index < yarnOvers; index += 1) {
      const y = -3 + index * 8
      const x = side * 6
      parts.push(path(`M ${x - 5} ${y - 3} L ${x + 5} ${y + 3}`))
    }
  }
  return parts
}

const GLYPHS: Record<string, GlyphPart[]> = {
  'start-marker': [path('M -12 -7 L 12 0 L -12 7 Z', { fill: 'currentColor', stroke: 'none' })],
  'end-marker': [path('M -12 -7 L 12 0 L -12 7 Z')],
  chain: [ellipse(0, 0, 10, 4)],
  slip: [circle(0, 0, 5, { fill: 'currentColor', stroke: 'none' })],
  'magic-ring': [circle(0, 0, 14)],
  'solomons-knot': [
    path('M -14 -18 C -6 -12 8 4 14 18 C 5 14 -7 2 -14 -18'),
    path('M -18 -22 L -11 -15'),
  ],
  single: [path('M -9 0 L 9 0 M 0 -9 L 0 9')],
  'single-blo': [path('M -9 -2 L 9 -2 M 0 -11 L 0 11 M -6 8 L 6 8')],
  'extended-single': [
    path('M 0 16 C -9 10 -9 -3 0 -9 C 9 -3 9 10 0 16'),
    path('M 0 -9 L 0 -18 M -7 -18 L 7 -18 M -6 -13 L 6 -13'),
  ],
  'half-double': tallGlyph(44, 0),
  'half-double-blo': tallGlyph(48, 0, true),
  double: tallGlyph(58, 1),
  'double-blo': tallGlyph(62, 1, true),
  treble: tallGlyph(68, 2),
  'double-treble': tallGlyph(72, 3),
  'triple-treble': tallGlyph(76, 4),

  'single-2-together': multiStemGlyph(2, 'decrease', 'single'),
  'single-3-together': multiStemGlyph(3, 'decrease', 'single'),
  'single-4-together': multiStemGlyph(4, 'decrease', 'single'),
  'half-double-2-together': multiStemGlyph(2, 'decrease', 'half-double'),
  'double-2-together': multiStemGlyph(2, 'decrease', 'double'),
  'double-3-together': multiStemGlyph(3, 'decrease', 'double'),
  'double-4-together': multiStemGlyph(4, 'decrease', 'double'),
  'double-5-together': multiStemGlyph(5, 'decrease', 'double'),

  'single-2-in-1': multiStemGlyph(2, 'increase', 'single'),
  'single-3-in-1': multiStemGlyph(3, 'increase', 'single'),
  'half-double-2-in-1': multiStemGlyph(2, 'increase', 'half-double'),
  'half-double-3-in-1': multiStemGlyph(3, 'increase', 'half-double'),
  'double-2-in-1': multiStemGlyph(2, 'increase', 'double'),
  'double-3-in-1': multiStemGlyph(3, 'increase', 'double'),
  'double-4-in-1': multiStemGlyph(4, 'increase', 'double'),
  'double-5-shell': multiStemGlyph(5, 'increase', 'double'),

  'front-post-single': postSingleGlyph('front'),
  'front-post-half-double': postGlyph(50, 0, 'front'),
  'front-post-double': postGlyph(60, 1, 'front'),
  'front-post-treble': postGlyph(70, 2, 'front'),
  'back-post-single': postSingleGlyph('back'),
  'back-post-half-double': postGlyph(50, 0, 'back'),
  'back-post-double': postGlyph(60, 1, 'back'),
  'back-post-treble': postGlyph(70, 2, 'back'),
  'front-post-double-2-together': postDecreaseGlyph(1),
  'front-post-treble-2-together': postDecreaseGlyph(2),

  'puff-3-half-double': [
    path('M 0 -23 C -14 -14 -14 14 0 23 C 14 14 14 -14 0 -23 Z'),
    path('M 0 -21 L 0 21'),
    path('M 0 -20 C -7 -10 -7 10 0 20'),
    path('M 0 -20 C 7 -10 7 10 0 20'),
  ],
  picot: [circle(0, -5, 7), path('M 0 2 L 0 15')],
}

const commonProps = {
  strokeWidth: 2.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  vectorEffect: 'non-scaling-stroke' as const,
}

function renderPart(part: GlyphPart, key: number) {
  const fill = part.fill ?? 'none'
  const stroke = part.stroke ?? 'currentColor'
  const strokeWidth = part.strokeWidth ?? commonProps.strokeWidth
  if (part.kind === 'path') {
    return <path key={key} d={part.d} fill={fill} stroke={stroke} {...commonProps} strokeWidth={strokeWidth} />
  }
  if (part.kind === 'circle') {
    return <circle key={key} cx={part.cx} cy={part.cy} r={part.r} fill={fill} stroke={stroke} {...commonProps} strokeWidth={strokeWidth} />
  }
  return <ellipse key={key} cx={part.cx} cy={part.cy} rx={part.rx} ry={part.ry} fill={fill} stroke={stroke} {...commonProps} strokeWidth={strokeWidth} />
}

export function hasSymbolGlyph(symbolId: string) {
  return Boolean(GLYPHS[symbolId])
}

export function SymbolGlyph({ symbolId }: { symbolId: string }) {
  const parts = GLYPHS[symbolId] ?? [circle(0, 0, 7)]
  return <>{parts.map(renderPart)}</>
}

function partMarkup(part: GlyphPart): string {
  const fill = part.fill ?? 'none'
  const stroke = part.stroke ?? 'currentColor'
  const strokeWidth = part.strokeWidth ?? 2.4
  const common = `fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"`
  if (part.kind === 'path') return `<path d="${part.d}" ${common}/>`
  if (part.kind === 'circle') return `<circle cx="${part.cx}" cy="${part.cy}" r="${part.r}" ${common}/>`
  return `<ellipse cx="${part.cx}" cy="${part.cy}" rx="${part.rx}" ry="${part.ry}" ${common}/>`
}

export function symbolSvgMarkup(symbolId: string): string {
  const parts = GLYPHS[symbolId] ?? [circle(0, 0, 7)]
  return parts.map(partMarkup).join('')
}

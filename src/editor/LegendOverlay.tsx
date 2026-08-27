import type { StitchElement, Viewport } from '../types'
import { symbolName } from '../i18n'
import { SymbolGlyph } from '../symbols'
import { usedLegendItems } from './legend'

type Props = {
  elements: StitchElement[]
  locale: 'ru' | 'en'
  viewport: Viewport
}

export function LegendOverlay({ elements, locale, viewport }: Props) {
  const visible = elements.filter((element) => element.visible !== false)
  const items = usedLegendItems(visible)
  if (!visible.length || !items.length) return null

  const rows = items.map((symbol) => {
    const label = symbolName(symbol.id, symbol.name, locale)
    const abbreviation = symbol.abbreviation ? `${symbol.abbreviation} · ` : ''
    return { symbol, text: `${abbreviation}${label}` }
  })
  const longestLabel = rows.reduce((longest, row) => Math.max(longest, row.text.length), 0)
  const width = Math.max(260, 72 + longestLabel * 6.7)
  const rowHeight = 36
  const height = 44 + rows.length * rowHeight
  const x = (14 - viewport.panX) / viewport.zoom
  const y = (54 - viewport.panY) / viewport.zoom

  return (
    <g
      className="legend-overlay legend-screen-overlay"
      transform={`translate(${x} ${y}) scale(${1 / viewport.zoom})`}
      pointerEvents="none"
    >
      <rect className="legend-background" width={width} height={height} rx={8} vectorEffect="non-scaling-stroke" />
      <text className="legend-title" x={12} y={23} fontSize={13}>
        {locale === 'ru' ? 'Условные обозначения' : 'Legend'}
      </text>
      {rows.map(({ symbol, text }, index) => {
        const rowY = 42 + index * rowHeight
        return (
          <g key={symbol.id} transform={`translate(20 ${rowY + 10})`}>
            <g className="symbol-glyph legend-glyph" transform="scale(0.55)"><SymbolGlyph symbolId={symbol.id} /></g>
            <text className="legend-label" x={28} y={4} fontSize={12}>{text}</text>
          </g>
        )
      })}
    </g>
  )
}

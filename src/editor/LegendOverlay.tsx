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

  const width = 230
  const rowHeight = 30
  const height = 34 + items.length * rowHeight
  const x = (14 - viewport.panX) / viewport.zoom
  const y = (54 - viewport.panY) / viewport.zoom

  return (
    <g
      className="legend-overlay legend-screen-overlay"
      transform={`translate(${x} ${y}) scale(${1 / viewport.zoom})`}
      pointerEvents="none"
    >
      <rect className="legend-background" width={width} height={height} rx={8} vectorEffect="non-scaling-stroke" />
      <text className="legend-title" x={12} y={22} fontSize={13}>
        {locale === 'ru' ? 'Условные обозначения' : 'Legend'}
      </text>
      {items.map((symbol, index) => {
        const rowY = 38 + index * rowHeight
        const label = symbolName(symbol.id, symbol.name, locale)
        const abbreviation = symbol.abbreviation ? `${symbol.abbreviation} · ` : ''
        return (
          <g key={symbol.id} transform={`translate(20 ${rowY + 9})`}>
            <g className="symbol-glyph legend-glyph" transform="scale(0.55)"><SymbolGlyph symbolId={symbol.id} /></g>
            <text className="legend-label" x={24} y={4} fontSize={12}>{abbreviation}{label}</text>
          </g>
        )
      })}
    </g>
  )
}

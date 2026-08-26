import type { StitchElement } from '../types'
import { symbolName } from '../i18n'
import { SymbolGlyph } from '../symbols'
import { usedLegendItems } from './legend'

type Props = {
  elements: StitchElement[]
  locale: 'ru' | 'en'
  zoom: number
}

export function LegendOverlay({ elements, locale, zoom }: Props) {
  const visible = elements.filter((element) => element.visible !== false)
  const items = usedLegendItems(visible)
  if (!visible.length || !items.length) return null

  const right = Math.max(...visible.map((element) => element.x))
  const top = Math.min(...visible.map((element) => element.y))
  const x = right + 64
  const y = top - 28
  const width = 230
  const rowHeight = 30
  const height = 34 + items.length * rowHeight
  const textScale = 1 / zoom

  return (
    <g className="legend-overlay" transform={`translate(${x} ${y})`} pointerEvents="none">
      <rect className="legend-background" width={width} height={height} rx={8} vectorEffect="non-scaling-stroke" />
      <text className="legend-title" x={12} y={22} fontSize={13 * textScale}>
        {locale === 'ru' ? 'Условные обозначения' : 'Legend'}
      </text>
      {items.map((symbol, index) => {
        const rowY = 38 + index * rowHeight
        const label = symbolName(symbol.id, symbol.name, locale)
        const abbreviation = symbol.abbreviation ? `${symbol.abbreviation} · ` : ''
        return (
          <g key={symbol.id} transform={`translate(20 ${rowY + 9})`}>
            <g className="symbol-glyph legend-glyph" transform="scale(0.55)"><SymbolGlyph symbolId={symbol.id} /></g>
            <text className="legend-label" x={24} y={4} fontSize={12 * textScale}>{abbreviation}{label}</text>
          </g>
        )
      })}
    </g>
  )
}

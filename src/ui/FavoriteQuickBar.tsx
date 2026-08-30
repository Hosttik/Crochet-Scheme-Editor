import { chainBundleLayout, type ChainBundleCount } from '../editor/chainBundle'
import { symbolName, type Locale } from '../i18n'
import { SYMBOL_BY_ID, SymbolGlyph } from '../symbols'
import { EditorIcon } from './icons'
import { resolveFavorites, type FavoriteElementKey } from './favorites'
import type { WorkbenchTool } from './workbenchTypes'
import './favorites.css'

const MAX_QUICK_FAVORITES = 6

export function FavoriteQuickBar({
  locale,
  tool,
  favorites,
  onSelectSymbol,
  onSelectChainBundle,
  onCancelPlacement,
}: {
  locale: Locale
  tool: WorkbenchTool
  favorites: readonly FavoriteElementKey[]
  onSelectSymbol: (symbolId: string) => void
  onSelectChainBundle: (count: ChainBundleCount) => void
  onCancelPlacement: () => void
}) {
  const resolved = resolveFavorites(favorites)
  if (!resolved.length) return null

  const visible = resolved.slice(0, MAX_QUICK_FAVORITES)
  const overflow = Math.max(0, resolved.length - visible.length)
  const groupLabel = locale === 'ru' ? 'Избранные элементы' : 'Favorite stitches'

  return (
    <div className="favorite-quick-bar" role="group" aria-label={groupLabel} data-testid="favorite-quick-bar">
      <span className="favorite-quick-bar__label" title={groupLabel} aria-hidden="true">
        <EditorIcon name="star" size={15} />
      </span>
      {visible.map((item) => {
        if (item.kind === 'chain') {
          const label = locale === 'ru' ? `${item.count} воздушные петли` : `${item.count} chains`
          const abbreviation = locale === 'ru' ? `${item.count} ВП` : `${item.count} ch`
          const title = `${label} · ${abbreviation}`
          const active = tool.type === 'place-chain-bundle' && tool.count === item.count
          return (
            <button
              type="button"
              className={`favorite-quick-button ${active ? 'active' : ''}`}
              key={item.key}
              title={title}
              aria-label={title}
              aria-pressed={active}
              onClick={() => active ? onCancelPlacement() : onSelectChainBundle(item.count)}
            >
              <svg viewBox="-48 -20 96 40" aria-hidden="true">
                {chainBundleLayout({ x: 0, y: 0 }, item.count).map((member, index) => (
                  <g key={index} transform={`translate(${member.x} ${member.y})`} className="symbol-glyph">
                    <SymbolGlyph symbolId="chain" />
                  </g>
                ))}
              </svg>
            </button>
          )
        }

        const symbol = SYMBOL_BY_ID.get(item.symbolId)
        if (!symbol) return null
        const label = symbolName(symbol.id, symbol.name, locale)
        const title = symbol.abbreviation ? `${label} · ${symbol.abbreviation}` : label
        const active = tool.type === 'place' && tool.symbolId === symbol.id
        return (
          <button
            type="button"
            className={`favorite-quick-button ${active ? 'active' : ''}`}
            key={item.key}
            title={title}
            aria-label={title}
            aria-pressed={active}
            onClick={() => active ? onCancelPlacement() : onSelectSymbol(symbol.id)}
          >
            <svg viewBox="-24 -38 48 76" aria-hidden="true">
              <g className="symbol-glyph"><SymbolGlyph symbolId={symbol.id} /></g>
            </svg>
          </button>
        )
      })}
      {overflow > 0 && (
        <span
          className="favorite-quick-overflow"
          title={locale === 'ru' ? `Ещё ${overflow} в библиотеке` : `${overflow} more in the library`}
        >
          +{overflow}
        </span>
      )}
    </div>
  )
}

import { useMemo } from 'react'
import { CHAIN_BUNDLE_COUNTS, chainBundleLayout, type ChainBundleCount } from '../editor/chainBundle'
import { categoryName, symbolName, type Locale } from '../i18n'
import { SYMBOLS, SYMBOL_BY_ID, SymbolGlyph } from '../symbols'
import { EditorIcon } from './icons'
import {
  chainFavoriteKey,
  symbolFavoriteKey,
  type FavoriteElementKey,
} from './favorites'
import type { WorkbenchTool } from './workbenchTypes'
import './favorites.css'

type ResolvedFavorite =
  | { key: FavoriteElementKey; kind: 'symbol'; symbolId: string }
  | { key: FavoriteElementKey; kind: 'chain'; count: ChainBundleCount }

function resolveFavorite(key: FavoriteElementKey): ResolvedFavorite | null {
  if (key.startsWith('symbol:')) {
    const symbolId = key.slice('symbol:'.length)
    return SYMBOL_BY_ID.has(symbolId) ? { key, kind: 'symbol', symbolId } : null
  }
  const count = Number(key.slice('chain:'.length)) as ChainBundleCount
  return CHAIN_BUNDLE_COUNTS.includes(count) ? { key, kind: 'chain', count } : null
}

function FavoriteToggle({
  locale,
  active,
  label,
  onToggle,
}: {
  locale: Locale
  active: boolean
  label: string
  onToggle: () => void
}) {
  const action = active
    ? (locale === 'ru' ? 'Удалить из избранного' : 'Remove from favorites')
    : (locale === 'ru' ? 'Добавить в избранное' : 'Add to favorites')
  return (
    <button
      type="button"
      className={`favorite-toggle ${active ? 'is-favorite' : ''}`}
      aria-label={`${action}: ${label}`}
      aria-pressed={active}
      title={`${action}: ${label}`}
      onClick={onToggle}
    >
      <EditorIcon name="star" size={12} />
    </button>
  )
}

export function ElementLibrary({
  locale,
  tool,
  query,
  favorites,
  onQueryChange,
  onToggleFavorite,
  onSelectSymbol,
  onSelectChainBundle,
  onCancelPlacement,
}: {
  locale: Locale
  tool: WorkbenchTool
  query: string
  favorites: readonly FavoriteElementKey[]
  onQueryChange: (query: string) => void
  onToggleFavorite: (key: FavoriteElementKey) => void
  onSelectSymbol: (symbolId: string) => void
  onSelectChainBundle: (count: ChainBundleCount) => void
  onCancelPlacement: () => void
}) {
  const groupedSymbols = useMemo(() => {
    const groups = new Map<string, typeof SYMBOLS>()
    for (const symbol of SYMBOLS) {
      groups.set(symbol.category, [...(groups.get(symbol.category) ?? []), symbol])
    }
    return [...groups.entries()]
  }, [])

  const localeTag = locale === 'ru' ? 'ru-RU' : 'en-US'
  const normalizedQuery = query.trim().toLocaleLowerCase(localeTag)
  const favoriteSet = useMemo(() => new Set(favorites), [favorites])
  const resolvedFavorites = useMemo(
    () => favorites.map(resolveFavorite).filter((item): item is ResolvedFavorite => item !== null),
    [favorites],
  )

  const filteredChainBundleCounts = useMemo(() => CHAIN_BUNDLE_COUNTS.filter((count) => {
    if (!normalizedQuery) return true
    const label = locale === 'ru' ? `${count} воздушные петли ${count} вп` : `${count} chains ${count} ch`
    return label.toLocaleLowerCase(localeTag).includes(normalizedQuery)
  }), [locale, localeTag, normalizedQuery])

  const filteredGroupedSymbols = useMemo(() => groupedSymbols
    .map(([category, symbols]) => [category, symbols.filter((symbol) => {
      if (!normalizedQuery) return true
      const label = symbolName(symbol.id, symbol.name, locale)
      const haystack = `${label} ${symbol.abbreviation ?? ''} ${symbol.id} ${categoryName(category, locale)}`
        .toLocaleLowerCase(localeTag)
      return haystack.includes(normalizedQuery)
    })] as const)
    .filter(([, symbols]) => symbols.length > 0), [groupedSymbols, locale, localeTag, normalizedQuery])

  const renderFavoriteItem = (item: ResolvedFavorite) => {
    if (item.kind === 'chain') {
      const label = locale === 'ru' ? `${item.count} воздушные петли` : `${item.count} chains`
      const abbreviation = locale === 'ru' ? `${item.count} ВП` : `${item.count} ch`
      const title = `${label} · ${abbreviation}`
      const active = tool.type === 'place-chain-bundle' && tool.count === item.count
      return (
        <div className="favorite-card" key={item.key}>
          <button
            type="button"
            className={`favorite-item-button ${active ? 'active' : ''}`}
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
            <span>{abbreviation}</span>
          </button>
          <FavoriteToggle
            locale={locale}
            active
            label={label}
            onToggle={() => onToggleFavorite(item.key)}
          />
        </div>
      )
    }

    const symbol = SYMBOL_BY_ID.get(item.symbolId)
    if (!symbol) return null
    const label = symbolName(symbol.id, symbol.name, locale)
    const title = symbol.abbreviation ? `${label} · ${symbol.abbreviation}` : label
    const active = tool.type === 'place' && tool.symbolId === symbol.id
    return (
      <div className="favorite-card" key={item.key}>
        <button
          type="button"
          className={`favorite-item-button ${active ? 'active' : ''}`}
          title={title}
          aria-label={title}
          aria-pressed={active}
          onClick={() => active ? onCancelPlacement() : onSelectSymbol(symbol.id)}
        >
          <svg viewBox="-24 -38 48 76" aria-hidden="true">
            <g className="symbol-glyph"><SymbolGlyph symbolId={symbol.id} /></g>
          </svg>
          <span>{symbol.abbreviation ?? label}</span>
        </button>
        <FavoriteToggle
          locale={locale}
          active
          label={label}
          onToggle={() => onToggleFavorite(item.key)}
        />
      </div>
    )
  }

  return (
    <section className="panel-section symbols-section element-library" aria-label={locale === 'ru' ? 'Библиотека элементов' : 'Element library'}>
      <div className="section-title-row">
        <h2>{locale === 'ru' ? 'Элементы' : 'Stitches'}</h2>
        <span className="muted-text">{SYMBOLS.length + CHAIN_BUNDLE_COUNTS.length}</span>
      </div>
      <input
        className="symbol-search"
        data-testid="symbol-search"
        type="search"
        value={query}
        placeholder={locale === 'ru' ? 'Поиск: ВП, столбик…' : 'Search: ch, double…'}
        aria-label={locale === 'ru' ? 'Поиск элементов' : 'Search stitches'}
        onChange={(event) => onQueryChange(event.target.value)}
      />

      {!normalizedQuery && resolvedFavorites.length > 0 && (
        <div className="symbol-group favorites-group" data-testid="favorites-section">
          <h3><EditorIcon name="star" size={12} />{locale === 'ru' ? 'Избранное' : 'Favorites'}</h3>
          <div className="symbol-grid favorite-grid">
            {resolvedFavorites.map(renderFavoriteItem)}
          </div>
        </div>
      )}

      {filteredChainBundleCounts.length > 0 && (
        <div className="symbol-group chain-bundle-presets">
          <h3>{locale === 'ru' ? 'Цепочки' : 'Chain presets'}</h3>
          <div className="symbol-grid">
            {filteredChainBundleCounts.map((count) => {
              const active = tool.type === 'place-chain-bundle' && tool.count === count
              const label = locale === 'ru' ? `${count} воздушные петли` : `${count} chains`
              const abbreviation = locale === 'ru' ? `${count} ВП` : `${count} ch`
              const title = `${label} · ${abbreviation}`
              const favoriteKey = chainFavoriteKey(count)
              return (
                <div className="library-symbol-card" key={`chain-bundle-${count}`}>
                  <button
                    className={`symbol-button chain-bundle-button ${active ? 'active' : ''}`}
                    title={title}
                    aria-label={title}
                    aria-pressed={active}
                    onClick={() => active ? onCancelPlacement() : onSelectChainBundle(count)}
                  >
                    <svg viewBox="-48 -20 96 40" aria-hidden="true">
                      {chainBundleLayout({ x: 0, y: 0 }, count).map((member, index) => (
                        <g key={index} transform={`translate(${member.x} ${member.y})`} className="symbol-glyph">
                          <SymbolGlyph symbolId="chain" />
                        </g>
                      ))}
                    </svg>
                    <span>{abbreviation}</span>
                  </button>
                  <FavoriteToggle
                    locale={locale}
                    active={favoriteSet.has(favoriteKey)}
                    label={label}
                    onToggle={() => onToggleFavorite(favoriteKey)}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {filteredGroupedSymbols.map(([category, symbols]) => (
        <div className="symbol-group" key={category}>
          <h3>{categoryName(category, locale)}</h3>
          <div className="symbol-grid">
            {symbols.map((symbol) => {
              const active = tool.type === 'place' && tool.symbolId === symbol.id
              const label = symbolName(symbol.id, symbol.name, locale)
              const title = symbol.abbreviation ? `${label} · ${symbol.abbreviation}` : label
              const favoriteKey = symbolFavoriteKey(symbol.id)
              return (
                <div className="library-symbol-card" key={symbol.id}>
                  <button
                    className={`symbol-button ${active ? 'active' : ''}`}
                    title={title}
                    aria-label={title}
                    aria-pressed={active}
                    onClick={() => active ? onCancelPlacement() : onSelectSymbol(symbol.id)}
                  >
                    <svg viewBox="-24 -38 48 76" aria-hidden="true">
                      <g className="symbol-glyph"><SymbolGlyph symbolId={symbol.id} /></g>
                    </svg>
                    <span>{symbol.abbreviation ?? label}</span>
                  </button>
                  <FavoriteToggle
                    locale={locale}
                    active={favoriteSet.has(favoriteKey)}
                    label={label}
                    onToggle={() => onToggleFavorite(favoriteKey)}
                  />
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {normalizedQuery && !filteredChainBundleCounts.length && !filteredGroupedSymbols.length && (
        <p className="empty-state">{locale === 'ru' ? 'Ничего не найдено.' : 'No stitches found.'}</p>
      )}
    </section>
  )
}

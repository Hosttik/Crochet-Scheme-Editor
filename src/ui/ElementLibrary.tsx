import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { CHAIN_BUNDLE_COUNTS, chainBundleLayout, type ChainBundleCount } from '../editor/chainBundle'
import { categoryName, symbolName, type Locale } from '../i18n'
import { SYMBOLS, SYMBOL_BY_ID, SymbolGlyph } from '../symbols'
import { EditorIcon } from './icons'
import {
  chainFavoriteKey,
  resolveFavorites,
  symbolFavoriteKey,
  type FavoriteElementKey,
  type ResolvedFavorite,
} from './favorites'
import { SearchField } from './primitives'
import type { WorkbenchTool } from './workbenchTypes'
import './favorites.css'
import './elementLibrary.css'

const COLLAPSED_CATEGORIES_STORAGE_KEY = 'crochet-ui-v2-library-collapsed'

function loadCollapsedCategories() {
  if (typeof window === 'undefined') return new Set<string>()
  try {
    const parsed = JSON.parse(window.localStorage.getItem(COLLAPSED_CATEGORIES_STORAGE_KEY) ?? '[]')
    return new Set(Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [])
  } catch {
    return new Set<string>()
  }
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

function LibraryCategory({
  title,
  expanded,
  onToggle,
  children,
  className = '',
  testId,
}: {
  title: ReactNode
  expanded: boolean
  onToggle: () => void
  children: ReactNode
  className?: string
  testId?: string
}) {
  return (
    <div className={`symbol-group library-category ${className}`.trim()} data-testid={testId}>
      <button
        type="button"
        className="library-category__header"
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <span>{title}</span>
        <EditorIcon
          className={expanded ? '' : 'is-collapsed'}
          name="chevronDown"
          size={13}
        />
      </button>
      {expanded ? <div className="library-category__content">{children}</div> : null}
    </div>
  )
}

export function ElementLibrary({
  locale,
  tool,
  query,
  favorites,
  collapsed = false,
  onQueryChange,
  onToggleFavorite,
  onSelectSymbol,
  onSelectChainBundle,
  onCancelPlacement,
  onCollapse,
}: {
  locale: Locale
  tool: WorkbenchTool
  query: string
  favorites: readonly FavoriteElementKey[]
  collapsed?: boolean
  onQueryChange: (query: string) => void
  onToggleFavorite: (key: FavoriteElementKey) => void
  onSelectSymbol: (symbolId: string) => void
  onSelectChainBundle: (count: ChainBundleCount) => void
  onCancelPlacement: () => void
  onCollapse?: () => void
}) {
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(loadCollapsedCategories)

  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSED_CATEGORIES_STORAGE_KEY, JSON.stringify([...collapsedCategories]))
    } catch {
      // Library layout preferences are non-critical; editor behavior must remain usable without localStorage.
    }
  }, [collapsedCategories])

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
  const resolvedFavorites = useMemo(() => resolveFavorites(favorites), [favorites])

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

  const isExpanded = (key: string) => Boolean(normalizedQuery) || !collapsedCategories.has(key)
  const toggleCategory = (key: string) => {
    setCollapsedCategories((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const renderFavoriteItem = (item: ResolvedFavorite) => {
    if (item.kind === 'chain') {
      const label = locale === 'ru' ? `${item.count} воздушные петли` : `${item.count} chains`
      const abbreviation = locale === 'ru' ? `${item.count} ВП` : `${item.count} ch`
      const title = `${label} · ${abbreviation}`
      const placementActive = tool.type === 'place-chain-bundle' && tool.count === item.count
      return (
        <div className="favorite-card" key={item.key}>
          <button
            type="button"
            className={`favorite-item-button ${placementActive ? 'active' : ''}`}
            title={title}
            aria-label={title}
            aria-pressed={placementActive}
            onClick={() => placementActive ? onCancelPlacement() : onSelectChainBundle(item.count)}
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
            active={favoriteSet.has(item.key)}
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
    const placementActive = tool.type === 'place' && tool.symbolId === symbol.id
    return (
      <div className="favorite-card" key={item.key}>
        <button
          type="button"
          className={`favorite-item-button ${placementActive ? 'active' : ''}`}
          title={title}
          aria-label={title}
          aria-pressed={placementActive}
          onClick={() => placementActive ? onCancelPlacement() : onSelectSymbol(symbol.id)}
        >
          <svg viewBox="-24 -38 48 76" aria-hidden="true">
            <g className="symbol-glyph"><SymbolGlyph symbolId={symbol.id} /></g>
          </svg>
          <span>{symbol.abbreviation ?? label}</span>
        </button>
        <FavoriteToggle
          locale={locale}
          active={favoriteSet.has(item.key)}
          label={label}
          onToggle={() => onToggleFavorite(item.key)}
        />
      </div>
    )
  }

  if (collapsed) {
    return (
      <section
        className="panel-section symbols-section element-library is-collapsed"
        aria-hidden="true"
        data-testid="element-library-collapsed"
      />
    )
  }

  return (
    <section className="panel-section symbols-section element-library" aria-label={locale === 'ru' ? 'Библиотека элементов' : 'Element library'}>
      <div className="section-title-row element-library__title-row">
        <h2>{locale === 'ru' ? 'Элементы' : 'Stitches'}</h2>
        <div className="element-library__title-actions">
          <span className="muted-text">{SYMBOLS.length + CHAIN_BUNDLE_COUNTS.length}</span>
          {onCollapse && (
            <button
              type="button"
              className="element-library__collapse"
              aria-label={locale === 'ru' ? 'Свернуть панель элементов' : 'Collapse element panel'}
              title={locale === 'ru' ? 'Свернуть панель элементов' : 'Collapse element panel'}
              onClick={onCollapse}
            >
              <EditorIcon name="chevronDown" size={14} />
            </button>
          )}
        </div>
      </div>
      <SearchField
        wrapperClassName="element-library__search"
        data-testid="symbol-search"
        value={query}
        placeholder={locale === 'ru' ? 'Поиск: ВП, столбик…' : 'Search: ch, double…'}
        label={locale === 'ru' ? 'Поиск элементов' : 'Search stitches'}
        onChange={(event) => onQueryChange(event.target.value)}
      />

      {!normalizedQuery && resolvedFavorites.length > 0 && (
        <LibraryCategory
          className="favorites-group"
          testId="favorites-section"
          title={<><EditorIcon name="star" size={12} />{locale === 'ru' ? 'Избранное' : 'Favorites'}</>}
          expanded={isExpanded('favorites')}
          onToggle={() => toggleCategory('favorites')}
        >
          <div className="symbol-grid favorite-grid">
            {resolvedFavorites.map(renderFavoriteItem)}
          </div>
        </LibraryCategory>
      )}

      {filteredChainBundleCounts.length > 0 && (
        <LibraryCategory
          className="chain-bundle-presets"
          title={locale === 'ru' ? 'Цепочки' : 'Chain presets'}
          expanded={isExpanded('chains')}
          onToggle={() => toggleCategory('chains')}
        >
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
        </LibraryCategory>
      )}

      {filteredGroupedSymbols.map(([category, symbols]) => {
        const categoryKey = `category:${category}`
        return (
          <LibraryCategory
            key={category}
            title={categoryName(category, locale)}
            expanded={isExpanded(categoryKey)}
            onToggle={() => toggleCategory(categoryKey)}
          >
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
          </LibraryCategory>
        )
      })}

      {normalizedQuery && !filteredChainBundleCounts.length && !filteredGroupedSymbols.length && (
        <p className="empty-state">{locale === 'ru' ? 'Ничего не найдено.' : 'No stitches found.'}</p>
      )}
    </section>
  )
}

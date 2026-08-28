import { useMemo } from 'react'
import { CHAIN_BUNDLE_COUNTS, chainBundleLayout, type ChainBundleCount } from '../editor/chainBundle'
import { categoryName, symbolName, type Locale } from '../i18n'
import { SYMBOLS, SymbolGlyph } from '../symbols'
import type { WorkbenchTool } from './workbenchTypes'

export function ElementLibrary({
  locale,
  tool,
  query,
  onQueryChange,
  onSelectSymbol,
  onSelectChainBundle,
  onCancelPlacement,
}: {
  locale: Locale
  tool: WorkbenchTool
  query: string
  onQueryChange: (query: string) => void
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

      {filteredChainBundleCounts.length > 0 && (
        <div className="symbol-group chain-bundle-presets">
          <h3>{locale === 'ru' ? 'Цепочки' : 'Chain presets'}</h3>
          <div className="symbol-grid">
            {filteredChainBundleCounts.map((count) => {
              const active = tool.type === 'place-chain-bundle' && tool.count === count
              const label = locale === 'ru' ? `${count} воздушные петли` : `${count} chains`
              const abbreviation = locale === 'ru' ? `${count} ВП` : `${count} ch`
              const title = `${label} · ${abbreviation}`
              return (
                <button
                  className={`symbol-button chain-bundle-button ${active ? 'active' : ''}`}
                  key={`chain-bundle-${count}`}
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
              return (
                <button
                  className={`symbol-button ${active ? 'active' : ''}`}
                  key={symbol.id}
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

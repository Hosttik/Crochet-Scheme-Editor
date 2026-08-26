import type { Locale } from '../i18n'
import { symbolName } from '../i18n'
import { SymbolGlyph } from '../symbols'
import type { StitchElement } from '../types'
import { usedLegendItems } from './legend'
import './legendPanel.css'

export function LegendPanel({
  locale,
  elements,
  visible,
  onVisibleChange,
}: {
  locale: Locale
  elements: StitchElement[]
  visible: boolean
  onVisibleChange: (visible: boolean) => void
}) {
  const ru = locale === 'ru'
  const visibleElements = elements.filter((element) => element.visible !== false)
  const items = usedLegendItems(visibleElements)
  const counts = new Map<string, number>()
  for (const element of visibleElements) counts.set(element.symbolId, (counts.get(element.symbolId) ?? 0) + 1)

  return (
    <section className="panel-section legend-panel" data-testid="legend-panel">
      <div className="section-title-row">
        <h2>{ru ? 'Легенда' : 'Legend'}</h2>
        <span className="muted-text">{items.length}</span>
      </div>
      <label className="toggle-row">
        <span>
          <strong>{ru ? 'Показывать на схеме' : 'Show on canvas'}</strong>
          <small>{ru ? 'Легенда закреплена в видимой области и также включается в SVG.' : 'The legend stays in view and is also included in SVG.'}</small>
        </span>
        <input type="checkbox" checked={visible} onChange={(event) => onVisibleChange(event.target.checked)} />
      </label>
      <div className="legend-used-heading">{ru ? 'Использованные символы' : 'Used symbols'}</div>
      {!items.length ? (
        <p className="empty-state">{ru ? 'На схеме пока нет видимых символов.' : 'No visible symbols are used yet.'}</p>
      ) : (
        <div className="legend-used-list">
          {items.map((symbol) => (
            <div className="legend-used-row" key={symbol.id}>
              <svg viewBox="-24 -38 48 76" aria-hidden="true"><g className="symbol-glyph"><SymbolGlyph symbolId={symbol.id} /></g></svg>
              <div>
                <strong>{symbol.abbreviation ?? symbol.id}</strong>
                <small>{symbolName(symbol.id, symbol.name, locale)}</small>
              </div>
              <span className="legend-used-count" aria-label={ru ? 'Количество' : 'Count'}>{counts.get(symbol.id) ?? 0}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

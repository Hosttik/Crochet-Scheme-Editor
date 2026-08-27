import { useEffect, useState } from 'react'
import type { Locale } from '../i18n'
import { symbolName } from '../i18n'
import { SymbolGlyph } from '../symbols'
import type { StitchElement } from '../types'
import { usedLegendItems } from './legend'
import './legendPanel.css'

const CANVAS_PAPER_KEY = 'crochet-scheme-editor-canvas-paper'
const CANVAS_GRID_KEY = 'crochet-scheme-editor-canvas-grid'

function storedBoolean(key: string, fallback: boolean) {
  if (typeof window === 'undefined') return fallback
  const value = window.localStorage.getItem(key)
  if (value === 'true') return true
  if (value === 'false') return false
  return fallback
}

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
  const [whiteCanvas, setWhiteCanvas] = useState(() => storedBoolean(CANVAS_PAPER_KEY, false))
  const [gridVisible, setGridVisible] = useState(() => storedBoolean(CANVAS_GRID_KEY, true))
  for (const element of visibleElements) counts.set(element.symbolId, (counts.get(element.symbolId) ?? 0) + 1)

  useEffect(() => {
    document.documentElement.dataset.canvasPaper = whiteCanvas ? 'white' : 'warm'
    window.localStorage.setItem(CANVAS_PAPER_KEY, String(whiteCanvas))
  }, [whiteCanvas])

  useEffect(() => {
    document.documentElement.dataset.canvasGrid = gridVisible ? 'on' : 'off'
    window.localStorage.setItem(CANVAS_GRID_KEY, String(gridVisible))
  }, [gridVisible])

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
                <small title={symbolName(symbol.id, symbol.name, locale)}>{symbolName(symbol.id, symbol.name, locale)}</small>
              </div>
              <span className="legend-used-count" aria-label={ru ? 'Количество' : 'Count'}>{counts.get(symbol.id) ?? 0}</span>
            </div>
          ))}
        </div>
      )}

      <div className="canvas-display-controls">
        <div className="legend-used-heading">{ru ? 'Вид холста' : 'Canvas display'}</div>
        <label className="toggle-row compact-toggle">
          <span>
            <strong>{ru ? 'Белый холст' : 'White canvas'}</strong>
            <small>{ru ? 'Переключает тёплый рабочий фон на чисто белый.' : 'Switches the warm work surface to pure white.'}</small>
          </span>
          <input data-testid="canvas-white-toggle" type="checkbox" checked={whiteCanvas} onChange={(event) => setWhiteCanvas(event.target.checked)} />
        </label>
        <label className="toggle-row compact-toggle">
          <span>
            <strong>{ru ? 'Сетка' : 'Grid'}</strong>
            <small>{ru ? 'Показывать рабочую координатную сетку.' : 'Show the editor coordinate grid.'}</small>
          </span>
          <input data-testid="canvas-grid-toggle" type="checkbox" checked={gridVisible} onChange={(event) => setGridVisible(event.target.checked)} />
        </label>
      </div>
    </section>
  )
}

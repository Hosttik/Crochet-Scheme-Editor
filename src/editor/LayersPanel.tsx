import { SYMBOL_BY_ID, SymbolGlyph } from '../symbols'
import { UI, symbolName, type Locale } from '../i18n'
import type { StitchElement } from '../types'
import { isElementLocked, isElementVisible } from './document'

export function LayersPanel({
  elements,
  selectedIds,
  locale,
  onSelect,
  onToggleVisible,
  onToggleLocked,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
}: {
  elements: StitchElement[]
  selectedIds: string[]
  locale: Locale
  onSelect: (id: string, additive: boolean) => void
  onToggleVisible: (id: string) => void
  onToggleLocked: (id: string) => void
  onBringForward: () => void
  onSendBackward: () => void
  onBringToFront: () => void
  onSendToBack: () => void
}) {
  const t = UI[locale]
  const selected = new Set(selectedIds)
  const canReorder = selectedIds.length > 0

  return (
    <section className="panel-section layers-section">
      <div className="section-title-row">
        <h2>{t.layers}</h2>
        <span className="muted-text">{elements.length}</span>
      </div>

      <div className="layer-order-controls" aria-label={t.layerOrder}>
        <button title={t.toFront} aria-label={t.toFront} disabled={!canReorder} onClick={onBringToFront}>⇈</button>
        <button title={t.forward} aria-label={t.forward} disabled={!canReorder} onClick={onBringForward}>↑</button>
        <button title={t.backward} aria-label={t.backward} disabled={!canReorder} onClick={onSendBackward}>↓</button>
        <button title={t.toBack} aria-label={t.toBack} disabled={!canReorder} onClick={onSendToBack}>⇊</button>
      </div>

      {!elements.length ? (
        <p className="empty-state">{t.noLayers}</p>
      ) : (
        <div className="layers-list">
          {[...elements].reverse().map((element, reversedIndex) => {
            const visible = isElementVisible(element)
            const locked = isElementLocked(element)
            const definition = SYMBOL_BY_ID.get(element.symbolId)
            const label = symbolName(
              element.symbolId,
              definition?.name ?? element.symbolId,
              locale,
            )
            const zIndex = elements.length - reversedIndex

            return (
              <div
                key={element.id}
                className={`layer-row ${selected.has(element.id) ? 'selected' : ''} ${locked ? 'locked' : ''} ${visible ? '' : 'hidden'}`}
              >
                <button
                  className="layer-icon-button"
                  title={visible ? t.hideLayer : t.showLayer}
                  aria-label={visible ? t.hideLayer : t.showLayer}
                  onClick={() => onToggleVisible(element.id)}
                >
                  {visible ? '◉' : '○'}
                </button>
                <button
                  className="layer-icon-button"
                  title={locked ? t.unlockLayer : t.lockLayer}
                  aria-label={locked ? t.unlockLayer : t.lockLayer}
                  onClick={() => onToggleLocked(element.id)}
                >
                  {locked ? '🔒' : '🔓'}
                </button>
                <button
                  className="layer-main-button"
                  disabled={locked}
                  title={locked ? t.unlockToSelect : label}
                  onClick={(event) => onSelect(element.id, event.shiftKey)}
                >
                  <svg viewBox="-24 -34 48 68" aria-hidden="true">
                    <g className="symbol-glyph"><SymbolGlyph symbolId={element.symbolId} /></g>
                  </svg>
                  <span>
                    <strong>{label}</strong>
                    <small>#{zIndex}</small>
                  </span>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

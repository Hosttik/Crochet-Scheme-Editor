import { SYMBOL_BY_ID, SymbolGlyph } from '../symbols'
import { UI, symbolName, type Locale } from '../i18n'
import type { StitchElement } from '../types'
import { isElementLocked, isElementVisible } from './document'

type LayerCluster = {
  key: string
  kind: 'row' | 'group' | 'single'
  label: string
  elements: StitchElement[]
}

function clusterElements(elements: StitchElement[], locale: Locale): LayerCluster[] {
  const clusters = new Map<string, LayerCluster>()
  const order: string[] = []
  for (const element of [...elements].reverse()) {
    const row = element.parametricRow
    const key = row ? `row:${row.id}` : element.groupId ? `group:${element.groupId}` : `single:${element.id}`
    if (!clusters.has(key)) {
      const label = row
        ? `${locale === 'ru' ? 'Ряд' : 'Row'} ${row.patternOrder ?? '—'}`
        : element.groupId
          ? locale === 'ru' ? 'Группа / мотив' : 'Group / motif'
          : ''
      clusters.set(key, { key, kind: row ? 'row' : element.groupId ? 'group' : 'single', label, elements: [] })
      order.push(key)
    }
    clusters.get(key)!.elements.push(element)
  }
  return order.map((key) => clusters.get(key)!)
}

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
  const clusters = clusterElements(elements, locale)

  const renderElement = (element: StitchElement, compact = false) => {
    const visible = isElementVisible(element)
    const locked = isElementLocked(element)
    const definition = SYMBOL_BY_ID.get(element.symbolId)
    const label = symbolName(element.symbolId, definition?.name ?? element.symbolId, locale)
    const zIndex = elements.indexOf(element) + 1
    return (
      <div
        key={element.id}
        className={`layer-row ${compact ? 'compact' : ''} ${selected.has(element.id) ? 'selected' : ''} ${locked ? 'locked' : ''} ${visible ? '' : 'hidden'}`}
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
  }

  return (
    <details className="panel-section layers-section">
      <summary className="layers-summary">
        <span>{t.layers}</span>
        <span className="muted-text">{elements.length}</span>
      </summary>

      <div className="layers-content">
        <div className="layer-order-controls" aria-label={t.layerOrder}>
          <button title={t.toFront} aria-label={t.toFront} disabled={!canReorder} onClick={onBringToFront}>⇈</button>
          <button title={t.forward} aria-label={t.forward} disabled={!canReorder} onClick={onBringForward}>↑</button>
          <button title={t.backward} aria-label={t.backward} disabled={!canReorder} onClick={onSendBackward}>↓</button>
          <button title={t.toBack} aria-label={t.toBack} disabled={!canReorder} onClick={onSendToBack}>⇊</button>
        </div>

        {!elements.length ? (
          <p className="empty-state">{t.noLayers}</p>
        ) : (
          <div className="layers-list semantic-layers-list">
            {clusters.map((cluster) => {
              if (cluster.kind === 'single') return renderElement(cluster.elements[0])
              const hasSelection = cluster.elements.some((element) => selected.has(element.id))
              return (
                <details key={cluster.key} className={`layer-cluster ${hasSelection ? 'selected' : ''}`} open={hasSelection || undefined}>
                  <summary>
                    <span className="layer-cluster-icon">{cluster.kind === 'row' ? '◎' : '◇'}</span>
                    <strong>{cluster.label}</strong>
                    <small>{cluster.elements.length}</small>
                  </summary>
                  <div className="layer-cluster-items">
                    {cluster.elements.map((element) => renderElement(element, true))}
                  </div>
                </details>
              )
            })}
          </div>
        )}
      </div>
    </details>
  )
}

import { useMemo, useState } from 'react'
import { SYMBOL_BY_ID, SymbolGlyph } from '../symbols'
import { UI, symbolName, type Locale } from '../i18n'
import type { MeasurementRuler, StitchElement } from '../types'
import { EditorIcon } from '../ui/icons'
import { IconButton } from '../ui/primitives'
import { isElementLocked, isElementVisible } from './document'
import { useRulerLayersStore } from './rulerLayersStore'
import { resolvedStitchGeometry, stitchVisualSize } from './stitchGeometry'

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

function elementLabel(element: StitchElement, locale: Locale) {
  const definition = SYMBOL_BY_ID.get(element.symbolId)
  return symbolName(element.symbolId, definition?.name ?? element.symbolId, locale)
}

export function LayersPanel({
  elements,
  selectedIds,
  rulers: rulersProp,
  selectedRulerId: selectedRulerIdProp,
  locale,
  onSelect,
  onToggleVisible,
  onToggleLocked,
  onSelectRuler: onSelectRulerProp,
  onToggleRulerVisible: onToggleRulerVisibleProp,
  onToggleRulerLocked: onToggleRulerLockedProp,
  onDeleteRuler: onDeleteRulerProp,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
}: {
  elements: StitchElement[]
  selectedIds: string[]
  rulers?: MeasurementRuler[]
  selectedRulerId?: string | null
  locale: Locale
  onSelect: (id: string, additive: boolean) => void
  onToggleVisible: (id: string) => void
  onToggleLocked: (id: string) => void
  onSelectRuler?: (id: string) => void
  onToggleRulerVisible?: (id: string) => void
  onToggleRulerLocked?: (id: string) => void
  onDeleteRuler?: (id: string) => void
  onBringForward: () => void
  onSendBackward: () => void
  onBringToFront: () => void
  onSendToBack: () => void
}) {
  const t = UI[locale]
  const rulerStore = useRulerLayersStore()
  const rulers = rulersProp ?? rulerStore.rulers
  const selectedRulerId = selectedRulerIdProp === undefined ? rulerStore.selectedRulerId : selectedRulerIdProp
  const onSelectRuler = onSelectRulerProp ?? rulerStore.actions?.select
  const onToggleRulerVisible = onToggleRulerVisibleProp ?? ((id: string) => {
    const ruler = rulers.find((item) => item.id === id)
    if (!ruler) return
    rulerStore.actions?.update(id, { visible: ruler.visible === false })
  })
  const onToggleRulerLocked = onToggleRulerLockedProp ?? ((id: string) => {
    const ruler = rulers.find((item) => item.id === id)
    if (!ruler) return
    rulerStore.actions?.update(id, { locked: ruler.locked !== true })
  })
  const onDeleteRuler = onDeleteRulerProp ?? rulerStore.actions?.delete
  const [query, setQuery] = useState('')
  const selected = new Set(selectedIds)
  const canReorder = elements.some((element) => selected.has(element.id) && !isElementLocked(element))
  const clusters = useMemo(() => clusterElements(elements, locale), [elements, locale])
  const normalizedQuery = query.trim().toLocaleLowerCase(locale === 'ru' ? 'ru-RU' : 'en-US')
  const filteredClusters = useMemo(() => {
    if (!normalizedQuery) return clusters
    return clusters.flatMap((cluster) => {
      const clusterMatches = cluster.label.toLocaleLowerCase(locale === 'ru' ? 'ru-RU' : 'en-US').includes(normalizedQuery)
      const matchingElements = clusterMatches
        ? cluster.elements
        : cluster.elements.filter((element) =>
            elementLabel(element, locale)
              .toLocaleLowerCase(locale === 'ru' ? 'ru-RU' : 'en-US')
              .includes(normalizedQuery),
          )
      return matchingElements.length ? [{ ...cluster, elements: matchingElements }] : []
    })
  }, [clusters, locale, normalizedQuery])
  const filteredRulers = useMemo(() => {
    if (!normalizedQuery) return rulers
    const searchLocale = locale === 'ru' ? 'ru-RU' : 'en-US'
    const aliases = locale === 'ru' ? ['линейка', 'измерение'] : ['ruler', 'measurement']
    return rulers.filter((_, index) => {
      const label = `${locale === 'ru' ? 'Линейка' : 'Ruler'} ${index + 1}`.toLocaleLowerCase(searchLocale)
      return label.includes(normalizedQuery) || aliases.some((alias) => alias.includes(normalizedQuery))
    })
  }, [locale, normalizedQuery, rulers])
  const filteredElementCount = filteredClusters.reduce((count, cluster) => count + cluster.elements.length, 0)
  const filteredCount = filteredElementCount + filteredRulers.length
  const totalCount = elements.length + rulers.length
  const selectedLayerCount = selectedIds.length + (selectedRulerId ? 1 : 0)
  const copy = locale === 'ru'
    ? {
        search: 'Поиск слоев',
        noMatches: 'Нет слоев, подходящих под поиск',
        found: 'Показано',
        selected: 'Выбрано',
        rulers: 'Линейки',
        ruler: 'Линейка',
        deleteRuler: 'Удалить линейку',
      }
    : {
        search: 'Search layers',
        noMatches: 'No layers match the search',
        found: 'Showing',
        selected: 'Selected',
        rulers: 'Rulers',
        ruler: 'Ruler',
        deleteRuler: 'Delete ruler',
      }

  const renderElement = (element: StitchElement, compact = false) => {
    const visible = isElementVisible(element)
    const locked = isElementLocked(element)
    const label = elementLabel(element, locale)
    const zIndex = elements.indexOf(element) + 1
    const geometry = resolvedStitchGeometry(element)
    const visualSize = stitchVisualSize(element)
    const fit = Math.min(1, 40 / Math.max(1, visualSize.width), 58 / Math.max(1, visualSize.height))
    const previewScaleX = (element.mirrored ? -1 : 1) * geometry.scaleX * fit
    const previewScaleY = geometry.scaleY * fit
    const selectTitle = locked ? `${label} · ${t.unlockToSelect}` : label
    return (
      <div
        key={element.id}
        className={`layer-row ${compact ? 'compact' : ''} ${selected.has(element.id) ? 'selected' : ''} ${locked ? 'locked' : ''} ${visible ? '' : 'hidden'}`}
      >
        <IconButton
          className="layer-icon-button"
          icon={visible ? 'eye' : 'eyeOff'}
          label={visible ? t.hideLayer : t.showLayer}
          onClick={() => onToggleVisible(element.id)}
        />
        <IconButton
          className="layer-icon-button"
          icon={locked ? 'lock' : 'unlock'}
          label={locked ? t.unlockLayer : t.lockLayer}
          onClick={() => onToggleLocked(element.id)}
        />
        <button
          className="layer-main-button"
          title={selectTitle}
          aria-label={selectTitle}
          aria-pressed={selected.has(element.id)}
          onClick={(event) => onSelect(element.id, event.shiftKey || event.metaKey || event.ctrlKey)}
        >
          <svg viewBox="-24 -34 48 68" aria-hidden="true">
            <g
              className="symbol-glyph"
              data-testid={`layer-glyph-${element.id}`}
              transform={`rotate(${element.rotation}) scale(${previewScaleX} ${previewScaleY})`}
            >
              <SymbolGlyph symbolId={element.symbolId} spread={geometry.spread} />
            </g>
          </svg>
          <span>
            <strong>{label}</strong>
            <small>#{zIndex}</small>
          </span>
        </button>
      </div>
    )
  }

  const renderCluster = (cluster: LayerCluster) => {
    if (cluster.kind === 'single') return renderElement(cluster.elements[0])
    const hasSelection = cluster.elements.some((element) => selected.has(element.id))
    return (
      <details
        key={cluster.key}
        className={`layer-cluster ${hasSelection ? 'selected' : ''}`}
        open={hasSelection || Boolean(normalizedQuery) || undefined}
      >
        <summary>
          <span className="layer-cluster-icon" aria-hidden="true">
            <EditorIcon name={cluster.kind === 'row' ? 'row' : 'group'} size={15} />
          </span>
          <strong>{cluster.label}</strong>
          <small>{cluster.elements.length}</small>
        </summary>
        <div className="layer-cluster-items">
          {cluster.elements.map((element) => renderElement(element, true))}
        </div>
      </details>
    )
  }

  const renderRuler = (ruler: MeasurementRuler, index: number) => {
    const visible = ruler.visible !== false
    const locked = ruler.locked === true
    const active = selectedRulerId === ruler.id
    const label = `${copy.ruler} ${rulers.indexOf(ruler) + 1}`
    return (
      <div
        key={ruler.id}
        className={`layer-row ruler-layer-row ${active ? 'selected' : ''} ${locked ? 'locked' : ''} ${visible ? '' : 'hidden'}`}
        data-testid={`ruler-layer-${ruler.id}`}
      >
        <IconButton
          className="layer-icon-button"
          icon={visible ? 'eye' : 'eyeOff'}
          label={visible ? t.hideLayer : t.showLayer}
          onClick={() => onToggleRulerVisible?.(ruler.id)}
        />
        <IconButton
          className="layer-icon-button"
          icon={locked ? 'lock' : 'unlock'}
          label={locked ? t.unlockLayer : t.lockLayer}
          onClick={() => onToggleRulerLocked?.(ruler.id)}
        />
        <button
          className="layer-main-button ruler-layer-main"
          title={label}
          aria-label={label}
          aria-pressed={active}
          onClick={() => onSelectRuler?.(ruler.id)}
        >
          <span className="ruler-layer-preview" aria-hidden="true">
            <EditorIcon name="ruler" size={18} />
          </span>
          <span>
            <strong>{label}</strong>
            <small>#{index + 1}{locked ? ` · ${locale === 'ru' ? 'заблокирована' : 'locked'}` : ''}</small>
          </span>
        </button>
        <IconButton
          className="layer-icon-button ruler-layer-delete"
          icon="trash"
          label={copy.deleteRuler}
          disabled={locked}
          data-testid={`ruler-layer-delete-${ruler.id}`}
          onClick={() => onDeleteRuler?.(ruler.id)}
        />
      </div>
    )
  }

  return (
    <details className="panel-section layers-section" open>
      <summary className="layers-summary">
        <span>{t.layers}</span>
        <span className="muted-text">{totalCount}</span>
      </summary>

      <div className="layers-content">
        <div className="layers-sticky-tools">
          <label className="layers-search-field">
            <input
              type="search"
              value={query}
              placeholder={copy.search}
              aria-label={copy.search}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="layers-meta" aria-live="polite">
            <span>{copy.found}: {filteredCount}/{totalCount}</span>
            {selectedLayerCount > 0 && <span>{copy.selected}: {selectedLayerCount}</span>}
          </div>
          <div className="layer-order-controls" aria-label={t.layerOrder}>
            <IconButton icon="bringToFront" label={t.toFront} disabled={!canReorder} onClick={onBringToFront} />
            <IconButton icon="bringForward" label={t.forward} disabled={!canReorder} onClick={onBringForward} />
            <IconButton icon="sendBackward" label={t.backward} disabled={!canReorder} onClick={onSendBackward} />
            <IconButton icon="sendToBack" label={t.toBack} disabled={!canReorder} onClick={onSendToBack} />
          </div>
        </div>

        {!totalCount ? (
          <p className="empty-state">{t.noLayers}</p>
        ) : !filteredCount ? (
          <p className="empty-state">{copy.noMatches}</p>
        ) : (
          <div className="layers-list semantic-layers-list">
            {filteredRulers.length > 0 && (
              <details
                className={`layer-cluster ruler-layer-cluster ${selectedRulerId ? 'selected' : ''}`}
                open={Boolean(selectedRulerId) || Boolean(normalizedQuery) || undefined}
              >
                <summary>
                  <span className="layer-cluster-icon" aria-hidden="true"><EditorIcon name="ruler" size={15} /></span>
                  <strong>{copy.rulers}</strong>
                  <small>{filteredRulers.length}</small>
                </summary>
                <div className="layer-cluster-items">
                  {filteredRulers.map(renderRuler)}
                </div>
              </details>
            )}
            {filteredClusters.map(renderCluster)}
          </div>
        )}
      </div>
    </details>
  )
}

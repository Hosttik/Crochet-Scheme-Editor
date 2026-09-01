import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Locale } from '../i18n'
import type { OrientationMode } from '../types'
import { loadAuthoringPreferences, saveAuthoringPreferences, validSnapOrientation } from '../editor/authoringPreferences'
import { EditorIcon } from './icons'
import type { WorkbenchTool } from './workbenchTypes'
import './canvasWorkspace.css'

export function CanvasToolbar({
  locale,
  zoom,
  tool,
  snappingEnabled,
  orientationMode,
  zoomHint,
  canFitAll,
  canFitSelection,
  onZoomOut,
  onZoom100,
  onZoomIn,
  onFitAll,
  onFitSelection,
  onTogglePan,
  onToggleLasso,
  onToggleRuler,
  onToggleSnapping,
  onOrientationChange,
}: {
  locale: Locale
  zoom: number
  tool: WorkbenchTool
  snappingEnabled: boolean
  orientationMode: OrientationMode
  zoomHint: string
  canFitAll: boolean
  canFitSelection: boolean
  onZoomOut: () => void
  onZoom100: () => void
  onZoomIn: () => void
  onFitAll: () => void
  onFitSelection: () => void
  onTogglePan: () => void
  onToggleLasso: () => void
  onToggleRuler: () => void
  onToggleSnapping: () => void
  onOrientationChange: (orientation: OrientationMode) => void
}) {
  const isPan = tool.type === 'pan'
  const isLasso = tool.type === 'lasso'
  const isRuler = tool.type === 'ruler'
  const [footerHost, setFooterHost] = useState<HTMLElement | null>(null)
  const initialSnapPreference = useRef(validSnapOrientation(loadAuthoringPreferences().snapOrientation))
  const skipNextPreferenceSave = useRef(false)

  useEffect(() => {
    setFooterHost(document.getElementById('canvas-statusbar-controls'))
  }, [])

  useEffect(() => {
    const preferred = initialSnapPreference.current
    initialSnapPreference.current = null
    if (!preferred || preferred === orientationMode) return
    skipNextPreferenceSave.current = true
    onOrientationChange(preferred)
  // Restore the last user-authored snapping orientation once. Project state still
  // owns subsequent changes, while new authoring sessions start from the user's
  // last explicit choice rather than the catalog default.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (skipNextPreferenceSave.current) {
      skipNextPreferenceSave.current = false
      return
    }
    saveAuthoringPreferences({ snapOrientation: orientationMode })
  }, [orientationMode])

  const toolbar = (
    <div
      className="canvas-toolbar"
      role="toolbar"
      aria-label={locale === 'ru' ? 'Навигация и режимы поля' : 'Canvas navigation and modes'}
      data-testid="canvas-toolbar"
    >
      <div className="canvas-toolbar-group canvas-toolbar-zoom" aria-label={locale === 'ru' ? 'Масштаб' : 'Zoom'}>
        <span className="canvas-toolbar-label">{locale === 'ru' ? 'Масштаб' : 'Zoom'}</span>
        <button
          className="canvas-icon-button"
          aria-label={locale === 'ru' ? 'Уменьшить масштаб' : 'Zoom out'}
          title={locale === 'ru' ? 'Уменьшить масштаб' : 'Zoom out'}
          onClick={onZoomOut}
        ><EditorIcon name="minus" size={14} /></button>
        <button
          className="zoom-readout"
          title={locale === 'ru' ? 'Вернуть масштаб 100% (0)' : 'Reset zoom to 100% (0)'}
          onClick={onZoom100}
        >{Math.round(zoom * 100)}%</button>
        <button
          className="canvas-icon-button"
          aria-label={locale === 'ru' ? 'Увеличить масштаб' : 'Zoom in'}
          title={locale === 'ru' ? 'Увеличить масштаб' : 'Zoom in'}
          onClick={onZoomIn}
        ><EditorIcon name="plus" size={14} /></button>
      </div>

      <span className="canvas-toolbar-separator" aria-hidden="true" />

      <div className="canvas-toolbar-group canvas-toolbar-fit" aria-label={locale === 'ru' ? 'Вместить' : 'Fit'}>
        <button
          className="fit-button"
          aria-label={locale === 'ru' ? 'Вместить всю схему' : 'Fit all'}
          title={locale === 'ru' ? 'Вместить всю схему (F)' : 'Fit all (F)'}
          onClick={onFitAll}
          disabled={!canFitAll}
        >{locale === 'ru' ? 'Всё' : 'All'} <kbd>F</kbd></button>
        <button
          className="fit-button"
          aria-label={locale === 'ru' ? 'Вместить выделение' : 'Fit selection'}
          title={locale === 'ru' ? 'Вместить выделение (Shift+F)' : 'Fit selection (Shift+F)'}
          onClick={onFitSelection}
          disabled={!canFitSelection}
        >{locale === 'ru' ? 'Выбор' : 'Sel'} <kbd>⇧F</kbd></button>
      </div>

      <span className="canvas-toolbar-separator" aria-hidden="true" />

      <div className="canvas-toolbar-group canvas-toolbar-modes" aria-label={locale === 'ru' ? 'Быстрые режимы' : 'Quick modes'}>
        <button
          className={`canvas-mode-button ${isPan ? 'active' : ''}`}
          aria-label={locale === 'ru' ? 'Ладонь / перемещение поля' : 'Hand / pan canvas'}
          aria-pressed={isPan}
          title={locale === 'ru' ? 'Ладонь — перемещение поля (H)' : 'Hand — pan canvas (H)'}
          onClick={onTogglePan}
        ><EditorIcon name="hand" size={16} /><span className="canvas-mode-shortcut">H</span></button>
        <button
          className={`canvas-mode-button ${isLasso ? 'active' : ''}`}
          aria-label={locale === 'ru' ? 'Лассо' : 'Lasso'}
          aria-pressed={isLasso}
          title={locale === 'ru' ? 'Лассо (L)' : 'Lasso (L)'}
          onClick={onToggleLasso}
        ><EditorIcon name="lasso" size={16} /><span className="canvas-mode-shortcut">L</span></button>
        <button
          className={`canvas-mode-button ${isRuler ? 'active' : ''}`}
          aria-label={locale === 'ru' ? 'Линейка' : 'Ruler'}
          aria-pressed={isRuler}
          title={locale === 'ru' ? 'Линейка (R)' : 'Ruler (R)'}
          onClick={onToggleRuler}
        ><EditorIcon name="ruler" size={16} /><span className="canvas-mode-shortcut">R</span></button>
      </div>

      <span className="canvas-toolbar-separator" aria-hidden="true" />

      <div className="canvas-toolbar-group canvas-toolbar-snap" aria-label={locale === 'ru' ? 'Привязка' : 'Snapping'}>
        <button
          className={`snap-toggle ${snappingEnabled ? 'active' : ''}`}
          aria-label={locale === 'ru' ? 'Привязка к направляющим' : 'Guide snapping'}
          aria-pressed={snappingEnabled}
          title={locale === 'ru' ? 'S — включить/выключить привязку' : 'S — toggle snapping'}
          onClick={onToggleSnapping}
        >
          <span className="canvas-snap-dot" aria-hidden="true" />
          <span className="canvas-snap-label">{locale === 'ru' ? 'Привязка' : 'Snap'}</span>
          <strong className="canvas-snap-state">
            {snappingEnabled ? (locale === 'ru' ? 'Вкл.' : 'On') : (locale === 'ru' ? 'Свободно' : 'Free')}
          </strong>
          <kbd>S</kbd>
        </button>
        <select
          className="canvas-orientation-select"
          aria-label={locale === 'ru' ? 'Ориентация при привязке' : 'Snap orientation'}
          title={locale === 'ru' ? 'Автоповорот при привязке к направляющей' : 'Auto-rotate when snapping to a guide'}
          value={orientationMode}
          disabled={!snappingEnabled}
          onChange={(event) => onOrientationChange(event.target.value as OrientationMode)}
        >
          <option value="none">{locale === 'ru' ? 'Без поворота' : 'Keep'}</option>
          <option value="along">{locale === 'ru' ? 'Вдоль' : 'Along'}</option>
          <option value="perpendicular">{locale === 'ru' ? 'Поперёк' : 'Perpendicular'}</option>
        </select>
      </div>

      <span className="canvas-hint" title={zoomHint}>{zoomHint}</span>
    </div>
  )

  if (typeof document === 'undefined') return toolbar
  return footerHost ? createPortal(toolbar, footerHost) : null
}

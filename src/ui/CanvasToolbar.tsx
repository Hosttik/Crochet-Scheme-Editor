import type { Locale } from '../i18n'
import type { OrientationMode } from '../types'
import type { WorkbenchTool } from './workbenchTypes'

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
  return (
    <div className="canvas-toolbar">
      <button
        aria-label={locale === 'ru' ? 'Уменьшить масштаб' : 'Zoom out'}
        title="−"
        onClick={onZoomOut}
      >−</button>
      <button
        className="zoom-readout"
        title="100% (0)"
        onClick={onZoom100}
      >{Math.round(zoom * 100)}%</button>
      <button
        aria-label={locale === 'ru' ? 'Увеличить масштаб' : 'Zoom in'}
        title="+"
        onClick={onZoomIn}
      >+</button>
      <button
        className="fit-button"
        aria-label={locale === 'ru' ? 'Вместить всю схему' : 'Fit all'}
        title="F"
        onClick={onFitAll}
        disabled={!canFitAll}
      >{locale === 'ru' ? 'Всё' : 'All'}</button>
      <button
        className="fit-button"
        aria-label={locale === 'ru' ? 'Вместить выделение' : 'Fit selection'}
        title="Shift+F"
        onClick={onFitSelection}
        disabled={!canFitSelection}
      >{locale === 'ru' ? 'Выбор' : 'Sel'}</button>
      <button
        className={`fit-button ${tool.type === 'pan' ? 'active' : ''}`}
        aria-label={locale === 'ru' ? 'Ладонь / перемещение поля' : 'Hand / pan canvas'}
        aria-pressed={tool.type === 'pan'}
        title="H"
        onClick={onTogglePan}
      >{locale === 'ru' ? 'Ладонь' : 'Hand'}</button>
      <button
        className={`fit-button ${tool.type === 'lasso' ? 'active' : ''}`}
        aria-label={locale === 'ru' ? 'Лассо' : 'Lasso'}
        aria-pressed={tool.type === 'lasso'}
        title="L"
        onClick={onToggleLasso}
      >{locale === 'ru' ? 'Лассо' : 'Lasso'}</button>
      <button
        className={`fit-button ${tool.type === 'ruler' ? 'active' : ''}`}
        aria-label={locale === 'ru' ? 'Линейка' : 'Ruler'}
        aria-pressed={tool.type === 'ruler'}
        title="R"
        onClick={onToggleRuler}
      >{locale === 'ru' ? 'Линейка' : 'Ruler'}</button>
      <button
        className={`snap-toggle ${snappingEnabled ? 'active' : ''}`}
        aria-pressed={snappingEnabled}
        title={locale === 'ru' ? 'S — включить/выключить привязку' : 'S — toggle snapping'}
        onClick={onToggleSnapping}
      >{snappingEnabled ? (locale === 'ru' ? 'Привязка' : 'Snap') : (locale === 'ru' ? 'Свободно' : 'Free')}</button>
      <select
        className="canvas-orientation-select"
        aria-label={locale === 'ru' ? 'Ориентация при привязке' : 'Snap orientation'}
        title={locale === 'ru' ? 'Автоповорот при привязке к направляющей' : 'Auto-rotate when snapping to a guide'}
        value={orientationMode}
        disabled={!snappingEnabled}
        onChange={(event) => onOrientationChange(event.target.value as OrientationMode)}
      >
        <option value="none">{locale === 'ru' ? 'Не поворачивать' : 'Keep'}</option>
        <option value="along">{locale === 'ru' ? 'Вдоль' : 'Along'}</option>
        <option value="perpendicular">{locale === 'ru' ? 'Поперёк' : 'Perpendicular'}</option>
      </select>
      <span className="canvas-hint">{zoomHint}</span>
    </div>
  )
}

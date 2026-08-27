import type { Locale } from '../i18n'
import type { MirrorDirection } from './productivity'
import { DraftNumberInput } from './DraftNumberInput'
import type { MirrorAxisState } from './MirrorAxisOverlay'

const LABELS = {
  ru: {
    title: 'Отражение',
    hint: 'Без своей оси быстрые действия отражают относительно границ выделения. При включённой красной оси используются действия внутри блока «Своя ось».',
    replace: 'Отразить',
    copy: 'Копия через ось',
    left: 'влево',
    right: 'вправо',
    up: 'вверх',
    down: 'вниз',
    custom: 'Своя ось',
    customHint: 'Ось остаётся на холсте при смене выделения. Перетаскивайте линию, а круглую ручку — для поворота. Кнопки ниже отражают строго относительно этой оси.',
    horizontal: 'Горизонтальная',
    vertical: 'Вертикальная',
    angle: 'Угол оси °',
    x: 'Ось X',
    y: 'Ось Y',
    center: 'По центру выделения',
    hide: 'Скрыть ось',
    reflect: 'Отразить по своей оси',
    mirrorCopy: 'Создать копию по своей оси',
  },
  en: {
    title: 'Reflection',
    hint: 'Without a custom axis, quick actions reflect relative to the selection bounds. With the red axis enabled, use the actions inside Custom axis.',
    replace: 'Reflect',
    copy: 'Copy across axis',
    left: 'left',
    right: 'right',
    up: 'up',
    down: 'down',
    custom: 'Custom axis',
    customHint: 'The axis stays on canvas when selection changes. Drag the line to move it and the round handle to rotate it. The actions below reflect strictly across this axis.',
    horizontal: 'Horizontal',
    vertical: 'Vertical',
    angle: 'Axis angle °',
    x: 'Axis X',
    y: 'Axis Y',
    center: 'Center on selection',
    hide: 'Hide axis',
    reflect: 'Reflect across custom axis',
    mirrorCopy: 'Copy across custom axis',
  },
} as const

const DIRECTIONS: MirrorDirection[] = ['left', 'right', 'up', 'down']

function directionAngle(direction: MirrorDirection) {
  if (direction === 'right') return 0
  if (direction === 'down') return 90
  if (direction === 'left') return 180
  return -90
}

function MirrorDirectionIcon({ direction }: { direction: MirrorDirection }) {
  return (
    <svg viewBox="0 0 48 32" className="mirror-direction-icon" aria-hidden="true">
      <g transform={`rotate(${directionAngle(direction)} 24 16)`}>
        <polygon points="7,8 7,24 17,16" className="mirror-icon-source" />
        <line x1="24" y1="4" x2="24" y2="28" className="mirror-icon-axis" />
        <polygon points="41,8 41,24 31,16" className="mirror-icon-result" />
      </g>
    </svg>
  )
}

export function MirrorControls({
  locale,
  canTransform,
  state,
  onDirectional,
  onPreset,
  onStateChange,
  onCenter,
  onHide,
  onReflectCustom,
  onCopyCustom,
}: {
  locale: Locale
  canTransform: boolean
  state: MirrorAxisState | null
  onDirectional: (direction: MirrorDirection, copy: boolean) => void
  onPreset: (angle: number) => void
  onStateChange: (state: MirrorAxisState) => void
  onCenter: () => void
  onHide: () => void
  onReflectCustom: () => void
  onCopyCustom: () => void
}) {
  const copy = LABELS[locale]
  const directionLabel = (direction: MirrorDirection) => copy[direction]

  return (
    <div className="productivity-block mirror-controls">
      <strong>{copy.title}</strong>
      <small className="muted-text">{copy.hint}</small>

      {!state && (
        <>
          <span className="mirror-action-label">{copy.replace}</span>
          <div className="mirror-direction-grid">
            {DIRECTIONS.map((direction) => {
              const label = `${copy.replace} ${directionLabel(direction)}`
              return (
                <button key={`reflect-${direction}`} disabled={!canTransform} aria-label={label} title={label} onClick={() => onDirectional(direction, false)}>
                  <MirrorDirectionIcon direction={direction} />
                </button>
              )
            })}
          </div>

          <span className="mirror-action-label">{copy.copy}</span>
          <div className="mirror-direction-grid">
            {DIRECTIONS.map((direction) => {
              const label = `${copy.copy} ${directionLabel(direction)}`
              return (
                <button key={`copy-${direction}`} disabled={!canTransform} aria-label={label} title={label} onClick={() => onDirectional(direction, true)}>
                  <MirrorDirectionIcon direction={direction} />
                </button>
              )
            })}
          </div>
        </>
      )}

      <div className="mirror-custom-block">
        <strong>{copy.custom}</strong>
        <small className="muted-text">{copy.customHint}</small>
        <div className="productivity-mode-tabs mirror-axis-presets">
          <button disabled={!canTransform} className={state?.angle === 0 ? 'active' : ''} onClick={() => onPreset(0)}>{copy.horizontal}</button>
          <button disabled={!canTransform} className={state?.angle === 90 ? 'active' : ''} onClick={() => onPreset(90)}>{copy.vertical}</button>
          <button disabled={!canTransform} className={state?.angle === 45 ? 'active' : ''} onClick={() => onPreset(45)}>45°</button>
          <button disabled={!canTransform} className={state?.angle === -45 ? 'active' : ''} onClick={() => onPreset(-45)}>−45°</button>
        </div>

        {state && (
          <>
            <div className="productivity-field-grid mirror-axis-fields">
              <label className="productivity-field"><span>{copy.x}</span><DraftNumberInput ariaLabel={copy.x} value={state.point.x} onChange={(x) => onStateChange({ ...state, point: { ...state.point, x } })} /></label>
              <label className="productivity-field"><span>{copy.y}</span><DraftNumberInput ariaLabel={copy.y} value={state.point.y} onChange={(y) => onStateChange({ ...state, point: { ...state.point, y } })} /></label>
            </div>
            <label className="productivity-field"><span>{copy.angle}</span><DraftNumberInput ariaLabel={copy.angle} value={state.angle} step={1} onChange={(angle) => onStateChange({ ...state, angle })} /></label>
            <div className="productivity-actions">
              <button onClick={onCenter}>{copy.center}</button>
              <button onClick={onHide}>{copy.hide}</button>
            </div>
            <div className="productivity-actions mirror-axis-actions">
              <button disabled={!canTransform} onClick={onReflectCustom}>{copy.reflect}</button>
              <button disabled={!canTransform} onClick={onCopyCustom}>{copy.mirrorCopy}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

import { useRef } from 'react'
import type { BackgroundImage } from '../types'

type Props = {
  locale: 'ru' | 'en'
  background: BackgroundImage | null
  onUpload: (file: File) => void
  onChange: (patch: Partial<BackgroundImage>) => void
  onRemove: () => void
}

function numeric(value: string, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function BackgroundImagePanel({ locale, background, onUpload, onChange, onRemove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const ru = locale === 'ru'

  return (
    <section className="panel-section background-image-panel" data-testid="background-panel">
      <div className="section-title-row">
        <h2>{ru ? 'Фоновое изображение' : 'Background image'}</h2>
        {background && <span className="muted-text">{background.sourceName ?? (ru ? 'изображение' : 'image')}</span>}
      </div>

      <div className="background-actions">
        <button onClick={() => inputRef.current?.click()}>{background ? (ru ? 'Заменить' : 'Replace') : (ru ? 'Добавить изображение' : 'Add image')}</button>
        {background && <button className="danger-button" onClick={onRemove}>{ru ? 'Удалить' : 'Remove'}</button>}
        <input
          ref={inputRef}
          data-testid="background-file-input"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) onUpload(file)
            event.currentTarget.value = ''
          }}
        />
      </div>

      {!background ? (
        <p className="empty-state">{ru ? 'Добавьте фото или схему, чтобы использовать её как подложку для обводки.' : 'Add a photo or chart to use as a tracing underlay.'}</p>
      ) : (
        <>
          <label className="toggle-row compact-toggle">
            <span>{ru ? 'Показывать на холсте' : 'Visible on canvas'}</span>
            <input type="checkbox" checked={background.visible !== false} onChange={(event) => onChange({ visible: event.target.checked })} />
          </label>
          <label className="toggle-row compact-toggle">
            <span>{ru ? 'Заблокировать геометрию' : 'Lock geometry'}</span>
            <input data-testid="background-lock" type="checkbox" checked={background.locked === true} onChange={(event) => onChange({ locked: event.target.checked })} />
          </label>
          <label className="toggle-row compact-toggle">
            <span>{ru ? 'Включать в SVG и печать' : 'Include in SVG and print'}</span>
            <input data-testid="background-export" type="checkbox" checked={background.includeInExport === true} onChange={(event) => onChange({ includeInExport: event.target.checked })} />
          </label>
          <label className="range-row">
            <span>{ru ? 'Прозрачность' : 'Opacity'} <strong>{Math.round(background.opacity * 100)}%</strong></span>
            <input
              data-testid="background-opacity"
              type="range"
              min="0.05"
              max="1"
              step="0.05"
              value={background.opacity}
              onChange={(event) => onChange({ opacity: numeric(event.target.value, background.opacity) })}
            />
          </label>
          <fieldset disabled={background.locked === true}>
            <legend>{ru ? 'Положение и размер' : 'Position and size'}</legend>
            <div className="number-field-grid background-geometry-grid">
              <label className="number-field"><span>X</span><input type="number" value={background.x} onChange={(event) => onChange({ x: numeric(event.target.value, background.x) })} /></label>
              <label className="number-field"><span>Y</span><input type="number" value={background.y} onChange={(event) => onChange({ y: numeric(event.target.value, background.y) })} /></label>
              <label className="number-field"><span>{ru ? 'Ширина' : 'Width'}</span><input type="number" min="1" value={background.width} onChange={(event) => onChange({ width: Math.max(1, numeric(event.target.value, background.width)) })} /></label>
              <label className="number-field"><span>{ru ? 'Высота' : 'Height'}</span><input type="number" min="1" value={background.height} onChange={(event) => onChange({ height: Math.max(1, numeric(event.target.value, background.height)) })} /></label>
            </div>
          </fieldset>
          <small className="muted-text">{ru ? 'Блокировка защищает положение и размер, но прозрачность и видимость остаются доступными.' : 'Lock protects position and size while opacity and visibility remain editable.'}</small>
        </>
      )}
    </section>
  )
}

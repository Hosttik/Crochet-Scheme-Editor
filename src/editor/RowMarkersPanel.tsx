import type { RowMarker } from '../types'
import { DraftNumberInput } from './DraftNumberInput'
import { isRowMarkerLocked, isRowMarkerVisible } from './rowMarkers'

type Props = {
  locale: 'ru' | 'en'
  markers: RowMarker[]
  selectedId: string | null
  nextNumber: number
  placing: boolean
  onStartPlacement: () => void
  onSelect: (id: string) => void
  onChange: (id: string, patch: Partial<RowMarker>) => void
  onDelete: (id: string) => void
}

export function RowMarkersPanel({
  locale,
  markers,
  selectedId,
  nextNumber,
  placing,
  onStartPlacement,
  onSelect,
  onChange,
  onDelete,
}: Props) {
  const selected = markers.find((marker) => marker.id === selectedId) ?? null
  const ru = locale === 'ru'

  return (
    <div className="row-markers-panel">
      <div className="section-title-row">
        <h2>{ru ? 'Нумерация рядов' : 'Row numbers'}</h2>
        <span className="muted-text">{markers.length}</span>
      </div>
      <button className={`tool-button row-marker-tool ${placing ? 'active' : ''}`} onClick={onStartPlacement}>
        <span className="row-marker-tool-dot">●</span>
        {ru ? `Поставить ряд №${nextNumber}` : `Place row #${nextNumber}`}
        <kbd>Esc</kbd>
      </button>
      <small className="muted-text">
        {ru ? 'Красная точка + номер. После удаления последующие номера сдвигаются автоматически.' : 'Red dot + number. After deletion, following row numbers shift automatically.'}
      </small>

      {markers.length > 0 && (
        <div className="row-marker-list">
          {markers
            .slice()
            .sort((a, b) => a.number - b.number)
            .map((marker) => (
              <button key={marker.id} className={marker.id === selectedId ? 'active' : ''} onClick={() => onSelect(marker.id)}>
                <span className={`row-marker-list-dot ${isRowMarkerVisible(marker) ? '' : 'hidden'}`}>●</span>
                <span>{ru ? 'Ряд' : 'Row'} {marker.number}</span>
                {isRowMarkerLocked(marker) && <span aria-label={ru ? 'Заблокирован' : 'Locked'}>🔒</span>}
              </button>
            ))}
        </div>
      )}

      {selected && (
        <div className="row-marker-editor">
          <label className="number-field">
            <span>{ru ? 'Номер' : 'Number'}</span>
            <DraftNumberInput
              value={selected.number}
              min={1}
              max={999}
              ariaLabel={ru ? 'Номер ряда' : 'Row number'}
              onChange={(value) => onChange(selected.id, { number: Math.max(1, Math.round(value)) })}
            />
          </label>
          <label className="toggle-row compact-toggle">
            <span>{ru ? 'Показывать' : 'Visible'}</span>
            <input type="checkbox" checked={isRowMarkerVisible(selected)} onChange={(event) => onChange(selected.id, { visible: event.target.checked })} />
          </label>
          <label className="toggle-row compact-toggle">
            <span>{ru ? 'Заблокировать' : 'Lock'}</span>
            <input type="checkbox" checked={isRowMarkerLocked(selected)} onChange={(event) => onChange(selected.id, { locked: event.target.checked })} />
          </label>
          <button className="danger-button" disabled={isRowMarkerLocked(selected)} onClick={() => onDelete(selected.id)}>
            {ru ? 'Удалить номер ряда' : 'Delete row number'}
          </button>
        </div>
      )}
    </div>
  )
}

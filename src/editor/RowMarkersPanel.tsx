import type { Guide, RowMarker } from '../types'
import { DraftNumberInput } from './DraftNumberInput'
import {
  isRowMarkerLocked,
  isRowMarkerVisible,
  normalizedRowMarkerColor,
  normalizedRowMarkerLabelAngle,
  normalizedRowMarkerSize,
  rowMarkerGroupIds,
} from './rowMarkers'

type Props = {
  locale: 'ru' | 'en'
  markers: RowMarker[]
  guides: Guide[]
  selectedId: string | null
  nextNumber: number
  placing: boolean
  onStartPlacement: () => void
  onSelect: (id: string) => void
  onChange: (id: string, patch: Partial<RowMarker>) => void
  onAttachGuide: (id: string, guideId: string) => void
  onDetachGuide: (id: string) => void
  onAssignGroup: (id: string, groupId: string | null) => void
  onCreateGroup: (id: string) => void
  onGroupStartAtZeroChange: (id: string, enabled: boolean) => void
  onDelete: (id: string) => void
  guideLabel: (guide: Guide) => string
}

export function RowMarkersPanel({
  locale,
  markers,
  guides,
  selectedId,
  nextNumber,
  placing,
  onStartPlacement,
  onSelect,
  onChange,
  onAttachGuide,
  onDetachGuide,
  onAssignGroup,
  onCreateGroup,
  onGroupStartAtZeroChange,
  onDelete,
  guideLabel,
}: Props) {
  const selected = markers.find((marker) => marker.id === selectedId) ?? null
  const ru = locale === 'ru'
  const groupIds = rowMarkerGroupIds(markers)
  const groupLabel = (groupId: string) => {
    const index = groupIds.indexOf(groupId)
    return `${ru ? 'Группа' : 'Group'} ${index >= 0 ? index + 1 : groupIds.length + 1}`
  }

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
        {ru
          ? 'Размер, направление, цвет, группа и выбранная направляющая используются для следующих маркеров, пока их не изменить.'
          : 'Size, direction, color, group, and the selected guide are reused for new markers until changed.'}
      </small>

      {markers.length > 0 && (
        <div className="row-marker-list">
          {markers
            .slice()
            .sort((a, b) => a.number - b.number)
            .map((marker) => (
              <button key={marker.id} className={marker.id === selectedId ? 'active' : ''} onClick={() => onSelect(marker.id)}>
                <span
                  className={`row-marker-list-dot ${isRowMarkerVisible(marker) ? '' : 'hidden'}`}
                  style={{ color: normalizedRowMarkerColor(marker.color) }}
                >
                  ●
                </span>
                <span>{ru ? 'Ряд' : 'Row'} {marker.number}</span>
                {marker.groupId && <span className="muted-text">{groupLabel(marker.groupId)}</span>}
                {marker.guideAttachment && <span aria-label={ru ? 'Привязан к направляющей' : 'Attached to guide'}>⌁</span>}
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
              min={0}
              max={999}
              ariaLabel={ru ? 'Номер ряда' : 'Row number'}
              onChange={(value) => onChange(selected.id, { number: Math.max(0, Math.round(value)) })}
            />
          </label>

          <label className="number-field">
            <span>{ru ? 'Группа нумерации' : 'Numbering group'}</span>
            <select
              value={selected.groupId ?? ''}
              onChange={(event) => onAssignGroup(selected.id, event.target.value || null)}
            >
              <option value="">{ru ? 'Без группы' : 'No group'}</option>
              {groupIds.map((groupId) => (
                <option key={groupId} value={groupId}>{groupLabel(groupId)}</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => onCreateGroup(selected.id)}>
            {ru ? 'Создать новую группу' : 'Create new group'}
          </button>
          <label className="toggle-row compact-toggle">
            <span>
              <strong>{ru ? 'Начинать отсчёт с 0' : 'Start numbering at 0'}</strong>
              <small>
                {ru
                  ? 'Перенумерует маркеры этой группы последовательно: 0, 1, 2…'
                  : 'Renumbers this group sequentially: 0, 1, 2…'}
              </small>
            </span>
            <input
              type="checkbox"
              checked={selected.startAtZero === true}
              onChange={(event) => onGroupStartAtZeroChange(selected.id, event.target.checked)}
            />
          </label>

          <label className="number-field">
            <span>{ru ? 'Размер' : 'Size'}</span>
            <DraftNumberInput
              value={normalizedRowMarkerSize(selected.size)}
              min={0.5}
              max={3}
              step={0.1}
              ariaLabel={ru ? 'Размер маркера' : 'Marker size'}
              onChange={(value) => onChange(selected.id, { size: normalizedRowMarkerSize(value) })}
            />
          </label>

          <div className="row-marker-direction-editor">
            <span className="row-marker-editor-label">{ru ? 'Размещение номера' : 'Number placement'}</span>
            <div className="segmented-control row-marker-direction-presets">
              {[
                { angle: 0, ru: 'Справа', en: 'Right', icon: '→' },
                { angle: 90, ru: 'Снизу', en: 'Below', icon: '↓' },
                { angle: 180, ru: 'Слева', en: 'Left', icon: '←' },
                { angle: 270, ru: 'Сверху', en: 'Above', icon: '↑' },
              ].map((preset) => (
                <button
                  key={preset.angle}
                  type="button"
                  className={Math.abs(normalizedRowMarkerLabelAngle(selected.labelAngle) - preset.angle) < 0.01 ? 'active' : ''}
                  title={ru ? preset.ru : preset.en}
                  onClick={() => onChange(selected.id, { labelAngle: preset.angle })}
                >
                  {preset.icon}
                </button>
              ))}
            </div>
          </div>

          <label className="number-field">
            <span>{ru ? 'Угол направления °' : 'Direction angle °'}</span>
            <DraftNumberInput
              value={Math.round(normalizedRowMarkerLabelAngle(selected.labelAngle) * 10) / 10}
              step={1}
              ariaLabel={ru ? 'Угол направления маркера' : 'Marker direction angle'}
              onChange={(value) => onChange(selected.id, { labelAngle: normalizedRowMarkerLabelAngle(value) })}
            />
          </label>

          <label className="row-marker-color-field">
            <span>{ru ? 'Цвет маркера' : 'Marker color'}</span>
            <input
              type="color"
              value={normalizedRowMarkerColor(selected.color)}
              aria-label={ru ? 'Цвет маркера' : 'Marker color'}
              onChange={(event) => onChange(selected.id, { color: event.target.value })}
            />
          </label>

          <label className="number-field">
            <span>{ru ? 'Привязка к направляющей' : 'Guide attachment'}</span>
            <select
              value={selected.guideAttachment?.guideId ?? ''}
              onChange={(event) => {
                const guideId = event.target.value
                if (guideId) onAttachGuide(selected.id, guideId)
                else onDetachGuide(selected.id)
              }}
            >
              <option value="">{ru ? 'Без привязки' : 'Not attached'}</option>
              {guides.map((guide, index) => (
                <option key={guide.id} value={guide.id}>{index + 1}. {guideLabel(guide)}</option>
              ))}
            </select>
          </label>
          {selected.guideAttachment && (
            <small className="muted-text">
              {ru
                ? 'При перемещении маркер скользит по направляющей и остаётся на ней; при изменении направляющей маркер следует за ней.'
                : 'Dragging slides the marker along the guide; editing the guide keeps the marker attached.'}
            </small>
          )}

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

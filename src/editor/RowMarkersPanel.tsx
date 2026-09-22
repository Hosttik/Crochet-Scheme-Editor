import { useEffect, useState } from 'react'
import type { Guide, RowMarker } from '../types'
import { DraftNumberInput } from './DraftNumberInput'
import {
  isRowMarkerLocked,
  isRowMarkerVisible,
  normalizedRowMarkerColor,
  normalizedRowMarkerLabelAngle,
  nextRowMarkerNumber,
  normalizedRowMarkerSize,
  rowMarkerGroupIds,
  rowMarkerGroupStartsAtZero,
} from './rowMarkers'

type Props = {
  locale: 'ru' | 'en'
  markers: RowMarker[]
  guides: Guide[]
  selectedId: string | null
  nextNumber: number
  placementGroupId: string | null
  placing: boolean
  onPlacementGroupChange: (groupId: string | null) => void
  onStartPlacement: () => void
  onSelect: (id: string) => void
  onChange: (id: string, patch: Partial<RowMarker>) => void
  onAttachGuide: (id: string, guideId: string) => void
  onDetachGuide: (id: string) => void
  onAssignGroup: (id: string, groupId: string | null) => void
  onCreateGroup: (id: string) => void
  onAssignGroupMany: (ids: string[], groupId: string | null) => void
  onCreateGroupMany: (ids: string[]) => void
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
  placementGroupId,
  placing,
  onPlacementGroupChange,
  onStartPlacement,
  onSelect,
  onChange,
  onAttachGuide,
  onDetachGuide,
  onAssignGroup,
  onCreateGroup,
  onAssignGroupMany,
  onCreateGroupMany,
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
  const placementOptions = [
    {
      id: null as string | null,
      label: ru ? 'Без группы' : 'No group',
      color: normalizedRowMarkerColor(
        markers.filter((marker) => !marker.groupId).at(-1)?.color,
      ),
      nextNumber: nextRowMarkerNumber(markers, null, rowMarkerGroupStartsAtZero(markers, null)),
      startAtZero: rowMarkerGroupStartsAtZero(markers, null),
    },
    ...groupIds.map((groupId) => {
      const groupMarkers = markers.filter((marker) => marker.groupId === groupId)
      const startAtZero = rowMarkerGroupStartsAtZero(markers, groupId)
      return {
        id: groupId,
        label: groupLabel(groupId),
        color: normalizedRowMarkerColor(groupMarkers.at(-1)?.color),
        nextNumber: nextRowMarkerNumber(markers, groupId, startAtZero),
        startAtZero,
      }
    }),
  ]
  const activePlacementOption = placementOptions.find((option) => option.id === placementGroupId)
    ?? placementOptions[0]
  const sortedMarkers = markers
    .slice()
    .sort((a, b) => {
      const aGroup = a.groupId ? groupIds.indexOf(a.groupId) + 1 : 0
      const bGroup = b.groupId ? groupIds.indexOf(b.groupId) + 1 : 0
      return aGroup - bGroup || a.number - b.number
    })
  const selectableIds = sortedMarkers
    .filter((marker) => !isRowMarkerLocked(marker))
    .map((marker) => marker.id)
  const [bulkSelectedIds, setBulkSelectedIds] = useState<string[]>([])
  const [bulkTargetGroupId, setBulkTargetGroupId] = useState('')

  useEffect(() => {
    const validIds = new Set(selectableIds)
    setBulkSelectedIds((current) => {
      const next = current.filter((id) => validIds.has(id))
      return next.length === current.length && next.every((id, index) => id === current[index]) ? current : next
    })
  }, [markers])

  useEffect(() => {
    if (bulkTargetGroupId && !groupIds.includes(bulkTargetGroupId)) setBulkTargetGroupId('')
  }, [bulkTargetGroupId, groupIds])

  const toggleBulkMarker = (id: string, checked: boolean) => {
    setBulkSelectedIds((current) => (
      checked
        ? current.includes(id) ? current : [...current, id]
        : current.filter((selectedId) => selectedId !== id)
    ))
  }

  const applyBulkGroup = () => {
    if (!bulkSelectedIds.length) return
    onAssignGroupMany(bulkSelectedIds, bulkTargetGroupId || null)
    setBulkSelectedIds([])
  }

  const createBulkGroup = () => {
    if (!bulkSelectedIds.length) return
    onCreateGroupMany(bulkSelectedIds)
    setBulkSelectedIds([])
  }

  return (
    <div className="row-markers-panel">
      <div className="section-title-row">
        <h2>{ru ? 'Нумерация рядов' : 'Row numbers'}</h2>
        <span className="muted-text">{markers.length}</span>
      </div>
      {groupIds.length > 0 && (
        <div className="row-marker-placement-group">
          <span className="row-marker-editor-label">
            {ru ? 'Группа для нового маркера' : 'Group for new marker'}
          </span>
          <div className="row-marker-placement-group-options" data-testid="row-marker-placement-groups">
            {placementOptions.map((option) => (
              <button
                key={option.id ?? 'ungrouped'}
                type="button"
                data-testid="row-marker-placement-group"
                className={option.id === placementGroupId ? 'active' : ''}
                onClick={() => onPlacementGroupChange(option.id)}
                title={option.startAtZero
                  ? (ru ? 'Счёт этой группы начинается с 0' : 'This group starts at 0')
                  : undefined}
              >
                <span className="row-marker-placement-group-dot" style={{ color: option.color }}>●</span>
                <span>
                  {option.label}
                  {option.startAtZero && (
                    <small className="row-marker-placement-zero-badge">{ru ? 'с 0' : 'from 0'}</small>
                  )}
                </span>
                <strong>№{option.nextNumber}</strong>
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        className={`tool-button row-marker-tool ${placing ? 'active' : ''}`}
        data-testid="row-marker-place-button"
        onClick={onStartPlacement}
      >
        <span className="row-marker-tool-dot" style={{ color: activePlacementOption.color }}>●</span>
        {ru
          ? `Поставить ${groupIds.length ? `${activePlacementOption.label} · ` : ''}ряд №${nextNumber}`
          : `Place ${groupIds.length ? `${activePlacementOption.label} · ` : ''}row #${nextNumber}`}
        <kbd>Esc</kbd>
      </button>
      <small className="muted-text">
        {ru
          ? 'Перед постановкой выберите нужную группу. Её счётчик продолжится независимо от остальных; остальные параметры сохраняются как раньше.'
          : 'Choose the target group before placing. Its numbering continues independently; the other marker settings remain sticky as before.'}
      </small>

      {markers.length > 0 && (
        <>
          <div className="row-marker-bulk-toolbar" data-testid="row-marker-bulk-toolbar">
            <div className="row-marker-bulk-selection-actions">
              <button
                type="button"
                data-testid="row-marker-select-all"
                disabled={!selectableIds.length}
                onClick={() => setBulkSelectedIds(selectableIds)}
              >
                {ru ? 'Выбрать все' : 'Select all'}
              </button>
              <button
                type="button"
                disabled={!bulkSelectedIds.length}
                onClick={() => setBulkSelectedIds([])}
              >
                {ru ? 'Снять' : 'Clear'}
              </button>
              <span className="muted-text">
                {ru ? `Выбрано: ${bulkSelectedIds.length}` : `Selected: ${bulkSelectedIds.length}`}
              </span>
            </div>

            {bulkSelectedIds.length > 0 && (
              <div className="row-marker-bulk-group-actions">
                <label>
                  <span>{ru ? 'Группа для выделенных' : 'Group selected markers'}</span>
                  <select
                    data-testid="row-marker-bulk-group-target"
                    value={bulkTargetGroupId}
                    onChange={(event) => setBulkTargetGroupId(event.target.value)}
                  >
                    <option value="">{ru ? 'Без группы' : 'No group'}</option>
                    {groupIds.map((groupId) => (
                      <option key={groupId} value={groupId}>{groupLabel(groupId)}</option>
                    ))}
                  </select>
                </label>
                <div className="row-marker-bulk-group-buttons">
                  <button
                    type="button"
                    data-testid="row-marker-bulk-assign"
                    onClick={applyBulkGroup}
                  >
                    {ru ? 'Перенести' : 'Assign'}
                  </button>
                  <button
                    type="button"
                    data-testid="row-marker-bulk-create"
                    onClick={createBulkGroup}
                  >
                    {ru ? 'Новая группа' : 'New group'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="row-marker-list">
            {sortedMarkers.map((marker) => {
              const bulkSelected = bulkSelectedIds.includes(marker.id)
              const locked = isRowMarkerLocked(marker)
              return (
                <div
                  key={marker.id}
                  className={`row-marker-list-item ${bulkSelected ? 'bulk-selected' : ''}`}
                >
                  <input
                    data-testid="row-marker-bulk-select"
                    type="checkbox"
                    aria-label={ru ? `Выбрать ряд ${marker.number}` : `Select row ${marker.number}`}
                    checked={bulkSelected}
                    disabled={locked}
                    onChange={(event) => toggleBulkMarker(marker.id, event.target.checked)}
                  />
                  <button
                    type="button"
                    className={marker.id === selectedId ? 'active' : ''}
                    onClick={() => onSelect(marker.id)}
                  >
                    <span
                      className={`row-marker-list-dot ${isRowMarkerVisible(marker) ? '' : 'hidden'}`}
                      style={{ color: normalizedRowMarkerColor(marker.color) }}
                    >
                      ●
                    </span>
                    <span>{ru ? 'Ряд' : 'Row'} {marker.number}</span>
                    {marker.groupId && <span className="muted-text">{groupLabel(marker.groupId)}</span>}
                    {marker.guideAttachment && <span aria-label={ru ? 'Привязан к направляющей' : 'Attached to guide'}>⌁</span>}
                    {locked && <span aria-label={ru ? 'Заблокирован' : 'Locked'}>🔒</span>}
                  </button>
                </div>
              )
            })}
          </div>
        </>
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

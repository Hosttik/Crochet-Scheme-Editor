import type { Locale } from '../i18n'
import type { ParametricRowBinding, StitchElement } from '../types'
import { rowElements } from './parametricRows'
import { rowConstructionTopologyParents } from './rowConstruction'
import {
  automaticTopologyOverride,
  shiftTopologyChange,
  topologyChangeMarkers,
  topologyOverrideIsCustom,
} from './topology'
import './topology.css'

const COPY = {
  ru: {
    title: 'Позиции изменений',
    automatic: 'Равномерно',
    custom: 'Вручную',
    increase: 'Прибавка',
    decrease: 'Убавка',
    parent: 'род. петля',
    left: 'Сдвинуть влево',
    right: 'Сдвинуть вправо',
    reset: 'Вернуть равномерно',
    choose: 'Выберите маркер +/− на холсте или позицию ниже.',
    hint: 'Перенос меняет только место прибавки/убавки. Количество петель и форма ряда остаются прежними.',
    unresolved: 'Топология этого ряда сейчас не может быть отредактирована.',
  },
  en: {
    title: 'Change positions',
    automatic: 'Even',
    custom: 'Manual',
    increase: 'Increase',
    decrease: 'Decrease',
    parent: 'parent stitch',
    left: 'Move left',
    right: 'Move right',
    reset: 'Reset to even',
    choose: 'Select a +/− marker on the canvas or a position below.',
    hint: 'Moving a change only relocates the increase/decrease. Stitch count and row geometry stay unchanged.',
    unresolved: 'This row topology cannot be edited right now.',
  },
} as const

export function TopologyEditorPanel({
  elements,
  binding,
  locale,
  selectedParentId,
  onSelectParentId,
  onChange,
}: {
  elements: StitchElement[]
  binding: ParametricRowBinding
  locale: Locale
  selectedParentId: string | null
  onSelectParentId: (parentId: string | null) => void
  onChange: (binding: ParametricRowBinding) => void
}) {
  const copy = COPY[locale]
  const shaping = binding.shaping
  const parentRowId = binding.parentRowId
  if (!shaping || !parentRowId) return null

  const rawParents = rowElements(elements, parentRowId)
  const parents = rowConstructionTopologyParents(rawParents, binding.construction)
  const markers = topologyChangeMarkers(elements, binding.id)
  if (!parents.length || markers.length !== shaping.count) {
    return (
      <section className="topology-editor">
        <div className="topology-editor-heading"><strong>{copy.title}</strong></div>
        <p className="topology-editor-hint">{copy.unresolved}</p>
      </section>
    )
  }

  const indexById = new Map(parents.map((parent, index) => [parent.id, index]))
  const sortedMarkers = [...markers].sort(
    (left, right) => (indexById.get(left.parentId) ?? 0) - (indexById.get(right.parentId) ?? 0),
  )
  const activeMarker = selectedParentId
    ? sortedMarkers.find((marker) => marker.parentId === selectedParentId) ?? null
    : null
  const custom = topologyOverrideIsCustom(parents, shaping, binding.topologyOverride)
  const activeIndex = activeMarker ? indexById.get(activeMarker.parentId) : undefined
  const leftOverride = activeMarker
    ? shiftTopologyChange(parents, shaping, binding.topologyOverride, activeMarker.parentId, -1)
    : null
  const rightOverride = activeMarker
    ? shiftTopologyChange(parents, shaping, binding.topologyOverride, activeMarker.parentId, 1)
    : null

  const move = (direction: -1 | 1) => {
    if (!activeMarker || activeIndex === undefined) return
    const nextOverride = direction < 0 ? leftOverride : rightOverride
    if (!nextOverride) return
    const target = parents[activeIndex + direction]
    if (!target) return
    onChange({
      ...binding,
      topologyOverride: topologyOverrideIsCustom(parents, shaping, nextOverride)
        ? nextOverride
        : undefined,
    })
    onSelectParentId(target.id)
  }

  const reset = () => {
    const automatic = automaticTopologyOverride(parents, shaping)
    onChange({ ...binding, topologyOverride: undefined })
    onSelectParentId(automatic?.changeParentIds[0] ?? null)
  }

  return (
    <section className="topology-editor">
      <div className="topology-editor-heading">
        <strong>{copy.title}</strong>
        <span className={`topology-mode-badge ${custom ? 'custom' : ''}`}>
          {custom ? copy.custom : copy.automatic}
        </span>
      </div>

      <p className="topology-editor-status">
        <span>{shaping.kind === 'increase' ? copy.increase : copy.decrease}</span>
        <strong>{shaping.count}</strong>
      </p>

      <div className="topology-change-list">
        {sortedMarkers.map((marker, index) => {
          const parentIndex = indexById.get(marker.parentId) ?? 0
          const active = marker.parentId === selectedParentId
          return (
            <button
              key={`${marker.childId}:${marker.parentId}`}
              className={`topology-change-button ${active ? 'active' : ''}`}
              onClick={() => onSelectParentId(marker.parentId)}
              title={`${shaping.kind === 'increase' ? copy.increase : copy.decrease} ${index + 1} · ${copy.parent} ${parentIndex + 1}`}
            >
              {shaping.kind === 'increase' ? '+' : '−'} {parentIndex + 1}
            </button>
          )
        })}
      </div>

      <div className="topology-editor-actions">
        <button disabled={!activeMarker || !leftOverride} onClick={() => move(-1)} title={copy.left}>←</button>
        <button disabled={!binding.topologyOverride} onClick={reset}>{copy.reset}</button>
        <button disabled={!activeMarker || !rightOverride} onClick={() => move(1)} title={copy.right}>→</button>
      </div>

      <p className="topology-editor-hint">{activeMarker ? copy.hint : copy.choose}</p>
    </section>
  )
}

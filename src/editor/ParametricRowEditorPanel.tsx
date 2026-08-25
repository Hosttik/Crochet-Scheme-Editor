import { useEffect, useState } from 'react'
import { SYMBOLS } from '../symbols'
import { symbolName, type Locale } from '../i18n'
import type {
  Guide,
  GuideRowOptions,
  ParametricRowBinding,
  RowDistributionMode,
  RowOrientation,
  RowShapingKind,
} from '../types'
import { resolveGuideRowCount } from './rowGenerator'
import { RowConstructionEditor } from './RowConstructionEditor'
import { RowSequenceEditor } from './RowSequenceEditor'
import {
  createRowShaping,
  maxRowShapingChanges,
  targetCountForRowShaping,
} from './rowShaping'
import './rowGenerator.css'

const COPY = {
  ru: {
    title: 'Параметрический ряд',
    linked: 'Связан с направляющей',
    stitch: 'Элемент',
    shaping: 'Формирование ряда',
    shapingNone: 'Без изменений',
    increase: 'Прибавки',
    decrease: 'Убавки',
    shapingCount: 'Количество изменений',
    shapingBase: 'Предыдущий ряд',
    shapingHint: 'Прибавки или убавки распределяются автоматически, пока вы не перенесёте позиции вручную ниже.',
    noParent: 'Для первого ряда shaping задаётся через создание следующего ряда.',
    distribution: 'Распределение',
    countMode: 'Количество',
    spacingMode: 'Примерный шаг',
    count: 'Количество элементов',
    spacing: 'Желаемый шаг',
    ring: 'Кольцо',
    orientation: 'Ориентация',
    tangent: 'По касательной',
    radial: 'Радиально',
    fixed: 'Без автоповорота',
    rotationOffset: 'Смещение угла °',
    radialOffset: 'Смещение от направляющей',
    actual: 'Элементов в ряду',
    advanced: 'Дополнительно',
    advancedHint: 'Раппорт, способ вязания, распределение и точные смещения.',
    automatic: 'Изменения применяются сразу. Перемещение или изменение направляющей автоматически перестраивает ряд.',
    delete: 'Удалить весь ряд',
  },
  en: {
    title: 'Parametric row',
    linked: 'Linked to guide',
    stitch: 'Stitch',
    shaping: 'Row shaping',
    shapingNone: 'No shaping',
    increase: 'Increases',
    decrease: 'Decreases',
    shapingCount: 'Number of changes',
    shapingBase: 'Previous row',
    shapingHint: 'Increases or decreases stay evenly distributed until you move their positions manually below.',
    noParent: 'For the first row, shaping starts when you create the next row.',
    distribution: 'Distribution',
    countMode: 'Count',
    spacingMode: 'Approx. spacing',
    count: 'Stitch count',
    spacing: 'Target spacing',
    ring: 'Ring',
    orientation: 'Orientation',
    tangent: 'Tangent',
    radial: 'Radial',
    fixed: 'Keep fixed',
    rotationOffset: 'Rotation offset °',
    radialOffset: 'Guide offset',
    actual: 'Stitches in row',
    advanced: 'Advanced',
    advancedHint: 'Rapport, construction, distribution and precise offsets.',
    automatic: 'Changes apply immediately. Moving or editing the guide automatically rebuilds the row.',
    delete: 'Delete entire row',
  },
} as const

export function ParametricRowEditorPanel({
  binding,
  guide,
  locale,
  parentStitchCount,
  onChange,
  onDelete,
}: {
  binding: ParametricRowBinding
  guide: Guide
  locale: Locale
  parentStitchCount?: number
  onChange: (binding: ParametricRowBinding) => void
  onDelete: () => void
}) {
  const copy = COPY[locale]
  const options = binding.options
  const resolvedCount = resolveGuideRowCount(guide, options)
  const shapingBase = parentStitchCount ?? binding.shaping?.baseCount
  const hasNonDefaultRing =
    guide.type === 'radial-grid' &&
    options.ringIndex !== Math.max(1, Math.round(guide.ringCount))
  const hasRootRadialOffset = !binding.parentRowId && options.radialOffset !== 0
  const hasAdvancedValue = Boolean(
    binding.sequence?.items.length ||
    binding.program ||
    binding.construction ||
    options.distributionMode === 'spacing' ||
    hasRootRadialOffset ||
    options.rotationOffset ||
    hasNonDefaultRing,
  )
  const [advancedOpen, setAdvancedOpen] = useState(hasAdvancedValue)

  useEffect(() => {
    setAdvancedOpen(hasAdvancedValue)
  }, [binding.id])

  useEffect(() => {
    if (hasAdvancedValue) setAdvancedOpen(true)
  }, [hasAdvancedValue])

  const patchOptions = (patch: Partial<GuideRowOptions>) => {
    const manualDistributionChange =
      Object.prototype.hasOwnProperty.call(patch, 'count') ||
      patch.distributionMode === 'spacing'
    onChange({
      ...binding,
      shaping: manualDistributionChange ? undefined : binding.shaping,
      topologyOverride: manualDistributionChange ? undefined : binding.topologyOverride,
      program: manualDistributionChange ? undefined : binding.program,
      options: { ...binding.options, ...patch },
    })
  }

  const applyShaping = (kind: RowShapingKind | null) => {
    if (!shapingBase) return
    if (!kind) {
      onChange({
        ...binding,
        program: undefined,
        shaping: undefined,
        topologyOverride: undefined,
        options: {
          ...binding.options,
          distributionMode: 'count',
          count: shapingBase,
        },
      })
      return
    }

    const max = maxRowShapingChanges(shapingBase, kind)
    if (!max) return
    const requested = binding.shaping?.kind === kind ? binding.shaping.count : Math.min(6, max)
    const shaping = createRowShaping(shapingBase, kind, requested)
    if (!shaping) return
    onChange({
      ...binding,
      program: undefined,
      shaping,
      topologyOverride: undefined,
      options: {
        ...binding.options,
        distributionMode: 'count',
        count: targetCountForRowShaping(shapingBase, kind, shaping.count),
      },
    })
  }

  const updateShapingCount = (value: number) => {
    if (!shapingBase || !binding.shaping) return
    const shaping = createRowShaping(shapingBase, binding.shaping.kind, value)
    if (!shaping) return
    onChange({
      ...binding,
      program: undefined,
      shaping,
      topologyOverride: undefined,
      options: {
        ...binding.options,
        distributionMode: 'count',
        count: targetCountForRowShaping(shapingBase, shaping.kind, shaping.count),
      },
    })
  }

  return (
    <div className="guide-row-generator parametric-row-editor">
      <div className="guide-row-generator-heading">
        <strong>{copy.title}</strong>
        <span>{resolvedCount}</span>
      </div>
      <p className="row-generator-preview-hint">{copy.linked}: {guide.type}</p>

      <label className="row-generator-field">
        <span>{copy.stitch}</span>
        <select
          value={binding.symbolId}
          onChange={(event) => onChange({ ...binding, symbolId: event.target.value })}
        >
          {SYMBOLS.map((symbol) => (
            <option key={symbol.id} value={symbol.id}>
              {symbolName(symbol.id, symbol.name, locale)}
            </option>
          ))}
        </select>
      </label>

      {options.distributionMode === 'count' && (
        <label className="row-generator-field row-basic-count">
          <span>{copy.count}</span>
          <input
            type="number"
            min="1"
            max="500"
            value={options.count}
            onChange={(event) => patchOptions({
              count: Math.max(1, Math.min(500, Number(event.target.value) || 1)),
            })}
          />
        </label>
      )}

      <fieldset className="row-generator-fieldset row-shaping-fieldset" disabled={!shapingBase}>
        <legend>{copy.shaping}</legend>
        {shapingBase ? (
          <>
            <p className="row-shaping-base">{copy.shapingBase}: <strong>{shapingBase}</strong></p>
            <div className="segmented-control">
              <button
                className={!binding.shaping && !binding.program ? 'active' : ''}
                onClick={() => applyShaping(null)}
              >
                {copy.shapingNone}
              </button>
              <button
                className={binding.shaping?.kind === 'increase' ? 'active' : ''}
                disabled={maxRowShapingChanges(shapingBase, 'increase') === 0}
                onClick={() => applyShaping('increase')}
              >
                {copy.increase}
              </button>
              <button
                className={binding.shaping?.kind === 'decrease' ? 'active' : ''}
                disabled={maxRowShapingChanges(shapingBase, 'decrease') === 0}
                onClick={() => applyShaping('decrease')}
              >
                {copy.decrease}
              </button>
            </div>
            {binding.shaping && (
              <label className="row-generator-field row-shaping-count-field">
                <span>{copy.shapingCount}</span>
                <input
                  type="number"
                  min="1"
                  max={maxRowShapingChanges(shapingBase, binding.shaping.kind)}
                  value={binding.shaping.count}
                  onChange={(event) => updateShapingCount(Number(event.target.value) || 1)}
                />
              </label>
            )}
            <p className="row-generator-hint">{copy.shapingHint}</p>
          </>
        ) : (
          <p className="row-generator-hint">{copy.noParent}</p>
        )}
      </fieldset>

      <label className="row-generator-field">
        <span>{copy.orientation}</span>
        <select
          value={options.orientation}
          onChange={(event) => patchOptions({ orientation: event.target.value as RowOrientation })}
        >
          <option value="radial">{copy.radial}</option>
          <option value="tangent">{copy.tangent}</option>
          <option value="fixed">{copy.fixed}</option>
        </select>
      </label>

      <button
        className={`row-advanced-toggle ${advancedOpen ? 'active' : ''}`}
        aria-expanded={advancedOpen}
        onClick={() => setAdvancedOpen((value) => !value)}
      >
        <span>{advancedOpen ? '▾' : '▸'} {copy.advanced}</span>
        <small>{copy.advancedHint}</small>
      </button>

      {advancedOpen && (
        <div className="row-advanced-content">
          <RowSequenceEditor
            binding={binding}
            locale={locale}
            stitchCount={resolvedCount}
            parentStitchCount={parentStitchCount}
            onChange={onChange}
          />

          <RowConstructionEditor binding={binding} locale={locale} onChange={onChange} />

          <fieldset className="row-generator-fieldset">
            <legend>{copy.distribution}</legend>
            <div className="segmented-control">
              {(['count', 'spacing'] as RowDistributionMode[]).map((mode) => (
                <button
                  key={mode}
                  className={options.distributionMode === mode ? 'active' : ''}
                  onClick={() => patchOptions({ distributionMode: mode })}
                >
                  {mode === 'count' ? copy.countMode : copy.spacingMode}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="row-generator-grid">
            {options.distributionMode === 'spacing' && (
              <label className="row-generator-field">
                <span>{copy.spacing}</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={options.spacing}
                  onChange={(event) => patchOptions({ spacing: Math.max(1, Number(event.target.value) || 1) })}
                />
              </label>
            )}

            {guide.type === 'radial-grid' && (
              <label className="row-generator-field">
                <span>{copy.ring}</span>
                <input
                  type="number"
                  min="1"
                  max={Math.max(1, Math.round(guide.ringCount))}
                  value={options.ringIndex}
                  onChange={(event) => patchOptions({
                    ringIndex: Math.max(
                      1,
                      Math.min(Math.round(guide.ringCount), Math.round(Number(event.target.value) || 1)),
                    ),
                  })}
                />
              </label>
            )}

            <label className="row-generator-field">
              <span>{copy.radialOffset}</span>
              <input
                type="number"
                step="1"
                value={options.radialOffset}
                onChange={(event) => patchOptions({ radialOffset: Number(event.target.value) || 0 })}
              />
            </label>

            <label className="row-generator-field">
              <span>{copy.rotationOffset}</span>
              <input
                type="number"
                step="1"
                value={options.rotationOffset}
                onChange={(event) => patchOptions({ rotationOffset: Number(event.target.value) || 0 })}
              />
            </label>
          </div>
        </div>
      )}

      <p className="row-generator-result">{copy.actual}: <strong>{resolvedCount}</strong></p>
      <p className="row-generator-hint">{copy.automatic}</p>
      <button className="danger-button" onClick={onDelete}>{copy.delete}</button>
    </div>
  )
}

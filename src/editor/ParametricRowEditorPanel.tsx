import { SYMBOLS } from '../symbols'
import { symbolName, type Locale } from '../i18n'
import type {
  Guide,
  GuideRowOptions,
  ParametricRowBinding,
  RowDistributionMode,
  RowOrientation,
} from '../types'
import { resolveGuideRowCount } from './rowGenerator'
import './rowGenerator.css'

const COPY = {
  ru: {
    title: 'Параметрический ряд',
    linked: 'Связан с направляющей',
    stitch: 'Элемент',
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
    automatic: 'Изменения применяются сразу. Перемещение или изменение направляющей автоматически перестраивает ряд.',
    delete: 'Удалить весь ряд',
  },
  en: {
    title: 'Parametric row',
    linked: 'Linked to guide',
    stitch: 'Stitch',
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
    automatic: 'Changes apply immediately. Moving or editing the guide automatically rebuilds the row.',
    delete: 'Delete entire row',
  },
} as const

export function ParametricRowEditorPanel({
  binding,
  guide,
  locale,
  onChange,
  onDelete,
}: {
  binding: ParametricRowBinding
  guide: Guide
  locale: Locale
  onChange: (binding: ParametricRowBinding) => void
  onDelete: () => void
}) {
  const copy = COPY[locale]
  const options = binding.options
  const resolvedCount = resolveGuideRowCount(guide, options)

  const patchOptions = (patch: Partial<GuideRowOptions>) => {
    onChange({
      ...binding,
      options: { ...binding.options, ...patch },
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
        {options.distributionMode === 'count' ? (
          <label className="row-generator-field">
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
        ) : (
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

      <p className="row-generator-result">{copy.actual}: <strong>{resolvedCount}</strong></p>
      <p className="row-generator-hint">{copy.automatic}</p>
      <button className="danger-button" onClick={onDelete}>{copy.delete}</button>
    </div>
  )
}

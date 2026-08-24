import { SYMBOLS } from '../symbols'
import { symbolName, type Locale } from '../i18n'
import type { ParametricRowBinding, RowSequenceItem } from '../types'
import {
  normalizeRowSequenceItems,
  rowSequenceCycleInfo,
} from './rowSequence'
import './rowSequence.css'

const COPY = {
  ru: {
    title: 'Состав ряда',
    single: 'Один элемент',
    rapport: 'Раппорт',
    count: 'Кол-во',
    stitch: 'Элемент',
    add: '+ Добавить шаг',
    remove: 'Удалить',
    up: 'Выше',
    down: 'Ниже',
    template: 'Длина раппорта',
    repeats: 'полных повторов',
    remainder: 'остаток',
    hint: 'Раппорт циклически заполняет фактическое количество петель ряда и не меняет shaping или topology.',
  },
  en: {
    title: 'Row composition',
    single: 'Single stitch',
    rapport: 'Rapport',
    count: 'Count',
    stitch: 'Stitch',
    add: '+ Add step',
    remove: 'Remove',
    up: 'Move up',
    down: 'Move down',
    template: 'Rapport length',
    repeats: 'full repeats',
    remainder: 'remainder',
    hint: 'The rapport cycles across the actual row stitch count without changing shaping or topology.',
  },
} as const

function defaultSecondSymbol(base: string) {
  return base === 'chain' ? 'single' : 'chain'
}

export function RowSequenceEditor({
  binding,
  locale,
  stitchCount,
  onChange,
}: {
  binding: ParametricRowBinding
  locale: Locale
  stitchCount: number
  onChange: (binding: ParametricRowBinding) => void
}) {
  const copy = COPY[locale]
  const items = binding.sequence?.items ?? []
  const mixed = Boolean(binding.sequence)
  const cycle = rowSequenceCycleInfo(binding.sequence, stitchCount)

  const setItems = (nextItems: RowSequenceItem[]) => {
    const normalized = normalizeRowSequenceItems(nextItems)
    onChange({
      ...binding,
      sequence: normalized.length ? { items: normalized } : undefined,
    })
  }

  const enableRapport = () => {
    onChange({
      ...binding,
      sequence: {
        items: [
          { symbolId: binding.symbolId, count: 3 },
          { symbolId: defaultSecondSymbol(binding.symbolId), count: 1 },
        ],
      },
    })
  }

  const patchItem = (index: number, patch: Partial<RowSequenceItem>) => {
    setItems(items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item))
  }

  const moveItem = (index: number, delta: -1 | 1) => {
    const target = index + delta
    if (target < 0 || target >= items.length) return
    const next = [...items]
    ;[next[index], next[target]] = [next[target], next[index]]
    setItems(next)
  }

  return (
    <fieldset className="row-generator-fieldset row-sequence-fieldset">
      <legend>{copy.title}</legend>
      <div className="segmented-control">
        <button
          className={!mixed ? 'active' : ''}
          onClick={() => onChange({ ...binding, sequence: undefined })}
        >
          {copy.single}
        </button>
        <button className={mixed ? 'active' : ''} onClick={enableRapport}>
          {copy.rapport}
        </button>
      </div>

      {mixed && (
        <>
          <div className="row-sequence-list">
            {items.map((item, index) => (
              <div className="row-sequence-item" key={`${index}:${item.symbolId}`}>
                <label>
                  <span>{copy.count}</span>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={item.count}
                    onChange={(event) => patchItem(index, {
                      count: Math.max(1, Math.min(500, Number(event.target.value) || 1)),
                    })}
                  />
                </label>
                <label className="row-sequence-symbol">
                  <span>{copy.stitch}</span>
                  <select
                    value={item.symbolId}
                    onChange={(event) => patchItem(index, { symbolId: event.target.value })}
                  >
                    {SYMBOLS.map((symbol) => (
                      <option key={symbol.id} value={symbol.id}>
                        {symbolName(symbol.id, symbol.name, locale)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="row-sequence-actions">
                  <button
                    title={copy.up}
                    aria-label={copy.up}
                    disabled={index === 0}
                    onClick={() => moveItem(index, -1)}
                  >↑</button>
                  <button
                    title={copy.down}
                    aria-label={copy.down}
                    disabled={index === items.length - 1}
                    onClick={() => moveItem(index, 1)}
                  >↓</button>
                  <button
                    title={copy.remove}
                    aria-label={copy.remove}
                    disabled={items.length <= 1}
                    onClick={() => setItems(items.filter((_, itemIndex) => itemIndex !== index))}
                  >×</button>
                </div>
              </div>
            ))}
          </div>

          <button
            className="ghost-button row-sequence-add"
            onClick={() => setItems([...items, { symbolId: binding.symbolId, count: 1 }])}
          >
            {copy.add}
          </button>

          <p className="row-sequence-summary">
            {copy.template}: <strong>{cycle.templateLength}</strong>
            {' · '}{cycle.repeats} {copy.repeats}
            {cycle.remainder ? ` · ${copy.remainder}: ${cycle.remainder}` : ''}
          </p>
          <p className="row-generator-hint">{copy.hint}</p>
        </>
      )}
    </fieldset>
  )
}

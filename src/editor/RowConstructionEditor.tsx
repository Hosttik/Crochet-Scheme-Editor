import type { Locale } from '../i18n'
import type {
  ParametricRowBinding,
  RowConstructionMode,
  RowWorkDirection,
} from '../types'
import {
  defaultRowConstruction,
  normalizeRowConstruction,
  rowConstructionDirectionSymbol,
} from './rowConstruction'
import './rowConstruction.css'

const COPY = {
  ru: {
    title: 'Конструкция ряда',
    none: 'Не задано',
    spiral: 'Спираль',
    joined: 'Замкнутый',
    turning: 'Поворотный',
    direction: 'Направление',
    along: 'По направляющей',
    reverse: 'Против направляющей',
    startChains: 'ВП подъёма',
    join: 'Замыкать соединительным столбиком',
    hint: 'Петли подъёма пока считаются вспомогательными и не входят в количество элементов или topology.',
  },
  en: {
    title: 'Row construction',
    none: 'Unspecified',
    spiral: 'Spiral',
    joined: 'Joined',
    turning: 'Turning',
    direction: 'Direction',
    along: 'Along guide',
    reverse: 'Reverse guide',
    startChains: 'Starting chains',
    join: 'Join with slip stitch',
    hint: 'Starting chains are auxiliary in this version and do not change stitch count or topology.',
  },
} as const

export function RowConstructionEditor({
  binding,
  locale,
  onChange,
}: {
  binding: ParametricRowBinding
  locale: Locale
  onChange: (binding: ParametricRowBinding) => void
}) {
  const copy = COPY[locale]
  const construction = normalizeRowConstruction(binding.construction)

  const setMode = (mode: RowConstructionMode | null) => {
    onChange({
      ...binding,
      construction: mode
        ? defaultRowConstruction(mode, construction?.direction ?? 'along')
        : undefined,
    })
  }

  const patch = (patch: Partial<NonNullable<ParametricRowBinding['construction']>>) => {
    if (!construction) return
    onChange({
      ...binding,
      construction: normalizeRowConstruction({ ...construction, ...patch }),
    })
  }

  return (
    <fieldset className="row-construction-editor">
      <legend>{copy.title}</legend>
      <div className="row-construction-modes">
        <button className={!construction ? 'active' : ''} onClick={() => setMode(null)}>{copy.none}</button>
        <button className={construction?.mode === 'spiral' ? 'active' : ''} onClick={() => setMode('spiral')}>{copy.spiral}</button>
        <button className={construction?.mode === 'joined' ? 'active' : ''} onClick={() => setMode('joined')}>{copy.joined}</button>
        <button className={construction?.mode === 'turning' ? 'active' : ''} onClick={() => setMode('turning')}>{copy.turning}</button>
      </div>

      {construction && (
        <>
          <div className="row-construction-status">
            <strong>{rowConstructionDirectionSymbol(construction)}</strong>
            <span>{construction.mode === 'spiral' ? copy.spiral : construction.mode === 'joined' ? copy.joined : copy.turning}</span>
          </div>

          <label className="row-construction-field">
            <span>{copy.direction}</span>
            <select
              value={construction.direction}
              onChange={(event) => patch({ direction: event.target.value as RowWorkDirection })}
            >
              <option value="along">{copy.along}</option>
              <option value="reverse">{copy.reverse}</option>
            </select>
          </label>

          {construction.mode !== 'spiral' && (
            <label className="row-construction-field">
              <span>{copy.startChains}</span>
              <input
                type="number"
                min="0"
                max="10"
                value={construction.startChainCount}
                onChange={(event) => patch({
                  startChainCount: Math.max(0, Math.min(10, Number(event.target.value) || 0)),
                })}
              />
            </label>
          )}

          {construction.mode === 'joined' && (
            <label className="row-construction-checkbox">
              <input
                type="checkbox"
                checked={construction.joinWithSlipStitch}
                onChange={(event) => patch({ joinWithSlipStitch: event.target.checked })}
              />
              <span>{copy.join}</span>
            </label>
          )}

          <p className="row-construction-hint">{copy.hint}</p>
        </>
      )}
    </fieldset>
  )
}

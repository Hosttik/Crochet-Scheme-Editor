import type { Locale } from '../i18n'
import type {
  ParametricRowBinding,
  RowConstructionMode,
  RowJoinTarget,
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
    title: 'Границы и конструкция ряда',
    none: 'Не задано',
    spiral: 'Спираль',
    joined: 'Замкнутый',
    turning: 'Поворотный',
    direction: 'Направление',
    along: 'По направляющей',
    reverse: 'Против направляющей',
    startChains: 'ВП подъёма',
    countStartChain: 'Считать ВП первой петлёй ряда',
    skipFirst: 'Пропустить петель основания в начале',
    join: 'Замыкать соединительным столбиком',
    joinTarget: 'Куда замыкать ряд',
    firstWorked: 'В первую провязанную петлю',
    startChainTop: 'В верхнюю ВП подъёма',
    countedHint: 'Цепочка добавляет +1 к счёту ряда независимо от числа ВП, но не становится отдельным topology-узлом.',
    hint: 'Количество элементов на холсте — реально провязанные элементы. ВП подъёма, пропуски и точка замыкания хранятся отдельно как семантика границы ряда.',
  },
  en: {
    title: 'Row boundaries & construction',
    none: 'Unspecified',
    spiral: 'Spiral',
    joined: 'Joined',
    turning: 'Turning',
    direction: 'Direction',
    along: 'Along guide',
    reverse: 'Reverse guide',
    startChains: 'Starting chains',
    countStartChain: 'Count starting CH as first stitch',
    skipFirst: 'Base stitches skipped at row start',
    join: 'Join with slip stitch',
    joinTarget: 'Join target',
    firstWorked: 'First worked stitch',
    startChainTop: 'Top of starting CH',
    countedHint: 'The starting chain contributes +1 to the row count regardless of its height, but does not become a topology node.',
    hint: 'Canvas stitch count stays the number of worked stitches. Starting chains, skips and the closure target are stored separately as row-boundary semantics.',
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
            <>
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

              <label className="row-construction-checkbox">
                <input
                  type="checkbox"
                  aria-label={copy.countStartChain}
                  checked={construction.startChainCountsAsStitch}
                  disabled={construction.startChainCount === 0}
                  onChange={(event) => patch({ startChainCountsAsStitch: event.target.checked })}
                />
                <span>{copy.countStartChain}</span>
              </label>

              {construction.startChainCountsAsStitch && (
                <p className="row-construction-hint">{copy.countedHint}</p>
              )}

              <label className="row-construction-field">
                <span>{copy.skipFirst}</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={construction.skipFirstStitches}
                  onChange={(event) => patch({
                    skipFirstStitches: Math.max(0, Math.min(10, Number(event.target.value) || 0)),
                  })}
                />
              </label>
            </>
          )}

          {construction.mode === 'joined' && (
            <>
              <label className="row-construction-checkbox">
                <input
                  type="checkbox"
                  checked={construction.joinWithSlipStitch}
                  onChange={(event) => patch({ joinWithSlipStitch: event.target.checked })}
                />
                <span>{copy.join}</span>
              </label>

              {construction.joinWithSlipStitch && (
                <label className="row-construction-field">
                  <span>{copy.joinTarget}</span>
                  <select
                    aria-label={copy.joinTarget}
                    value={construction.joinTarget}
                    onChange={(event) => patch({ joinTarget: event.target.value as RowJoinTarget })}
                  >
                    <option value="first-stitch">{copy.firstWorked}</option>
                    <option value="start-chain-top" disabled={construction.startChainCount === 0}>
                      {copy.startChainTop}
                    </option>
                  </select>
                </label>
              )}
            </>
          )}

          <p className="row-construction-hint">{copy.hint}</p>
        </>
      )}
    </fieldset>
  )
}

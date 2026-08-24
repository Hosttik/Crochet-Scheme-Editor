import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { SYMBOLS, SymbolGlyph } from '../symbols'
import { symbolName, type Locale } from '../i18n'
import type { Guide, StitchElement } from '../types'
import {
  generateGuideRowPlacements,
  resolveGuideRowCount,
  rowPlacementsToElements,
  type GuideRowOptions,
  type RowDistributionMode,
  type RowOrientation,
} from './rowGenerator'
import './rowGenerator.css'

const COPY = {
  ru: {
    title: 'Создать ряд по направляющей',
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
    generate: 'Создать ряд',
    result: 'Будет создано элементов',
    preview: 'Полупрозрачный предпросмотр уже показан на холсте.',
    hintArc: 'На открытой дуге крайние элементы ставятся точно в начало и конец.',
    hintRadial: 'Элементы равномерно распределяются по выбранному кольцу без дублирования начальной точки.',
  },
  en: {
    title: 'Generate row from guide',
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
    generate: 'Generate row',
    result: 'Stitches to create',
    preview: 'A translucent live preview is already visible on the canvas.',
    hintArc: 'On an open arc, the first and last stitches land exactly on the endpoints.',
    hintRadial: 'Stitches are distributed evenly around the selected ring without duplicating the start point.',
  },
} as const

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function defaultCount(guide: Guide) {
  if (guide.type === 'arc') {
    const closed = Math.abs(Math.abs(guide.endAngle - guide.startAngle) - 360) < 1e-6
    return Math.max(1, Math.round(guide.divisions) + (closed ? 0 : 1))
  }
  if (guide.type === 'radial-grid') return Math.max(2, Math.round(guide.sectorCount))
  return 1
}

function defaultRing(guide: Guide) {
  return guide.type === 'radial-grid' ? Math.max(1, Math.round(guide.ringCount)) : 1
}

export function GuideRowGeneratorPanel({
  guide,
  locale,
  onGenerate,
}: {
  guide: Guide
  locale: Locale
  onGenerate: (elements: StitchElement[]) => void
}) {
  const copy = COPY[locale]
  const [symbolId, setSymbolId] = useState('single')
  const [previewTarget, setPreviewTarget] = useState<SVGGElement | null>(null)
  const [previewVisible, setPreviewVisible] = useState(true)
  const [options, setOptions] = useState<GuideRowOptions>({
    distributionMode: 'count',
    count: defaultCount(guide),
    spacing: 40,
    orientation: 'radial',
    rotationOffset: 0,
    radialOffset: 0,
    ringIndex: defaultRing(guide),
  })

  useEffect(() => {
    setPreviewTarget(document.querySelector<SVGGElement>('.editor-canvas > g'))
  }, [])

  useEffect(() => {
    setOptions((current) => ({
      ...current,
      count: defaultCount(guide),
      ringIndex: defaultRing(guide),
    }))
    setPreviewVisible(true)
  }, [guide.id])

  useEffect(() => {
    setPreviewVisible(true)
  }, [guide])

  const placements = useMemo(
    () => generateGuideRowPlacements(guide, options),
    [guide, options],
  )
  const resolvedCount = useMemo(
    () => resolveGuideRowCount(guide, options),
    [guide, options],
  )
  const previewElements = useMemo(
    () => rowPlacementsToElements(
      placements,
      symbolId,
      (_placement, index) => `__row-preview__:${guide.id}:${index}`,
    ),
    [guide.id, placements, symbolId],
  )

  if (guide.type === 'grid') return null

  const patch = (next: Partial<GuideRowOptions>) => {
    setPreviewVisible(true)
    setOptions((current) => ({ ...current, ...next }))
  }

  const generate = () => {
    const generated = rowPlacementsToElements(placements, symbolId, () => createId())
    onGenerate(generated)
    setPreviewVisible(false)
  }

  const previewPortal = previewVisible && guide.visible && previewTarget
    ? createPortal(
        <g className="row-generator-live-preview" pointerEvents="none" aria-hidden="true">
          {previewElements.map((element) => (
            <g
              key={element.id}
              transform={`translate(${element.x} ${element.y}) rotate(${element.rotation})`}
              className="row-generator-preview-stitch"
            >
              <g className="symbol-glyph"><SymbolGlyph symbolId={element.symbolId} /></g>
            </g>
          ))}
        </g>,
        previewTarget,
      )
    : null

  return (
    <>
      {previewPortal}
      <section className="guide-row-generator">
        <div className="guide-row-generator-heading">
          <strong>{copy.title}</strong>
          <span>{resolvedCount}</span>
        </div>

        <label className="row-generator-field">
          <span>{copy.stitch}</span>
          <select
            value={symbolId}
            onChange={(event) => {
              setSymbolId(event.target.value)
              setPreviewVisible(true)
            }}
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
                onClick={() => patch({ distributionMode: mode })}
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
                onChange={(event) => patch({ count: Math.max(1, Math.min(500, Number(event.target.value) || 1)) })}
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
                onChange={(event) => patch({ spacing: Math.max(1, Number(event.target.value) || 1) })}
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
                onChange={(event) => patch({
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
              onChange={(event) => patch({ radialOffset: Number(event.target.value) || 0 })}
            />
          </label>

          <label className="row-generator-field">
            <span>{copy.rotationOffset}</span>
            <input
              type="number"
              step="1"
              value={options.rotationOffset}
              onChange={(event) => patch({ rotationOffset: Number(event.target.value) || 0 })}
            />
          </label>
        </div>

        <label className="row-generator-field">
          <span>{copy.orientation}</span>
          <select
            value={options.orientation}
            onChange={(event) => patch({ orientation: event.target.value as RowOrientation })}
          >
            <option value="radial">{copy.radial}</option>
            <option value="tangent">{copy.tangent}</option>
            <option value="fixed">{copy.fixed}</option>
          </select>
        </label>

        <p className="row-generator-result">
          {copy.result}: <strong>{resolvedCount}</strong>
        </p>
        {previewVisible && guide.visible && (
          <p className="row-generator-preview-hint">{copy.preview}</p>
        )}
        <p className="row-generator-hint">
          {guide.type === 'arc' ? copy.hintArc : copy.hintRadial}
        </p>
        <button className="primary-button row-generator-submit" onClick={generate} disabled={!resolvedCount}>
          {copy.generate}
        </button>
      </section>
    </>
  )
}

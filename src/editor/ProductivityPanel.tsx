import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { SymbolGlyph } from '../symbols'
import type { Guide, StitchElement } from '../types'
import type { Locale } from '../i18n'
import {
  repeatSelection,
  type RepeatMode,
  type RepeatOptions,
  type GuideRepeatOrientation,
} from './productivity'
import './productivity.css'

const COPY = {
  ru: {
    title: 'Ускорители',
    hint: 'Результат повтора показывается на холсте до создания.',
    group: 'Группировать',
    ungroup: 'Разгруппировать',
    mirror: 'Отразить',
    mirrorHorizontal: '↔ По горизонтали',
    mirrorVertical: '↕ По вертикали',
    repeat: 'Повтор',
    linear: 'Линейно',
    circular: 'По кругу',
    guide: 'По направляющей',
    copies: 'Копий',
    deltaX: 'ΔX',
    deltaY: 'ΔY',
    angle: 'Шаг °',
    spacing: 'Шаг по пути',
    orientation: 'Ориентация',
    keep: 'Не менять',
    tangent: 'По касательной',
    radial: 'Радиально',
    centerLabel: 'Центр',
    guideLabel: 'Направляющая',
    selectionCenter: 'Центр выделения',
    noGuide: 'Нет направляющей',
    apply: 'Создать копии',
    needSelection: 'Выберите один или несколько обычных элементов.',
    needGuide: 'Для движения по пути выберите направляющую.',
    groupedHint: 'Alt+клик выбирает один элемент внутри группы.',
  },
  en: {
    title: 'Productivity',
    hint: 'Repeat results are previewed on the canvas before creation.',
    group: 'Group',
    ungroup: 'Ungroup',
    mirror: 'Mirror',
    mirrorHorizontal: '↔ Left / right',
    mirrorVertical: '↕ Top / bottom',
    repeat: 'Repeat',
    linear: 'Linear',
    circular: 'Circular',
    guide: 'Along guide',
    copies: 'Copies',
    deltaX: 'ΔX',
    deltaY: 'ΔY',
    angle: 'Step °',
    spacing: 'Path spacing',
    orientation: 'Orientation',
    keep: 'Keep',
    tangent: 'Tangent',
    radial: 'Radial',
    centerLabel: 'Center',
    guideLabel: 'Guide',
    selectionCenter: 'Selection center',
    noGuide: 'No guide',
    apply: 'Create copies',
    needSelection: 'Select one or more regular stitches.',
    needGuide: 'Choose a guide for along-guide repeat.',
    groupedHint: 'Alt+click selects one stitch inside a group.',
  },
} as const

function guideName(guide: Guide, locale: Locale, index: number) {
  const name = guide.type === 'arc'
    ? locale === 'ru' ? 'Дуга' : 'Arc'
    : guide.type === 'grid'
      ? locale === 'ru' ? 'Сетка' : 'Grid'
      : locale === 'ru' ? 'Радиальная сетка' : 'Radial grid'
  return `${index + 1}. ${name}`
}

export function ProductivityPanel({
  locale,
  guides,
  elements,
  selectedIds,
  selectedCount,
  canTransform,
  canGroup,
  canUngroup,
  onGroup,
  onUngroup,
  onMirror,
  onRepeat,
}: {
  locale: Locale
  guides: Guide[]
  elements: StitchElement[]
  selectedIds: string[]
  selectedCount: number
  canTransform: boolean
  canGroup: boolean
  canUngroup: boolean
  onGroup: () => void
  onUngroup: () => void
  onMirror: (axis: 'left-right' | 'top-bottom') => void
  onRepeat: (options: RepeatOptions) => void
}) {
  const copy = COPY[locale]
  const [mode, setMode] = useState<RepeatMode>('linear')
  const [copies, setCopies] = useState(5)
  const [deltaX, setDeltaX] = useState(48)
  const [deltaY, setDeltaY] = useState(0)
  const [angleStep, setAngleStep] = useState(45)
  const [spacing, setSpacing] = useState(48)
  const [orientation, setOrientation] = useState<GuideRepeatOrientation>('tangent')
  const [guideId, setGuideId] = useState('')
  const [previewTarget, setPreviewTarget] = useState<SVGGElement | null>(null)

  useEffect(() => {
    setPreviewTarget(document.querySelector<SVGGElement>('.editor-canvas > g'))
  }, [])

  useEffect(() => {
    if (!guideId || guides.some((guide) => guide.id === guideId)) return
    setGuideId('')
  }, [guideId, guides])

  const selectedGuide = useMemo(
    () => guides.find((guide) => guide.id === guideId) ?? null,
    [guideId, guides],
  )
  const needsGuide = mode === 'guide'
  const disabled = !canTransform || (needsGuide && !selectedGuide)

  const options = useMemo<RepeatOptions | null>(() => {
    if (mode === 'linear') return { mode, copies, deltaX, deltaY }
    if (mode === 'circular') {
      const center = selectedGuide
        ? selectedGuide.type === 'grid' ? selectedGuide.origin : selectedGuide.center
        : undefined
      return { mode, copies, angleStep, center }
    }
    if (!selectedGuide) return null
    return { mode, copies, spacing, orientation, guide: selectedGuide }
  }, [angleStep, copies, deltaX, deltaY, mode, orientation, selectedGuide, spacing])

  const previewElements = useMemo(() => {
    if (!canTransform || !options) return []
    let index = 0
    return repeatSelection(elements, selectedIds, options, () => `__repeat-preview__:${index++}`)
  }, [canTransform, elements, options, selectedIds])

  const apply = () => {
    if (disabled || !options) return
    onRepeat(options)
  }

  const previewPortal = previewTarget && previewElements.length
    ? createPortal(
        <g className="productivity-repeat-preview" pointerEvents="none" aria-hidden="true">
          {previewElements.map((element) => (
            <g
              key={element.id}
              transform={`translate(${element.x} ${element.y}) rotate(${element.rotation})`}
              className="productivity-repeat-preview-stitch"
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
      <section className="panel-section productivity-panel">
        <div className="section-title-row">
          <h2>{copy.title}</h2>
          <span className="muted-text">{selectedCount}</span>
        </div>
        <p className="productivity-hint">{copy.hint}</p>

        <div className="productivity-actions">
          <button disabled={!canGroup} onClick={onGroup}>{copy.group}</button>
          <button disabled={!canUngroup} onClick={onUngroup}>{copy.ungroup}</button>
        </div>
        <small className="muted-text">{copy.groupedHint}</small>

        <div className="productivity-block">
          <strong>{copy.mirror}</strong>
          <div className="productivity-actions">
            <button disabled={!canTransform} onClick={() => onMirror('left-right')}>{copy.mirrorHorizontal}</button>
            <button disabled={!canTransform} onClick={() => onMirror('top-bottom')}>{copy.mirrorVertical}</button>
          </div>
        </div>

        <div className="productivity-block">
          <strong>{copy.repeat}</strong>
          <div className="productivity-mode-tabs">
            <button className={mode === 'linear' ? 'active' : ''} onClick={() => setMode('linear')}>{copy.linear}</button>
            <button className={mode === 'circular' ? 'active' : ''} onClick={() => setMode('circular')}>{copy.circular}</button>
            <button className={mode === 'guide' ? 'active' : ''} onClick={() => setMode('guide')}>{copy.guide}</button>
          </div>

          <label className="productivity-field">
            <span>{copy.copies}</span>
            <input type="number" min="1" max="100" value={copies} onChange={(event) => setCopies(Math.max(1, Math.min(100, Number(event.target.value) || 1)))} />
          </label>

          {mode === 'linear' && (
            <div className="productivity-field-grid">
              <label className="productivity-field"><span>{copy.deltaX}</span><input type="number" value={deltaX} onChange={(event) => setDeltaX(Number(event.target.value) || 0)} /></label>
              <label className="productivity-field"><span>{copy.deltaY}</span><input type="number" value={deltaY} onChange={(event) => setDeltaY(Number(event.target.value) || 0)} /></label>
            </div>
          )}

          {mode === 'circular' && (
            <>
              <label className="productivity-field">
                <span>{copy.centerLabel}</span>
                <select value={guideId} onChange={(event) => setGuideId(event.target.value)}>
                  <option value="">{copy.selectionCenter}</option>
                  {guides.map((guide, index) => <option key={guide.id} value={guide.id}>{guideName(guide, locale, index)}</option>)}
                </select>
              </label>
              <label className="productivity-field"><span>{copy.angle}</span><input type="number" step="1" value={angleStep} onChange={(event) => setAngleStep(Number(event.target.value) || 0)} /></label>
            </>
          )}

          {mode === 'guide' && (
            <>
              <label className="productivity-field">
                <span>{copy.guideLabel}</span>
                <select value={guideId} onChange={(event) => setGuideId(event.target.value)}>
                  <option value="">{copy.noGuide}</option>
                  {guides.map((guide, index) => <option key={guide.id} value={guide.id}>{guideName(guide, locale, index)}</option>)}
                </select>
              </label>
              <label className="productivity-field"><span>{copy.spacing}</span><input type="number" min="1" step="1" value={spacing} onChange={(event) => setSpacing(Math.max(1, Number(event.target.value) || 1))} /></label>
              <label className="productivity-field">
                <span>{copy.orientation}</span>
                <select value={orientation} onChange={(event) => setOrientation(event.target.value as GuideRepeatOrientation)}>
                  <option value="keep">{copy.keep}</option>
                  <option value="tangent">{copy.tangent}</option>
                  <option value="radial">{copy.radial}</option>
                </select>
              </label>
            </>
          )}

          {!canTransform && <small className="productivity-warning">{copy.needSelection}</small>}
          {canTransform && needsGuide && !selectedGuide && <small className="productivity-warning">{copy.needGuide}</small>}
          <button className="productivity-apply" disabled={disabled} onClick={apply}>{copy.apply}</button>
        </div>
      </section>
    </>
  )
}

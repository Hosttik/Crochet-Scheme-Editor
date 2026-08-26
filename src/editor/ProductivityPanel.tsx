import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { SymbolGlyph } from '../symbols'
import type { Guide, StitchElement } from '../types'
import type { Locale } from '../i18n'
import { DraftNumberInput } from './DraftNumberInput'
import {
  repeatSelection,
  type RepeatMode,
  type RepeatOptions,
  type GuideRepeatOrientation,
} from './productivity'
import { repeatPreviewSelectionKind, shouldShowRepeatPreview } from './repeatPreview'
import './productivity.css'

const COPY = {
  ru: {
    title: 'Ускорители',
    hint: 'Результат повтора показывается на холсте до создания.',
    groupedPreview: 'Группа считается одним объектом: показывается ghost-preview всего мотива.',
    multiplePreviewHidden: 'Выбрано несколько элементов: Repeat повторит их вместе как временный мотив. Предпросмотр скрыт; «Группировать» сохранит мотив как один объект.',
    group: 'Группировать',
    ungroup: 'Разгруппировать',
    mirror: 'Отражение',
    mirrorHint: 'Flip использует ось через центр выделения. Зеркальная копия создаётся рядом с оригиналом.',
    flipLeftRight: '↔ Слева / справа',
    flipTopBottom: '↕ Сверху / снизу',
    mirrorCopyLeftRight: '⧉↔ Копия справа',
    mirrorCopyTopBottom: '⧉↕ Копия снизу',
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
    groupedHint: 'Группа — постоянный мотив. Alt+клик выбирает один элемент внутри группы.',
  },
  en: {
    title: 'Productivity',
    hint: 'Repeat results are previewed on the canvas before creation.',
    groupedPreview: 'A group is treated as one object, so the whole motif is shown as a ghost preview.',
    multiplePreviewHidden: 'Multiple stitches are selected: Repeat will treat them as a temporary motif. Preview is hidden; Group saves the motif as one persistent object.',
    group: 'Group',
    ungroup: 'Ungroup',
    mirror: 'Reflection',
    mirrorHint: 'Flip uses an axis through the selection center. Mirrored copy creates a separate adjacent object.',
    flipLeftRight: '↔ Left / right',
    flipTopBottom: '↕ Top / bottom',
    mirrorCopyLeftRight: '⧉↔ Copy right',
    mirrorCopyTopBottom: '⧉↕ Copy below',
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
    groupedHint: 'A group is a persistent motif. Alt+click selects one stitch inside it.',
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
  onMirrorCopy,
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
  onMirrorCopy: (axis: 'left-right' | 'top-bottom') => void
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
  const previewSelectionKind = useMemo(
    () => repeatPreviewSelectionKind(elements, selectedIds),
    [elements, selectedIds],
  )
  const previewEnabled = shouldShowRepeatPreview(previewSelectionKind)

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
    if (!canTransform || !options || !previewEnabled) return []
    let index = 0
    return repeatSelection(elements, selectedIds, options, () => `__repeat-preview__:${index++}`)
  }, [canTransform, elements, options, previewEnabled, selectedIds])

  const apply = () => {
    if (disabled || !options) return
    onRepeat(options)
  }

  const previewPortal = previewTarget && previewElements.length > 0
    ? createPortal(
        <g className="productivity-repeat-preview" pointerEvents="none" aria-hidden="true">
          {previewElements.map((element) => (
            <g
              key={element.id}
              transform={`translate(${element.x} ${element.y}) rotate(${element.rotation})`}
              className="productivity-repeat-preview-stitch"
            >
              <g className="symbol-glyph" style={element.color ? { color: element.color } : undefined}>
                <SymbolGlyph symbolId={element.symbolId} />
              </g>
            </g>
          ))}
        </g>,
        previewTarget,
      )
    : null

  const previewHint = previewSelectionKind === 'single-group'
    ? copy.groupedPreview
    : previewSelectionKind === 'multiple'
      ? copy.multiplePreviewHidden
      : copy.hint

  return (
    <>
      {previewPortal}
      <section className="panel-section productivity-panel">
        <div className="section-title-row">
          <h2>{copy.title}</h2>
          <span className="muted-text">{selectedCount}</span>
        </div>
        <p className="productivity-hint">{previewHint}</p>

        <div className="productivity-actions">
          <button disabled={!canGroup} onClick={onGroup}>{copy.group}</button>
          <button disabled={!canUngroup} onClick={onUngroup}>{copy.ungroup}</button>
        </div>
        <small className="muted-text">{copy.groupedHint}</small>

        <div className="productivity-block">
          <strong>{copy.mirror}</strong>
          <small className="muted-text">{copy.mirrorHint}</small>
          <div className="productivity-actions">
            <button disabled={!canTransform} onClick={() => onMirror('left-right')}>{copy.flipLeftRight}</button>
            <button disabled={!canTransform} onClick={() => onMirror('top-bottom')}>{copy.flipTopBottom}</button>
          </div>
          <div className="productivity-actions">
            <button disabled={!canTransform} onClick={() => onMirrorCopy('left-right')}>{copy.mirrorCopyLeftRight}</button>
            <button disabled={!canTransform} onClick={() => onMirrorCopy('top-bottom')}>{copy.mirrorCopyTopBottom}</button>
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
            <DraftNumberInput ariaLabel={copy.copies} min={1} max={100} value={copies} onChange={setCopies} />
          </label>

          {mode === 'linear' && (
            <div className="productivity-field-grid">
              <label className="productivity-field"><span>{copy.deltaX}</span><DraftNumberInput ariaLabel={copy.deltaX} value={deltaX} onChange={setDeltaX} /></label>
              <label className="productivity-field"><span>{copy.deltaY}</span><DraftNumberInput ariaLabel={copy.deltaY} value={deltaY} onChange={setDeltaY} /></label>
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
              <label className="productivity-field"><span>{copy.angle}</span><DraftNumberInput ariaLabel={copy.angle} step={1} value={angleStep} onChange={setAngleStep} /></label>
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
              <label className="productivity-field"><span>{copy.spacing}</span><DraftNumberInput ariaLabel={copy.spacing} min={1} step={1} value={spacing} onChange={setSpacing} /></label>
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

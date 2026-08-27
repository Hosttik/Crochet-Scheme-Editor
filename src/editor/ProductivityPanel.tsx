import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { SymbolGlyph } from '../symbols'
import type { Guide, StitchElement } from '../types'
import type { Locale } from '../i18n'
import { DraftNumberInput } from './DraftNumberInput'
import { guideCenter } from './guideManipulation'
import {
  mirrorElementsAcrossLine,
  mirrorElementsToward,
  repeatSelection,
  type RepeatMode,
  type RepeatOptions,
  type GuideRepeatOrientation,
  type MirrorDirection,
} from './productivity'
import { repeatPreviewSelectionKind, shouldShowRepeatPreview } from './repeatPreview'
import { repeatDefaults } from './repeatDefaults'
import type { MirrorAxisState } from './MirrorAxisOverlay'
import { MirrorControls } from './MirrorControls'
import './productivity.css'

const COPY = {
  ru: {
    title: 'Ускорители',
    hint: 'Измените параметр Repeat, чтобы увидеть ghost-preview. Создание происходит только по кнопке.',
    groupedPreview: 'Ghost-preview показывает всю группу как один мотив.',
    multiplePreviewHidden: 'Ghost-preview показывает всё временное выделение как один мотив.',
    previewIdle: 'Предпросмотр выключен. Измените любой параметр Repeat, чтобы показать результат.',
    group: 'Группировать',
    ungroup: 'Разгруппировать',
    repeat: 'Повтор',
    linear: 'Линейно',
    circular: 'По кругу',
    guide: 'По направляющей',
    copies: 'Копий',
    copiesInvalid: 'Введите целое число от 1 до 100.',
    deltaX: 'ΔX',
    deltaY: 'ΔY',
    angle: 'Шаг °',
    spacing: 'Зазор по пути',
    orientation: 'Ориентация',
    keep: 'Не менять',
    tangent: 'По касательной',
    radial: 'Радиально',
    centerLabel: 'Центр',
    guideLabel: 'Направляющая',
    selectionCenter: 'Центр выделения',
    noGuide: 'Нет направляющей',
    apply: 'Создать копии',
    cancelPreview: 'Отмена предпросмотра',
    needSelection: 'Выберите один или несколько обычных элементов.',
    needGuide: 'Для движения по пути выберите направляющую.',
    groupedHint: 'Группа — постоянный мотив. Alt+клик выбирает один элемент внутри группы.',
  },
  en: {
    title: 'Productivity',
    hint: 'Change a Repeat parameter to show a ghost preview. Copies are only committed with the button.',
    groupedPreview: 'The ghost preview treats the whole group as one motif.',
    multiplePreviewHidden: 'The ghost preview treats the temporary selection as one motif.',
    previewIdle: 'Preview is off. Change any Repeat parameter to show the result.',
    group: 'Group',
    ungroup: 'Ungroup',
    repeat: 'Repeat',
    linear: 'Linear',
    circular: 'Circular',
    guide: 'Along guide',
    copies: 'Copies',
    copiesInvalid: 'Enter a whole number from 1 to 100.',
    deltaX: 'ΔX',
    deltaY: 'ΔY',
    angle: 'Step °',
    spacing: 'Path gap',
    orientation: 'Orientation',
    keep: 'Keep',
    tangent: 'Tangent',
    radial: 'Radial',
    centerLabel: 'Center',
    guideLabel: 'Guide',
    selectionCenter: 'Selection center',
    noGuide: 'No guide',
    apply: 'Create copies',
    cancelPreview: 'Cancel preview',
    needSelection: 'Select one or more regular stitches.',
    needGuide: 'Choose a guide for along-guide repeat.',
    groupedHint: 'A group is a persistent motif. Alt+click selects one stitch inside it.',
  },
} as const

function guideName(guide: Guide, locale: Locale, index: number) {
  const name = guide.type === 'arc'
    ? locale === 'ru' ? 'Дуга' : 'Arc'
    : guide.type === 'line'
      ? locale === 'ru' ? 'Линия' : 'Line'
      : guide.type === 'curve'
        ? locale === 'ru' ? 'Кривая' : 'Curve'
        : guide.type === 'parabola'
          ? locale === 'ru' ? 'Парабола' : 'Parabola'
          : guide.type === 'grid'
            ? locale === 'ru' ? 'Сетка' : 'Grid'
            : locale === 'ru' ? 'Радиальная сетка' : 'Radial grid'
  return `${index + 1}. ${name}`
}

function previewGlyphs(elements: StitchElement[], className: string) {
  return elements.map((element) => (
    <g
      key={element.id}
      transform={`translate(${element.x} ${element.y}) rotate(${element.rotation})`}
      className={className}
    >
      <g
        className="symbol-glyph"
        transform={element.mirrored ? 'scale(-1 1)' : undefined}
        style={element.color ? { color: element.color } : undefined}
      >
        <SymbolGlyph symbolId={element.symbolId} />
      </g>
    </g>
  ))
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
  onDirectionalMirror,
  mirrorAxis,
  onConfigureMirrorAxis,
  onMirrorAxisChange,
  onCenterMirrorAxis,
  onHideMirrorAxis,
  onMirrorAtCustomAxis,
  onMirrorCopyAtCustomAxis,
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
  onDirectionalMirror: (direction: MirrorDirection, copy: boolean) => void
  mirrorAxis: MirrorAxisState | null
  onConfigureMirrorAxis: (angle: number) => void
  onMirrorAxisChange: (state: MirrorAxisState) => void
  onCenterMirrorAxis: () => void
  onHideMirrorAxis: () => void
  onMirrorAtCustomAxis: () => void
  onMirrorCopyAtCustomAxis: () => void
  onRepeat: (options: RepeatOptions) => void
}) {
  const copy = COPY[locale]
  const [mode, setMode] = useState<RepeatMode>('linear')
  const [copies, setCopies] = useState(5)
  const [copiesValid, setCopiesValid] = useState(true)
  const [deltaX, setDeltaX] = useState(48)
  const [deltaY, setDeltaY] = useState(0)
  const [angleStep, setAngleStep] = useState(45)
  const [spacing, setSpacing] = useState(48)
  const [orientation, setOrientation] = useState<GuideRepeatOrientation>('tangent')
  const [guideId, setGuideId] = useState('')
  const [repeatPreviewActive, setRepeatPreviewActive] = useState(false)
  const [previewDirection, setPreviewDirection] = useState<MirrorDirection | null>(null)
  const [previewTarget, setPreviewTarget] = useState<SVGGElement | null>(null)
  const selectionKey = useMemo(() => [...selectedIds].sort().join('|'), [selectedIds])

  useEffect(() => {
    setPreviewTarget(document.querySelector<SVGGElement>('.editor-canvas > g'))
  }, [])

  useEffect(() => {
    if (!guideId || guides.some((guide) => guide.id === guideId)) return
    setGuideId('')
  }, [guideId, guides])

  useEffect(() => {
    const defaults = repeatDefaults(elements, selectedIds)
    setDeltaX(defaults.deltaX)
    setDeltaY(defaults.deltaY)
    setSpacing(defaults.guideSpacing)
    setRepeatPreviewActive(false)
    setPreviewDirection(null)
  // Selection identity is the transaction boundary; element edits inside the same
  // selection must not overwrite spacing the user has already typed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionKey])

  useEffect(() => {
    if (!mirrorAxis) return
    setPreviewDirection(null)
    setRepeatPreviewActive(false)
  }, [mirrorAxis])

  const selectedGuide = useMemo(
    () => guides.find((guide) => guide.id === guideId) ?? null,
    [guideId, guides],
  )
  const needsGuide = mode === 'guide'
  const disabled = !canTransform || !copiesValid || (needsGuide && !selectedGuide)
  const previewSelectionKind = useMemo(
    () => repeatPreviewSelectionKind(elements, selectedIds),
    [elements, selectedIds],
  )
  const repeatPreviewEnabled = repeatPreviewActive && shouldShowRepeatPreview(previewSelectionKind)

  const activateRepeatPreview = () => {
    setRepeatPreviewActive(true)
    setPreviewDirection(null)
    if (mirrorAxis) onHideMirrorAxis()
  }

  const switchMode = (next: RepeatMode) => {
    setMode(next)
    activateRepeatPreview()
  }

  const options = useMemo<RepeatOptions | null>(() => {
    if (!copiesValid) return null
    if (mode === 'linear') return { mode, copies, deltaX, deltaY }
    if (mode === 'circular') {
      const center = selectedGuide ? guideCenter(selectedGuide) : undefined
      return { mode, copies, angleStep, center }
    }
    if (!selectedGuide) return null
    return { mode, copies, spacing, orientation, guide: selectedGuide }
  }, [angleStep, copies, copiesValid, deltaX, deltaY, mode, orientation, selectedGuide, spacing])

  const repeatPreviewElements = useMemo(() => {
    if (!canTransform || !options || !repeatPreviewEnabled) return []
    let index = 0
    return repeatSelection(elements, selectedIds, options, () => `__repeat-preview__:${index++}`)
  }, [canTransform, elements, options, repeatPreviewEnabled, selectedIds])

  const mirrorPreviewElements = useMemo(() => {
    if (!canTransform || !selectedIds.length) return []
    const selected = new Set(selectedIds)
    const transformed = mirrorAxis
      ? mirrorElementsAcrossLine(elements, selectedIds, mirrorAxis)
      : previewDirection
        ? mirrorElementsToward(elements, selectedIds, previewDirection)
        : []
    return transformed.filter((element) => selected.has(element.id) && !element.parametricRow)
  }, [canTransform, elements, mirrorAxis, previewDirection, selectedIds])

  const applyRepeat = () => {
    if (disabled || !options) return
    onRepeat(options)
    setRepeatPreviewActive(false)
  }

  const previewPortal = previewTarget && (repeatPreviewElements.length > 0 || mirrorPreviewElements.length > 0)
    ? createPortal(
        <g className="productivity-preview-layer" pointerEvents="none" aria-hidden="true">
          {repeatPreviewElements.length > 0 && (
            <g className="productivity-repeat-preview">
              {previewGlyphs(repeatPreviewElements, 'productivity-repeat-preview-stitch')}
            </g>
          )}
          {mirrorPreviewElements.length > 0 && (
            <g className="productivity-mirror-preview">
              {previewGlyphs(mirrorPreviewElements, 'productivity-mirror-preview-stitch')}
            </g>
          )}
        </g>,
        previewTarget,
      )
    : null

  const previewHint = !repeatPreviewActive
    ? copy.previewIdle
    : previewSelectionKind === 'single-group'
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

        <div className="productivity-actions">
          <button disabled={!canGroup} onClick={onGroup}>{copy.group}</button>
          <button disabled={!canUngroup} onClick={onUngroup}>{copy.ungroup}</button>
        </div>
        <small className="muted-text">{copy.groupedHint}</small>

        <MirrorControls
          locale={locale}
          canTransform={canTransform}
          state={mirrorAxis}
          previewDirection={previewDirection}
          onPreviewChange={(direction) => {
            setPreviewDirection(direction)
            if (direction) setRepeatPreviewActive(false)
          }}
          onDirectional={onDirectionalMirror}
          onPreset={(angle) => {
            setPreviewDirection(null)
            setRepeatPreviewActive(false)
            onConfigureMirrorAxis(angle)
          }}
          onStateChange={onMirrorAxisChange}
          onCenter={onCenterMirrorAxis}
          onHide={onHideMirrorAxis}
          onReflectCustom={onMirrorAtCustomAxis}
          onCopyCustom={onMirrorCopyAtCustomAxis}
        />

        <div className="productivity-block repeat-controls">
          <strong>{copy.repeat}</strong>
          <p className="productivity-hint">{previewHint}</p>
          <div className="productivity-mode-tabs">
            <button className={mode === 'linear' ? 'active' : ''} onClick={() => switchMode('linear')}>{copy.linear}</button>
            <button className={mode === 'circular' ? 'active' : ''} onClick={() => switchMode('circular')}>{copy.circular}</button>
            <button className={mode === 'guide' ? 'active' : ''} onClick={() => switchMode('guide')}>{copy.guide}</button>
          </div>

          <label className="productivity-field">
            <span>{copy.copies}</span>
            <DraftNumberInput
              ariaLabel={copy.copies}
              min={1}
              max={100}
              integer
              value={copies}
              onChange={(value) => {
                setCopies(value)
                activateRepeatPreview()
              }}
              onValidityChange={setCopiesValid}
            />
          </label>
          {!copiesValid && <small className="productivity-field-error" role="alert">{copy.copiesInvalid}</small>}

          {mode === 'linear' && (
            <div className="productivity-field-grid">
              <label className="productivity-field">
                <span>{copy.deltaX}</span>
                <DraftNumberInput ariaLabel={copy.deltaX} value={deltaX} onChange={(value) => { setDeltaX(value); activateRepeatPreview() }} />
              </label>
              <label className="productivity-field">
                <span>{copy.deltaY}</span>
                <DraftNumberInput ariaLabel={copy.deltaY} value={deltaY} onChange={(value) => { setDeltaY(value); activateRepeatPreview() }} />
              </label>
            </div>
          )}

          {mode === 'circular' && (
            <>
              <label className="productivity-field">
                <span>{copy.centerLabel}</span>
                <select value={guideId} onChange={(event) => { setGuideId(event.target.value); activateRepeatPreview() }}>
                  <option value="">{copy.selectionCenter}</option>
                  {guides.map((guide, index) => <option key={guide.id} value={guide.id}>{guideName(guide, locale, index)}</option>)}
                </select>
              </label>
              <label className="productivity-field">
                <span>{copy.angle}</span>
                <DraftNumberInput ariaLabel={copy.angle} step={1} value={angleStep} onChange={(value) => { setAngleStep(value); activateRepeatPreview() }} />
              </label>
            </>
          )}

          {mode === 'guide' && (
            <>
              <label className="productivity-field">
                <span>{copy.guideLabel}</span>
                <select value={guideId} onChange={(event) => { setGuideId(event.target.value); activateRepeatPreview() }}>
                  <option value="">{copy.noGuide}</option>
                  {guides.map((guide, index) => <option key={guide.id} value={guide.id}>{guideName(guide, locale, index)}</option>)}
                </select>
              </label>
              <label className="productivity-field">
                <span>{copy.spacing}</span>
                <DraftNumberInput ariaLabel={copy.spacing} min={0} step={1} value={spacing} onChange={(value) => { setSpacing(value); activateRepeatPreview() }} />
              </label>
              <label className="productivity-field">
                <span>{copy.orientation}</span>
                <select value={orientation} onChange={(event) => { setOrientation(event.target.value as GuideRepeatOrientation); activateRepeatPreview() }}>
                  <option value="keep">{copy.keep}</option>
                  <option value="tangent">{copy.tangent}</option>
                  <option value="radial">{copy.radial}</option>
                </select>
              </label>
            </>
          )}

          {!canTransform && <small className="productivity-warning">{copy.needSelection}</small>}
          {canTransform && needsGuide && !selectedGuide && <small className="productivity-warning">{copy.needGuide}</small>}
          <div className="productivity-actions repeat-transaction-actions">
            <button className="productivity-apply" disabled={disabled} onClick={applyRepeat}>{copy.apply}</button>
            <button disabled={!repeatPreviewActive} onClick={() => setRepeatPreviewActive(false)}>{copy.cancelPreview}</button>
          </div>
        </div>
      </section>
    </>
  )
}

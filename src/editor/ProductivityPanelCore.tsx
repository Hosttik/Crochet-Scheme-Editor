import { useEffect, useMemo, useRef, useState } from 'react'
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
import { resolvedStitchGeometry } from './stitchGeometry'
import type { MirrorAxisState } from './MirrorAxisOverlay'
import { MirrorControls } from './MirrorControls'
import {
  loadAuthoringPreferences,
  saveAuthoringPreferences,
  validAngleStep,
  validCopyCount,
  validGuideOrientation,
  validRepeatMode,
} from './authoringPreferences'
import './productivity.css'

const COPY = {
  ru: {
    title: 'Ускорители',
    hint: 'Измените параметры копирования, чтобы увидеть предпросмотр. Копии создаются только по кнопке.',
    groupedPreview: 'Группа считается одним объектом: предпросмотр показывает весь мотив.',
    multiplePreviewHidden: 'Выбрано несколько элементов: предпросмотр показывает весь временный мотив.',
    previewIdle: 'Предпросмотр выключен. Измените любой параметр копирования, чтобы показать результат.',
    group: 'Группировать',
    ungroup: 'Разгруппировать',
    repeat: 'Копирование',
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
    needGuide: 'Для копирования по пути выберите направляющую.',
    groupedHint: 'Группа — постоянный мотив. Alt+клик выбирает один элемент внутри группы.',
  },
  en: {
    title: 'Productivity',
    hint: 'Change a copy parameter to show the preview. Copies are only committed with the button.',
    groupedPreview: 'A group is treated as one object: the preview shows the whole motif.',
    multiplePreviewHidden: 'Multiple stitches are selected: the preview shows the whole temporary motif.',
    previewIdle: 'Preview is off. Change any copy parameter to show the result.',
    group: 'Group',
    ungroup: 'Ungroup',
    repeat: 'Copy',
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
    needGuide: 'Choose a guide for copying along a path.',
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
  return elements.map((element) => {
    const geometry = resolvedStitchGeometry(element)
    const scaleX = (element.mirrored ? -1 : 1) * geometry.scaleX
    return (
      <g
        key={element.id}
        transform={`translate(${element.x} ${element.y}) rotate(${element.rotation})`}
        className={className}
        data-scale-x={geometry.scaleX}
        data-scale-y={geometry.scaleY}
        data-spread={geometry.spread}
      >
        <g
          className="symbol-glyph"
          transform={`scale(${scaleX} ${geometry.scaleY})`}
          style={element.color ? { color: element.color } : undefined}
        >
          <SymbolGlyph symbolId={element.symbolId} spread={geometry.spread} />
        </g>
      </g>
    )
  })
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
  suppressAutoRepeatPreview = false,
  previewTarget = null,
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
  suppressAutoRepeatPreview?: boolean
  previewTarget?: SVGGElement | null
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
  const storedPreferences = useRef(loadAuthoringPreferences()).current
  const [mode, setMode] = useState<RepeatMode>(() => validRepeatMode(storedPreferences.copyMode))
  const [copies, setCopies] = useState(() => validCopyCount(storedPreferences.copyCount))
  const [copiesValid, setCopiesValid] = useState(true)
  const [deltaX, setDeltaX] = useState(48)
  const [deltaY, setDeltaY] = useState(0)
  const [angleStep, setAngleStep] = useState(() => validAngleStep(storedPreferences.circularAngleStep))
  const [spacing, setSpacing] = useState(48)
  const [orientation, setOrientation] = useState<GuideRepeatOrientation>(() => validGuideOrientation(storedPreferences.guideOrientation))
  const [guideId, setGuideId] = useState('')
  const [repeatPreviewActive, setRepeatPreviewActive] = useState(false)
  const [previewDirection, setPreviewDirection] = useState<MirrorDirection | null>(null)
  const suppressNextSelectionPreview = useRef(false)
  const repeatDefaultsDirty = useRef({ deltaX: false, deltaY: false, spacing: false })
  const selectionKey = useMemo(() => [...selectedIds].sort().join('|'), [selectedIds])
  const selectionDefaultsKey = useMemo(() => {
    const selected = new Set(selectedIds)
    return elements
      .filter((element) => selected.has(element.id) && !element.parametricRow)
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((element) => [
        element.id,
        element.x,
        element.y,
        element.rotation,
        element.geometry?.scaleX ?? 1,
        element.geometry?.scaleY ?? 1,
        element.geometry?.spread ?? 1,
      ].join(':'))
      .join('|')
  }, [elements, selectedIds])

  useEffect(() => {
    saveAuthoringPreferences({
      copyMode: mode,
      copyCount: copies,
      circularAngleStep: angleStep,
      guideOrientation: orientation,
    })
  }, [angleStep, copies, mode, orientation])

  useEffect(() => {
    if (!guideId || guides.some((guide) => guide.id === guideId)) return
    setGuideId('')
  }, [guideId, guides])

  useEffect(() => {
    repeatDefaultsDirty.current = { deltaX: false, deltaY: false, spacing: false }
    const defaults = repeatDefaults(elements, selectedIds)
    setDeltaX(defaults.deltaX)
    setDeltaY(defaults.deltaY)
    setSpacing(defaults.guideSpacing)
    const suppressAutoPreview = suppressNextSelectionPreview.current
    suppressNextSelectionPreview.current = false
    // Keep the first single-stitch placement clean. Multi-selection keeps a live
    // motif preview except when that selection was just created by Copy/Mirror.
    setRepeatPreviewActive(!suppressAutoPreview && !suppressAutoRepeatPreview && !mirrorAxis && selectedIds.length > 1)
    setPreviewDirection(null)
  // Selection identity is the transaction boundary for geometry-derived defaults.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionKey])

  useEffect(() => {
    const defaults = repeatDefaults(elements, selectedIds)
    const dirty = repeatDefaultsDirty.current
    if (!dirty.deltaX) setDeltaX(defaults.deltaX)
    if (!dirty.deltaY) setDeltaY(defaults.deltaY)
    if (!dirty.spacing) setSpacing(defaults.guideSpacing)
  // Geometry/relative-position edits refresh untouched defaults, while manual fields stay sticky.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionDefaultsKey])

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
  const repeatPreviewEnabled = repeatPreviewActive && !mirrorAxis && !previewDirection && shouldShowRepeatPreview(previewSelectionKind)

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
    suppressNextSelectionPreview.current = true
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
          onDirectional={(direction, makeCopy) => {
            if (makeCopy) suppressNextSelectionPreview.current = true
            onDirectionalMirror(direction, makeCopy)
          }}
          onPreset={(angle) => {
            setPreviewDirection(null)
            setRepeatPreviewActive(false)
            onConfigureMirrorAxis(angle)
          }}
          onStateChange={onMirrorAxisChange}
          onCenter={onCenterMirrorAxis}
          onHide={onHideMirrorAxis}
          onReflectCustom={onMirrorAtCustomAxis}
          onCopyCustom={() => {
            suppressNextSelectionPreview.current = true
            onMirrorCopyAtCustomAxis()
          }}
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
                <DraftNumberInput ariaLabel={copy.deltaX} value={deltaX} onChange={(value) => { repeatDefaultsDirty.current.deltaX = true; setDeltaX(value); activateRepeatPreview() }} />
              </label>
              <label className="productivity-field">
                <span>{copy.deltaY}</span>
                <DraftNumberInput ariaLabel={copy.deltaY} value={deltaY} onChange={(value) => { repeatDefaultsDirty.current.deltaY = true; setDeltaY(value); activateRepeatPreview() }} />
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
                <DraftNumberInput ariaLabel={copy.spacing} min={0} step={1} value={spacing} onChange={(value) => { repeatDefaultsDirty.current.spacing = true; setSpacing(value); activateRepeatPreview() }} />
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

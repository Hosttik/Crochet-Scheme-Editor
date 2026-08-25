import { useEffect, useMemo, useState } from 'react'
import type { Guide } from '../types'
import type { Locale } from '../i18n'
import type { RepeatMode, RepeatOptions, GuideRepeatOrientation } from './productivity'
import './productivity.css'

const COPY = {
  ru: {
    title: 'Ускорители',
    hint: 'Группируйте мотив и размножайте его за несколько действий.',
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
    guideLabel: 'Направляющая / центр',
    noGuide: 'Нет направляющей',
    apply: 'Создать копии',
    needSelection: 'Выберите один или несколько обычных элементов.',
    needGuide: 'Для этого режима выберите направляющую.',
    groupedHint: 'Alt+клик выбирает один элемент внутри группы.',
  },
  en: {
    title: 'Productivity',
    hint: 'Group a motif and repeat it in a few actions.',
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
    guideLabel: 'Guide / center',
    noGuide: 'No guide',
    apply: 'Create copies',
    needSelection: 'Select one or more regular stitches.',
    needGuide: 'Choose a guide for this mode.',
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
  const [guideId, setGuideId] = useState(guides[0]?.id ?? '')

  useEffect(() => {
    if (guideId && guides.some((guide) => guide.id === guideId)) return
    setGuideId(guides[0]?.id ?? '')
  }, [guideId, guides])

  const selectedGuide = useMemo(
    () => guides.find((guide) => guide.id === guideId) ?? null,
    [guideId, guides],
  )
  const needsGuide = mode === 'guide' || mode === 'circular'
  const disabled = !canTransform || (needsGuide && !selectedGuide)

  const apply = () => {
    if (disabled) return
    if (mode === 'linear') {
      onRepeat({ mode, copies, deltaX, deltaY })
      return
    }
    if (mode === 'circular') {
      if (!selectedGuide) return
      const center = selectedGuide.type === 'grid' ? selectedGuide.origin : selectedGuide.center
      onRepeat({ mode, copies, angleStep, center })
      return
    }
    if (!selectedGuide) return
    onRepeat({ mode, copies, spacing, orientation, guide: selectedGuide })
  }

  return (
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

        {(mode === 'circular' || mode === 'guide') && (
          <label className="productivity-field">
            <span>{copy.guideLabel}</span>
            <select value={guideId} onChange={(event) => setGuideId(event.target.value)}>
              {!guides.length && <option value="">{copy.noGuide}</option>}
              {guides.map((guide, index) => <option key={guide.id} value={guide.id}>{guideName(guide, locale, index)}</option>)}
            </select>
          </label>
        )}

        {mode === 'circular' && (
          <label className="productivity-field"><span>{copy.angle}</span><input type="number" step="1" value={angleStep} onChange={(event) => setAngleStep(Number(event.target.value) || 0)} /></label>
        )}

        {mode === 'guide' && (
          <>
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
  )
}

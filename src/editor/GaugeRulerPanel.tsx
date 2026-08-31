import { useEffect, useMemo } from 'react'
import type { GaugeProfile, GaugeSettings, MeasurementRuler, StitchElement } from '../types'
import { symbolName } from '../i18n'
import { STITCH_SYMBOLS } from '../symbols'
import { DraftNumberInput } from './DraftNumberInput'
import {
  gaugeProfileById,
  patternHeightEstimateCm,
  rowHeightCm,
  rowLengthEstimateCm,
  rulerDisplayLabel,
  rulerEstimate,
  stitchWidthCm,
} from './gauge'
import { clearRulerLayers, publishRulerLayers } from './rulerLayersStore'

function format(value: number, locale: 'ru' | 'en') {
  return new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
    maximumFractionDigits: 2,
  }).format(value)
}

function isEditingTarget(target: EventTarget | null) {
  const element = target instanceof HTMLElement ? target : null
  return Boolean(element && (element.matches('input, textarea, select') || element.isContentEditable))
}

export function GaugeRulerPanel({
  locale,
  gauge,
  rulers,
  selectedRulerId,
  placingRuler,
  elements,
  selectedRowId,
  selectedRowIsCircular,
  onAddProfile,
  onUpdateProfile,
  onDeleteProfile,
  onActiveProfileChange,
  onToggleRulerTool,
  onSelectRuler,
  onUpdateRuler,
  onDeleteRuler,
}: {
  locale: 'ru' | 'en'
  gauge: GaugeSettings
  rulers: MeasurementRuler[]
  selectedRulerId: string | null
  placingRuler: boolean
  elements: StitchElement[]
  selectedRowId?: string | null
  selectedRowIsCircular?: boolean
  onAddProfile: () => void
  onUpdateProfile: (id: string, patch: Partial<GaugeProfile>) => void
  onDeleteProfile: (id: string) => void
  onActiveProfileChange: (id: string) => void
  onToggleRulerTool: () => void
  onSelectRuler: (id: string) => void
  onUpdateRuler: (id: string, patch: Partial<MeasurementRuler>) => void
  onDeleteRuler: (id: string) => void
}) {
  const ru = locale === 'ru'
  const activeProfile = gaugeProfileById(gauge)
  const selectedRuler = rulers.find((ruler) => ruler.id === selectedRulerId)
  const selectedRulerLocked = selectedRuler?.locked === true
  const rowLength = selectedRowId && activeProfile
    ? rowLengthEstimateCm(elements, selectedRowId, activeProfile)
    : null
  const selectedRowCount = selectedRowId
    ? elements.filter((element) => element.parametricRow?.id === selectedRowId).length
    : 0
  const patternHeight = activeProfile ? patternHeightEstimateCm(elements, activeProfile) : null
  const measurementToolLabel = placingRuler
    ? (ru ? 'Отменить измерение' : 'Cancel measurement')
    : (ru ? 'Новая область измерения' : 'New measurement region')
  const layerActions = useMemo(() => ({
    select: onSelectRuler,
    update: onUpdateRuler,
    delete: (id: string) => {
      const ruler = rulers.find((item) => item.id === id)
      if (!ruler || ruler.locked === true) return
      onDeleteRuler(id)
    },
  }), [onDeleteRuler, onSelectRuler, onUpdateRuler, rulers])

  useEffect(() => {
    publishRulerLayers({ rulers, selectedRulerId, actions: layerActions })
    return () => clearRulerLayers(layerActions)
  }, [layerActions, rulers, selectedRulerId])

  // ApplicationCommandShortcuts owns Delete/Backspace at document level. A
  // locked measurement must be protected before that command reaches App.
  useEffect(() => {
    if (!selectedRulerLocked) return
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.key !== 'Delete' && event.key !== 'Backspace') || isEditingTarget(event.target)) return
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [selectedRulerLocked])

  return (
    <section className="panel-section gauge-panel">
      <div className="section-title-row">
        <h2>{ru ? 'Плотность и размер' : 'Gauge & size'}</h2>
        <span className="muted-text">cm</span>
      </div>
      <p className="gauge-intro">
        {ru
          ? 'Введите реальный образец: сколько петель и рядов получилось в измеренной ширине и высоте.'
          : 'Enter a real swatch: stitch and row counts for its measured width and height.'}
      </p>

      {!gauge.profiles.length ? (
        <button className="primary-button gauge-add-button" onClick={onAddProfile}>
          {ru ? 'Добавить образец плотности' : 'Add gauge swatch'}
        </button>
      ) : (
        <>
          <label className="gauge-field">
            <span>{ru ? 'Активный образец' : 'Active swatch'}</span>
            <select
              aria-label={ru ? 'Активный образец' : 'Active swatch'}
              value={activeProfile?.id ?? ''}
              onChange={(event) => onActiveProfileChange(event.target.value)}
            >
              {gauge.profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>{profile.name}</option>
              ))}
            </select>
          </label>

          {activeProfile && (
            <div className="gauge-profile-editor">
              <label className="gauge-field">
                <span>{ru ? 'Название' : 'Name'}</span>
                <input
                  aria-label={ru ? 'Название образца' : 'Swatch name'}
                  value={activeProfile.name}
                  onChange={(event) => onUpdateProfile(activeProfile.id, { name: event.target.value })}
                />
              </label>
              <label className="gauge-field">
                <span>{ru ? 'Основной элемент' : 'Primary stitch'}</span>
                <select
                  aria-label={ru ? 'Основной элемент образца' : 'Swatch primary stitch'}
                  value={activeProfile.symbolId}
                  onChange={(event) => onUpdateProfile(activeProfile.id, { symbolId: event.target.value })}
                >
                  {STITCH_SYMBOLS.map((symbol) => (
                    <option key={symbol.id} value={symbol.id}>
                      {symbol.abbreviation ? `${symbol.abbreviation} · ` : ''}{symbolName(symbol.id, symbol.name, locale)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="gauge-number-grid">
                <label>
                  <span>{ru ? 'Петель' : 'Stitches'}</span>
                  <DraftNumberInput
                    value={activeProfile.stitchCount}
                    min={1}
                    max={10000}
                    step={1}
                    commitOnBlur
                    ariaLabel={ru ? 'Петель в образце' : 'Stitches in swatch'}
                    onChange={(value) => onUpdateProfile(activeProfile.id, { stitchCount: Math.max(1, Math.round(value)) })}
                  />
                </label>
                <label>
                  <span>{ru ? 'Ширина, см' : 'Width, cm'}</span>
                  <DraftNumberInput
                    value={activeProfile.widthCm}
                    min={0.1}
                    max={10000}
                    step={0.1}
                    commitOnBlur
                    ariaLabel={ru ? 'Ширина образца в сантиметрах' : 'Swatch width in centimeters'}
                    onChange={(value) => onUpdateProfile(activeProfile.id, { widthCm: value })}
                  />
                </label>
                <label>
                  <span>{ru ? 'Рядов' : 'Rows'}</span>
                  <DraftNumberInput
                    value={activeProfile.rowCount}
                    min={1}
                    max={10000}
                    step={1}
                    commitOnBlur
                    ariaLabel={ru ? 'Рядов в образце' : 'Rows in swatch'}
                    onChange={(value) => onUpdateProfile(activeProfile.id, { rowCount: Math.max(1, Math.round(value)) })}
                  />
                </label>
                <label>
                  <span>{ru ? 'Высота, см' : 'Height, cm'}</span>
                  <DraftNumberInput
                    value={activeProfile.heightCm}
                    min={0.1}
                    max={10000}
                    step={0.1}
                    commitOnBlur
                    ariaLabel={ru ? 'Высота образца в сантиметрах' : 'Swatch height in centimeters'}
                    onChange={(value) => onUpdateProfile(activeProfile.id, { heightCm: value })}
                  />
                </label>
              </div>

              <div className="gauge-derived">
                <strong>{ru ? 'Расчётная плотность' : 'Calculated gauge'}</strong>
                <span>
                  {format(10 / stitchWidthCm(activeProfile), locale)} {ru ? 'п. / 10 см' : 'sts / 10 cm'} · {' '}
                  {format(10 / rowHeightCm(activeProfile), locale)} {ru ? 'р. / 10 см' : 'rows / 10 cm'}
                </span>
              </div>

              <div className="gauge-profile-actions">
                <button onClick={onAddProfile}>{ru ? '+ Ещё образец' : '+ Another swatch'}</button>
                <button className="danger-button" onClick={() => onDeleteProfile(activeProfile.id)}>
                  {ru ? 'Удалить образец' : 'Delete swatch'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <div className="gauge-estimates">
        <strong>{ru ? 'Расчёт схемы' : 'Pattern estimate'}</strong>
        {selectedRowId ? (
          activeProfile && rowLength != null ? (
            <div className="gauge-estimate-card">
              <span>{ru ? `Выбранный ряд: ${selectedRowCount} петель` : `Selected row: ${selectedRowCount} stitches`}</span>
              <b>≈ {format(rowLength, locale)} {ru ? 'см' : 'cm'}</b>
              {selectedRowIsCircular && (
                <small>{ru ? 'Расчётный диаметр' : 'Estimated diameter'}: ≈ {format(rowLength / Math.PI, locale)} {ru ? 'см' : 'cm'}</small>
              )}
            </div>
          ) : (
            <small>{ru ? 'Добавьте образец плотности, чтобы получить длину выбранного ряда.' : 'Add a gauge swatch to estimate the selected row.'}</small>
          )
        ) : (
          <small>{ru ? 'Выберите параметрический ряд — здесь появится его примерная длина.' : 'Select a parametric row to see its estimated length.'}</small>
        )}
        {patternHeight != null && (
          <span className="gauge-pattern-height">
            {ru ? 'Высота всех параметрических рядов' : 'All parametric rows height'}: ≈ {format(patternHeight, locale)} {ru ? 'см' : 'cm'}
          </span>
        )}
      </div>

      <div className="gauge-ruler-section">
        <div className="section-title-row gauge-ruler-heading">
          <h3>{ru ? 'Измерение по схеме' : 'Chart measurement'}</h3>
          <span className="muted-text">{rulers.length}</span>
        </div>
        <button
          className={`tool-button gauge-ruler-tool ${placingRuler ? 'active' : ''}`}
          onClick={onToggleRulerTool}
          aria-pressed={placingRuler}
          aria-label={measurementToolLabel}
        >
          <span>↔</span>{measurementToolLabel}<kbd>R</kbd>
        </button>
        <small className="muted-text gauge-ruler-instruction">
          {ru
            ? 'Проведите линию через нужные петли/столбики. Считаются только точки постановки элементов внутри полупрозрачной области — форма и высота символа на результат не влияют.'
            : 'Draw through the stitches/columns you want to measure. Only element anchor points inside the translucent region are counted; glyph shape and height do not affect the result.'}
        </small>

        {rulers.length > 0 && (
          <div className="ruler-list">
            {rulers.map((ruler, index) => (
              <button
                key={ruler.id}
                className={`${ruler.id === selectedRulerId ? 'active' : ''} ${ruler.visible === false ? 'hidden' : ''} ${ruler.locked === true ? 'locked' : ''}`}
                onClick={() => onSelectRuler(ruler.id)}
              >
                <span>{index + 1}.</span>
                <span>{rulerDisplayLabel(ruler, elements, gauge, locale)}</span>
                {(ruler.visible === false || ruler.locked === true) && (
                  <small>
                    {ruler.visible === false ? (ru ? 'скрыта' : 'hidden') : ''}
                    {ruler.visible === false && ruler.locked === true ? ' · ' : ''}
                    {ruler.locked === true ? (ru ? 'заблокирована' : 'locked') : ''}
                  </small>
                )}
              </button>
            ))}
          </div>
        )}

        {selectedRuler && (() => {
          const estimate = rulerEstimate(selectedRuler, elements, gauge)
          const count = estimate.mode === 'rows' ? estimate.rowCount ?? 0 : estimate.stitchCount ?? 0
          return (
            <div className={`ruler-editor ${selectedRulerLocked ? 'locked' : ''}`}>
              <strong>{ru ? 'Выбранная область' : 'Selected region'}</strong>
              {selectedRulerLocked && (
                <small className="muted-text">
                  {ru ? 'Линейка заблокирована. Разблокируйте её во вкладке «Слои», чтобы изменить или удалить.' : 'This ruler is locked. Unlock it in Layers to edit or delete it.'}
                </small>
              )}
              <label className="gauge-field">
                <span>{ru ? 'Что считать' : 'Count as'}</span>
                <select
                  aria-label={ru ? 'Тип измерения' : 'Measurement type'}
                  value={selectedRuler.mode ?? 'stitches'}
                  disabled={selectedRulerLocked}
                  onChange={(event) => onUpdateRuler(selectedRuler.id, {
                    mode: event.target.value as 'stitches' | 'rows',
                  })}
                >
                  <option value="stitches">{ru ? 'Петли / столбики → ширина' : 'Stitches / columns → width'}</option>
                  <option value="rows">{ru ? 'Ряды → высота' : 'Rows → height'}</option>
                </select>
              </label>
              <label className="gauge-field">
                <span>{ru ? 'Образец для сантиметров' : 'Gauge swatch for centimeters'}</span>
                <select
                  aria-label={ru ? 'Образец линейки' : 'Ruler gauge swatch'}
                  value={selectedRuler.profileId ?? ''}
                  disabled={selectedRulerLocked}
                  onChange={(event) => onUpdateRuler(selectedRuler.id, { profileId: event.target.value || undefined })}
                >
                  <option value="">{ru ? 'Активный образец' : 'Active swatch'}</option>
                  {gauge.profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>{profile.name}</option>
                  ))}
                </select>
              </label>

              <div className="ruler-result" data-testid="ruler-auto-summary">
                <strong>
                  {estimate.mode === 'rows'
                    ? (ru ? `${count} ряд.` : `${count} rows`)
                    : (ru ? `${count} п./ст.` : `${count} sts/cols`)}
                </strong>
                {estimate.lengthCm != null ? (
                  <b>≈ {format(estimate.lengthCm, locale)} {ru ? 'см' : 'cm'}</b>
                ) : (
                  <small>{ru ? 'Добавьте образец плотности для пересчёта в сантиметры.' : 'Add a gauge swatch to convert the count to centimeters.'}</small>
                )}
                <small>
                  {ru
                    ? `В области: ${estimate.elementIds?.length ?? 0} точек элементов${estimate.mode === 'rows' && estimate.rowIds?.length ? ` · семантических рядов: ${estimate.rowIds.length}` : ''}`
                    : `In region: ${estimate.elementIds?.length ?? 0} element anchors${estimate.mode === 'rows' && estimate.rowIds?.length ? ` · semantic rows: ${estimate.rowIds.length}` : ''}`}
                </small>
              </div>

              <small className="muted-text">
                {selectedRulerLocked
                  ? (ru ? 'Заблокированная линейка остаётся на месте и не реагирует на ручки.' : 'A locked ruler stays in place and its handles are disabled.')
                  : (ru ? 'Delete / Backspace — удалить. Потяните круглые ручки, чтобы изменить границы.' : 'Delete / Backspace removes it. Drag the round handles to resize it.')}
              </small>
              <button className="danger-button" disabled={selectedRulerLocked} onClick={() => onDeleteRuler(selectedRuler.id)}>
                {ru ? 'Удалить измерение' : 'Delete measurement'}
              </button>
            </div>
          )
        })()}
      </div>
    </section>
  )
}

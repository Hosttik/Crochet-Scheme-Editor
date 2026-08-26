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

function format(value: number, locale: 'ru' | 'en') {
  return new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
    maximumFractionDigits: 2,
  }).format(value)
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
  const rowLength = selectedRowId && activeProfile
    ? rowLengthEstimateCm(elements, selectedRowId, activeProfile)
    : null
  const selectedRowCount = selectedRowId
    ? elements.filter((element) => element.parametricRow?.id === selectedRowId).length
    : 0
  const patternHeight = activeProfile ? patternHeightEstimateCm(elements, activeProfile) : null

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
          <h3>{ru ? 'Линейки' : 'Rulers'}</h3>
          <span className="muted-text">{rulers.length}</span>
        </div>
        <button
          className={`tool-button gauge-ruler-tool ${placingRuler ? 'active' : ''}`}
          onClick={onToggleRulerTool}
          aria-pressed={placingRuler}
        >
          <span>↔</span>{placingRuler ? (ru ? 'Отменить линейку' : 'Cancel ruler') : (ru ? 'Поставить линейку' : 'Place ruler')}<kbd>R</kbd>
        </button>
        <small className="muted-text">
          {ru
            ? 'Две точки. В режиме петель считаются петли одного ряда; в режиме рядов — семантические ряды между точками.'
            : 'Pick two points. Stitch mode counts one row; row mode counts semantic rows between endpoints.'}
        </small>

        {rulers.length > 0 && (
          <div className="ruler-list">
            {rulers.map((ruler, index) => (
              <button
                key={ruler.id}
                className={ruler.id === selectedRulerId ? 'active' : ''}
                onClick={() => onSelectRuler(ruler.id)}
              >
                <span>{index + 1}.</span>
                <span>{rulerDisplayLabel(ruler, elements, gauge, locale)}</span>
              </button>
            ))}
          </div>
        )}

        {selectedRuler && (
          <div className="ruler-editor">
            <strong>{ru ? 'Выбранная линейка' : 'Selected ruler'}</strong>
            <label className="gauge-field">
              <span>{ru ? 'Тип измерения' : 'Measurement type'}</span>
              <select
                aria-label={ru ? 'Тип измерения' : 'Measurement type'}
                value={selectedRuler.mode ?? 'stitches'}
                onChange={(event) => onUpdateRuler(selectedRuler.id, {
                  mode: event.target.value as 'stitches' | 'rows',
                })}
              >
                <option value="stitches">{ru ? 'Петли → ширина' : 'Stitches → width'}</option>
                <option value="rows">{ru ? 'Ряды → высота' : 'Rows → height'}</option>
              </select>
            </label>
            <label className="gauge-field">
              <span>{ru ? 'Образец для расчёта' : 'Gauge swatch'}</span>
              <select
                aria-label={ru ? 'Образец линейки' : 'Ruler gauge swatch'}
                value={selectedRuler.profileId ?? ''}
                onChange={(event) => onUpdateRuler(selectedRuler.id, { profileId: event.target.value || undefined })}
              >
                <option value="">{ru ? 'Активный образец' : 'Active swatch'}</option>
                {gauge.profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>{profile.name}</option>
                ))}
              </select>
            </label>
            {(selectedRuler.mode ?? 'stitches') === 'rows' ? (
              <label className="gauge-field">
                <span>{ru ? 'Рядов вручную (0 = авто)' : 'Manual rows (0 = auto)'}</span>
                <DraftNumberInput
                  value={selectedRuler.manualRowCount ?? 0}
                  min={0}
                  max={20000}
                  step={1}
                  commitOnBlur
                  ariaLabel={ru ? 'Рядов линейки вручную' : 'Manual ruler row count'}
                  onChange={(value) => onUpdateRuler(selectedRuler.id, {
                    manualRowCount: value > 0 ? Math.round(value) : undefined,
                  })}
                />
              </label>
            ) : (
              <label className="gauge-field">
                <span>{ru ? 'Петель вручную (0 = авто)' : 'Manual stitches (0 = auto)'}</span>
                <DraftNumberInput
                  value={selectedRuler.manualStitchCount ?? 0}
                  min={0}
                  max={20000}
                  step={1}
                  commitOnBlur
                  ariaLabel={ru ? 'Петель линейки вручную' : 'Manual ruler stitch count'}
                  onChange={(value) => onUpdateRuler(selectedRuler.id, {
                    manualStitchCount: value > 0 ? Math.round(value) : undefined,
                  })}
                />
              </label>
            )}
            {(() => {
              const estimate = rulerEstimate(selectedRuler, elements, gauge)
              if (estimate.mode === 'rows') {
                if (estimate.source === 'automatic' && estimate.rowCount) {
                  return <small>{ru ? `Автоматически между рядами: ${estimate.rowCount} р.` : `Automatic between rows: ${estimate.rowCount} rows`}</small>
                }
                if (estimate.source === 'manual' && estimate.rowCount) {
                  return <small>{ru ? `Ручной расчёт: ${estimate.rowCount} р.` : `Manual count: ${estimate.rowCount} rows`}</small>
                }
                return <small>{ru ? 'Привяжите точки к параметрическим рядам или укажите число рядов вручную.' : 'Snap endpoints to parametric rows or enter the row count manually.'}</small>
              }
              if (estimate.source === 'automatic' && estimate.stitchCount) {
                return <small>{ru ? `Автоматически по ряду: ${estimate.stitchCount} петель` : `Automatic from row: ${estimate.stitchCount} stitches`}</small>
              }
              if (estimate.source === 'manual' && estimate.stitchCount) {
                return <small>{ru ? `Ручной расчёт: ${estimate.stitchCount} петель` : `Manual count: ${estimate.stitchCount} stitches`}</small>
              }
              return <small>{ru ? 'Для свободной линейки укажите число петель вручную.' : 'For a free ruler, enter the stitch count manually.'}</small>
            })()}
            <button className="danger-button" onClick={() => onDeleteRuler(selectedRuler.id)}>
              {ru ? 'Удалить линейку' : 'Delete ruler'}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f"Expected snippet not found in {path}: {old[:120]!r}")
    file.write_text(text.replace(old, new, 1))


def write(path: str, content: str) -> None:
    file = Path(path)
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text(content)


write("src/editor/gauge.ts", r"""import type { GaugeProfile, GaugeSettings, MeasurementRuler, Point, StitchElement } from '../types'

export function emptyGaugeSettings(): GaugeSettings {
  return { profiles: [] }
}

export function gaugeProfileById(gauge: GaugeSettings, profileId?: string) {
  if (profileId) {
    const explicit = gauge.profiles.find((profile) => profile.id === profileId)
    if (explicit) return explicit
  }
  if (gauge.activeProfileId) {
    const active = gauge.profiles.find((profile) => profile.id === gauge.activeProfileId)
    if (active) return active
  }
  return gauge.profiles[0]
}

export function stitchWidthCm(profile: GaugeProfile) {
  return profile.widthCm / profile.stitchCount
}

export function rowHeightCm(profile: GaugeProfile) {
  return profile.heightCm / profile.rowCount
}

export function rowLengthEstimateCm(elements: StitchElement[], rowId: string, profile: GaugeProfile) {
  const count = elements.filter((element) => element.parametricRow?.id === rowId).length
  return count ? count * stitchWidthCm(profile) : null
}

export function patternHeightEstimateCm(elements: StitchElement[], profile: GaugeProfile) {
  const rowIds = new Set(
    elements.flatMap((element) => element.parametricRow?.id ? [element.parametricRow.id] : []),
  )
  return rowIds.size ? rowIds.size * rowHeightCm(profile) : null
}

export function snapRulerPoint(
  point: Point,
  elements: StitchElement[],
  zoom: number,
  maxScreenDistance = 18,
): { point: Point; elementId?: string } {
  const maxDistance = maxScreenDistance / Math.max(zoom, 0.01)
  let best: StitchElement | undefined
  let bestDistance = maxDistance
  for (const element of elements) {
    if (element.visible === false) continue
    const distance = Math.hypot(element.x - point.x, element.y - point.y)
    if (distance <= bestDistance) {
      best = element
      bestDistance = distance
    }
  }
  return best
    ? { point: { x: best.x, y: best.y }, elementId: best.id }
    : { point }
}

function automaticRulerStitchCount(ruler: MeasurementRuler, elements: StitchElement[]) {
  if (!ruler.startElementId || !ruler.endElementId) return null
  const start = elements.find((element) => element.id === ruler.startElementId)
  const end = elements.find((element) => element.id === ruler.endElementId)
  const rowId = start?.parametricRow?.id
  if (!start || !end || !rowId || end.parametricRow?.id !== rowId) return null
  const row = elements.filter((element) => element.parametricRow?.id === rowId)
  const startIndex = row.findIndex((element) => element.id === start.id)
  const endIndex = row.findIndex((element) => element.id === end.id)
  if (startIndex < 0 || endIndex < 0) return null
  return { count: Math.abs(endIndex - startIndex) + 1, rowId }
}

export type RulerEstimate = {
  profile?: GaugeProfile
  stitchCount?: number
  lengthCm?: number
  rowId?: string
  source: 'automatic' | 'manual' | 'none'
}

export function rulerEstimate(
  ruler: MeasurementRuler,
  elements: StitchElement[],
  gauge: GaugeSettings,
): RulerEstimate {
  const profile = gaugeProfileById(gauge, ruler.profileId)
  const automatic = automaticRulerStitchCount(ruler, elements)
  const manual = ruler.manualStitchCount && ruler.manualStitchCount > 0
    ? ruler.manualStitchCount
    : null
  const stitchCount = manual ?? automatic?.count ?? undefined
  if (!profile || !stitchCount) {
    return {
      profile,
      stitchCount,
      rowId: automatic?.rowId,
      source: manual ? 'manual' : automatic ? 'automatic' : 'none',
    }
  }
  return {
    profile,
    stitchCount,
    rowId: automatic?.rowId,
    source: manual ? 'manual' : 'automatic',
    lengthCm: stitchCount * stitchWidthCm(profile),
  }
}

function formattedNumber(value: number, locale: 'ru' | 'en') {
  return new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
    maximumFractionDigits: 1,
  }).format(value)
}

export function rulerDisplayLabel(
  ruler: MeasurementRuler,
  elements: StitchElement[],
  gauge: GaugeSettings,
  locale: 'ru' | 'en',
) {
  const estimate = rulerEstimate(ruler, elements, gauge)
  if (!estimate.profile) return locale === 'ru' ? 'Нет образца' : 'No gauge'
  if (!estimate.stitchCount || estimate.lengthCm == null) {
    return locale === 'ru' ? 'Задайте число петель' : 'Set stitch count'
  }
  return locale === 'ru'
    ? `${estimate.stitchCount} п. · ≈ ${formattedNumber(estimate.lengthCm, locale)} см`
    : `${estimate.stitchCount} sts · ≈ ${formattedNumber(estimate.lengthCm, locale)} cm`
}
""")

write("src/editor/RulerLayer.tsx", r"""import type { PointerEvent as ReactPointerEvent } from 'react'
import type { GaugeSettings, MeasurementRuler, Point, StitchElement } from '../types'
import { rulerDisplayLabel } from './gauge'

function midpoint(start: Point, end: Point) {
  return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }
}

export function RulerLayer({
  rulers,
  selectedId,
  draft,
  elements,
  gauge,
  locale,
  zoom,
  onSelect,
  onHandlePointerDown,
}: {
  rulers: MeasurementRuler[]
  selectedId: string | null
  draft: { start: Point; end: Point } | null
  elements: StitchElement[]
  gauge: GaugeSettings
  locale: 'ru' | 'en'
  zoom: number
  onSelect: (id: string) => void
  onHandlePointerDown: (
    event: ReactPointerEvent<SVGCircleElement>,
    ruler: MeasurementRuler,
    endpoint: 'start' | 'end',
  ) => void
}) {
  return (
    <g className="measurement-rulers">
      {rulers.map((ruler) => {
        const selected = ruler.id === selectedId
        const center = midpoint(ruler.start, ruler.end)
        const label = rulerDisplayLabel(ruler, elements, gauge, locale)
        return (
          <g
            key={ruler.id}
            className={`measurement-ruler ${selected ? 'selected' : ''}`}
            data-ruler-id={ruler.id}
          >
            <line
              x1={ruler.start.x}
              y1={ruler.start.y}
              x2={ruler.end.x}
              y2={ruler.end.y}
              className="ruler-hit-line"
              strokeWidth={16 / zoom}
              onPointerDown={(event) => {
                if (event.button !== 0) return
                event.stopPropagation()
                onSelect(ruler.id)
              }}
            />
            <line
              x1={ruler.start.x}
              y1={ruler.start.y}
              x2={ruler.end.x}
              y2={ruler.end.y}
              className="ruler-line"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
            <line
              x1={ruler.start.x}
              y1={ruler.start.y - 7 / zoom}
              x2={ruler.start.x}
              y2={ruler.start.y + 7 / zoom}
              className="ruler-tick"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
            <line
              x1={ruler.end.x}
              y1={ruler.end.y - 7 / zoom}
              x2={ruler.end.x}
              y2={ruler.end.y + 7 / zoom}
              className="ruler-tick"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
            <text
              x={center.x}
              y={center.y - 10 / zoom}
              className="ruler-label"
              fontSize={12 / zoom}
              strokeWidth={4 / zoom}
              textAnchor="middle"
              pointerEvents="none"
            >{label}</text>
            {selected && (
              <>
                <circle
                  cx={ruler.start.x}
                  cy={ruler.start.y}
                  r={7 / zoom}
                  className="ruler-handle"
                  vectorEffect="non-scaling-stroke"
                  onPointerDown={(event) => onHandlePointerDown(event, ruler, 'start')}
                />
                <circle
                  cx={ruler.end.x}
                  cy={ruler.end.y}
                  r={7 / zoom}
                  className="ruler-handle"
                  vectorEffect="non-scaling-stroke"
                  onPointerDown={(event) => onHandlePointerDown(event, ruler, 'end')}
                />
              </>
            )}
          </g>
        )
      })}
      {draft && (
        <g className="measurement-ruler draft" pointerEvents="none">
          <line
            x1={draft.start.x}
            y1={draft.start.y}
            x2={draft.end.x}
            y2={draft.end.y}
            className="ruler-line"
            vectorEffect="non-scaling-stroke"
          />
          <circle cx={draft.start.x} cy={draft.start.y} r={5 / zoom} className="ruler-draft-point" vectorEffect="non-scaling-stroke" />
          <circle cx={draft.end.x} cy={draft.end.y} r={5 / zoom} className="ruler-draft-point" vectorEffect="non-scaling-stroke" />
        </g>
      )}
    </g>
  )
}
""")

write("src/editor/GaugeRulerPanel.tsx", r"""import type { GaugeProfile, GaugeSettings, MeasurementRuler, StitchElement } from '../types'
import { symbolName } from '../i18n'
import { STITCH_SYMBOLS, SYMBOL_BY_ID } from '../symbols'
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
            ? 'Две точки. Концы автоматически прилипают к петлям; на одном ряду число петель считается само.'
            : 'Pick two points. Endpoints snap to stitches; on one row the stitch count is automatic.'}
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
            {(() => {
              const estimate = rulerEstimate(selectedRuler, elements, gauge)
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
""")

write("src/editor/gauge.test.ts", r"""import { describe, expect, it } from 'vitest'
import type { GaugeProfile, GaugeSettings, MeasurementRuler, StitchElement } from '../types'
import {
  patternHeightEstimateCm,
  rowLengthEstimateCm,
  rulerEstimate,
  snapRulerPoint,
  stitchWidthCm,
} from './gauge'

const profile: GaugeProfile = {
  id: 'gauge-1',
  name: 'SC swatch',
  symbolId: 'single',
  stitchCount: 20,
  rowCount: 24,
  widthCm: 10,
  heightCm: 10,
}

const gauge: GaugeSettings = { profiles: [profile], activeProfileId: profile.id }

function rowElement(id: string, rowId: string, x: number, order: number): StitchElement {
  return {
    id,
    symbolId: 'single',
    x,
    y: order * 40,
    rotation: 0,
    parametricRow: {
      id: rowId,
      guideId: `guide-${rowId}`,
      symbolId: 'single',
      patternOrder: order,
      options: {
        distributionMode: 'count',
        count: 4,
        spacing: 20,
        orientation: 'tangent',
        rotationOffset: 0,
        radialOffset: 20,
        ringIndex: 1,
      },
    },
  }
}

const elements = [
  rowElement('a', 'row-1', 0, 1),
  rowElement('b', 'row-1', 20, 1),
  rowElement('c', 'row-1', 40, 1),
  rowElement('d', 'row-1', 60, 1),
  rowElement('e', 'row-2', 0, 2),
]

describe('gauge calculations', () => {
  it('derives stitch width and row estimates from a measured swatch', () => {
    expect(stitchWidthCm(profile)).toBe(0.5)
    expect(rowLengthEstimateCm(elements, 'row-1', profile)).toBe(2)
    expect(patternHeightEstimateCm(elements, profile)).toBeCloseTo(20 / 24, 6)
  })

  it('counts inclusive stitches automatically between two points on one parametric row', () => {
    const ruler: MeasurementRuler = {
      id: 'r1',
      start: { x: 0, y: 40 },
      end: { x: 40, y: 40 },
      startElementId: 'a',
      endElementId: 'c',
    }
    expect(rulerEstimate(ruler, elements, gauge)).toMatchObject({
      stitchCount: 3,
      lengthCm: 1.5,
      source: 'automatic',
      rowId: 'row-1',
    })
  })

  it('uses an explicit manual stitch count for a free ruler', () => {
    const ruler: MeasurementRuler = {
      id: 'r2',
      start: { x: 0, y: 0 },
      end: { x: 100, y: 100 },
      manualStitchCount: 50,
    }
    expect(rulerEstimate(ruler, elements, gauge)).toMatchObject({
      stitchCount: 50,
      lengthCm: 25,
      source: 'manual',
    })
  })

  it('snaps a ruler endpoint to the nearest visible stitch in screen-space tolerance', () => {
    const snapped = snapRulerPoint({ x: 38, y: 41 }, elements, 1)
    expect(snapped.elementId).toBe('c')
    expect(snapped.point).toEqual({ x: 40, y: 40 })
    expect(snapRulerPoint({ x: 90, y: 90 }, elements, 2).elementId).toBeUndefined()
  })
})
""")

write("src/editor/gaugeSchema.test.ts", r"""import { describe, expect, it } from 'vitest'
import { parseProject, ProjectValidationError } from './projectSchema'

const snapping = {
  enabled: true,
  sourceAnchor: 'bottom' as const,
  orientationMode: 'none' as const,
  snapToVertices: true,
  tolerancePx: 12,
}

function base(schemaVersion: number) {
  return {
    schemaVersion,
    metadata: { title: 'Gauge', updatedAt: '2026-08-26T00:00:00Z' },
    elements: [],
    guides: [],
    rowMarkers: [],
    settings: { snapping },
  }
}

describe('gauge schema v19', () => {
  it('persists gauge profiles and measurement rulers', () => {
    const parsed = parseProject({
      ...base(19),
      gauge: {
        activeProfileId: 'g1',
        profiles: [{ id: 'g1', name: 'SC', symbolId: 'single', stitchCount: 20, rowCount: 24, widthCm: 10, heightCm: 10 }],
      },
      rulers: [{ id: 'r1', start: { x: 1, y: 2 }, end: { x: 30, y: 2 }, profileId: 'g1', manualStitchCount: 10 }],
    }, snapping)
    expect(parsed.schemaVersion).toBe(19)
    expect(parsed.gauge?.profiles[0]).toMatchObject({ symbolId: 'single', stitchCount: 20, widthCm: 10 })
    expect(parsed.rulers?.[0]).toMatchObject({ id: 'r1', manualStitchCount: 10 })
  })

  it('migrates legacy v18 projects to empty gauge/ruler collections', () => {
    const parsed = parseProject(base(18), snapping)
    expect(parsed.schemaVersion).toBe(19)
    expect(parsed.gauge).toEqual({ profiles: [] })
    expect(parsed.rulers).toEqual([])
  })

  it('rejects invalid gauge values in current schema', () => {
    expect(() => parseProject({
      ...base(19),
      gauge: {
        profiles: [{ id: 'g1', name: 'Bad', symbolId: 'single', stitchCount: 0, rowCount: 10, widthCm: 10, heightCm: 10 }],
      },
    }, snapping)).toThrow(ProjectValidationError)
  })
})
""")

write("src/gauge.css", r""".gauge-panel { gap: 10px; }
.gauge-intro { margin: 0; color: #6f746f; font-size: 12px; line-height: 1.45; }
.gauge-add-button { width: 100%; }
.gauge-field { display: grid; gap: 5px; font-size: 12px; color: #555d57; }
.gauge-field > span { font-weight: 650; }
.gauge-field input, .gauge-field select, .gauge-number-grid input { width: 100%; box-sizing: border-box; }
.gauge-profile-editor { display: grid; gap: 9px; }
.gauge-number-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
.gauge-number-grid label { display: grid; gap: 4px; font-size: 11px; color: #626963; }
.gauge-derived, .gauge-estimate-card, .ruler-editor { display: grid; gap: 4px; padding: 9px; border: 1px solid #dedbd4; border-radius: 8px; background: #fbfaf7; }
.gauge-derived span, .gauge-estimate-card span, .gauge-estimate-card small, .ruler-editor small { font-size: 11px; color: #626963; }
.gauge-profile-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.gauge-estimates { display: grid; gap: 6px; padding-top: 4px; border-top: 1px solid #e4e1da; }
.gauge-pattern-height { font-size: 11px; color: #555d57; }
.gauge-ruler-section { display: grid; gap: 7px; padding-top: 5px; border-top: 1px solid #e4e1da; }
.gauge-ruler-heading { margin-top: 2px; }
.gauge-ruler-heading h3 { margin: 0; font-size: 13px; }
.gauge-ruler-tool { width: 100%; }
.ruler-list { display: grid; gap: 4px; }
.ruler-list button { display: grid; grid-template-columns: auto 1fr; gap: 6px; text-align: left; font-size: 11px; }
.ruler-list button.active { border-color: #c2413b; background: #fff6f4; }
.ruler-editor { margin-top: 2px; }
.measurement-ruler .ruler-line, .measurement-ruler .ruler-tick { stroke: #b23833; stroke-width: 1.6; }
.measurement-ruler.selected .ruler-line, .measurement-ruler.selected .ruler-tick { stroke: #8f2724; stroke-width: 2.2; }
.ruler-hit-line { stroke: transparent; cursor: pointer; }
.ruler-label { fill: #8f2724; stroke: #fbfaf7; paint-order: stroke; font-family: ui-sans-serif, system-ui, sans-serif; font-weight: 750; }
.ruler-handle { fill: #fff; stroke: #b23833; stroke-width: 1.8; cursor: grab; }
.ruler-handle:active { cursor: grabbing; }
.measurement-ruler.draft .ruler-line { stroke-dasharray: 5 4; opacity: 0.8; }
.ruler-draft-point { fill: #c2413b; stroke: #fff; stroke-width: 1.2; }
.editor-canvas.measuring { cursor: crosshair; }
""")

replace_once(
    "src/types.ts",
    "export type AutosaveDelayMs = 0 | 650 | 5000 | 15000 | 30000 | 60000\n\nexport type GuideRowOptions = {",
    """export type AutosaveDelayMs = 0 | 650 | 5000 | 15000 | 30000 | 60000

export type GaugeProfile = {
  id: string
  name: string
  symbolId: string
  stitchCount: number
  rowCount: number
  widthCm: number
  heightCm: number
}

export type GaugeSettings = {
  profiles: GaugeProfile[]
  activeProfileId?: string
}

export type MeasurementRuler = {
  id: string
  start: Point
  end: Point
  startElementId?: string
  endElementId?: string
  profileId?: string
  /** A positive value overrides automatic same-row stitch counting. */
  manualStitchCount?: number
}

export type GuideRowOptions = {""",
)
replace_once(
    "src/types.ts",
    "schemaVersion: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18",
    "schemaVersion: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19",
)
replace_once(
    "src/types.ts",
    "  backgroundImage?: BackgroundImage\n  settings: {",
    "  backgroundImage?: BackgroundImage\n  gauge?: GaugeSettings\n  rulers?: MeasurementRuler[]\n  settings: {",
)

replace_once(
    "src/editor/projectVersion.ts",
    "export const CURRENT_PROJECT_SCHEMA_VERSION = 18\nexport const STRICT_PROJECT_SCHEMA_VERSION = 18",
    "export const CURRENT_PROJECT_SCHEMA_VERSION = 19\nexport const STRICT_PROJECT_SCHEMA_VERSION = 19",
)

replace_once(
    "src/editor/projectIntegrity.ts",
    "export const MAX_PROJECT_ROW_MARKERS = 1_000\nexport const MAX_BACKGROUND_DATA_URL_LENGTH = 8_000_000",
    "export const MAX_PROJECT_ROW_MARKERS = 1_000\nexport const MAX_PROJECT_RULERS = 500\nexport const MAX_GAUGE_PROFILES = 50\nexport const MAX_BACKGROUND_DATA_URL_LENGTH = 8_000_000",
)
replace_once(
    "src/editor/projectIntegrity.ts",
    "  const markers = project.rowMarkers ?? []\n  if (elements.length > MAX_PROJECT_ELEMENTS) return 'Project contains too many stitch elements'\n  if (guides.length > MAX_PROJECT_GUIDES) return 'Project contains too many guides'\n  if (markers.length > MAX_PROJECT_ROW_MARKERS) return 'Project contains too many row markers'\n\n  if (!unique(elements.map((element) => element.id))) return 'Duplicate stitch element id'\n  if (!unique(guides.map((guide) => guide.id))) return 'Duplicate guide id'\n  if (!unique(markers.map((marker) => marker.id))) return 'Duplicate row marker id'",
    """  const markers = project.rowMarkers ?? []
  const rulers = project.rulers ?? []
  const gaugeProfiles = project.gauge?.profiles ?? []
  if (elements.length > MAX_PROJECT_ELEMENTS) return 'Project contains too many stitch elements'
  if (guides.length > MAX_PROJECT_GUIDES) return 'Project contains too many guides'
  if (markers.length > MAX_PROJECT_ROW_MARKERS) return 'Project contains too many row markers'
  if (rulers.length > MAX_PROJECT_RULERS) return 'Project contains too many measurement rulers'
  if (gaugeProfiles.length > MAX_GAUGE_PROFILES) return 'Project contains too many gauge profiles'

  if (!unique(elements.map((element) => element.id))) return 'Duplicate stitch element id'
  if (!unique(guides.map((guide) => guide.id))) return 'Duplicate guide id'
  if (!unique(markers.map((marker) => marker.id))) return 'Duplicate row marker id'
  if (!unique(rulers.map((ruler) => ruler.id))) return 'Duplicate measurement ruler id'
  if (!unique(gaugeProfiles.map((profile) => profile.id))) return 'Duplicate gauge profile id'""",
)
replace_once(
    "src/editor/projectIntegrity.ts",
    "  const elementIds = new Set(elements.map((element) => element.id))\n  const guideById = new Map(guides.map((guide) => [guide.id, guide]))",
    """  const elementIds = new Set(elements.map((element) => element.id))
  const gaugeProfileIds = new Set(gaugeProfiles.map((profile) => profile.id))
  if (strictReferences && project.gauge?.activeProfileId && !gaugeProfileIds.has(project.gauge.activeProfileId)) {
    return 'Active gauge profile is missing'
  }
  for (const profile of gaugeProfiles) {
    if (!SYMBOL_BY_ID.has(profile.symbolId)) return 'Gauge profile references an unknown stitch symbol'
    if (!positiveInteger(profile.stitchCount, 10_000) || !positiveInteger(profile.rowCount, 10_000)) return 'Gauge counts are out of bounds'
    if (!positive(profile.widthCm, 10_000) || !positive(profile.heightCm, 10_000)) return 'Gauge dimensions are out of bounds'
  }
  for (const ruler of rulers) {
    if (![ruler.start.x, ruler.start.y, ruler.end.x, ruler.end.y].every((value) => bounded(value))) return 'Measurement ruler geometry is out of bounds'
    if (ruler.manualStitchCount !== undefined && !positiveInteger(ruler.manualStitchCount, MAX_PROJECT_ELEMENTS)) return 'Measurement ruler stitch count is out of bounds'
    if (strictReferences && ruler.profileId && !gaugeProfileIds.has(ruler.profileId)) return 'Measurement ruler gauge profile is missing'
  }

  const guideById = new Map(guides.map((guide) => [guide.id, guide]))""",
)

replace_once(
    "src/editor/projectSchema.ts",
    "  CrochetProject,\n  Guide,",
    "  CrochetProject,\n  GaugeProfile,\n  GaugeSettings,\n  Guide,",
)
replace_once(
    "src/editor/projectSchema.ts",
    "  ParametricRowBinding,\n  RowProgram,",
    "  MeasurementRuler,\n  ParametricRowBinding,\n  RowProgram,",
)
replace_once(
    "src/editor/projectSchema.ts",
    "import { MAX_PROJECT_ELEMENTS, MAX_PROJECT_GUIDES, MAX_PROJECT_ROW_MARKERS, projectIntegrityIssue } from './projectIntegrity'",
    "import { MAX_GAUGE_PROFILES, MAX_PROJECT_ELEMENTS, MAX_PROJECT_GUIDES, MAX_PROJECT_ROW_MARKERS, MAX_PROJECT_RULERS, projectIntegrityIssue } from './projectIntegrity'",
)
replace_once(
    "src/editor/projectSchema.ts",
    "function parseLegend(value: unknown) {",
    r"""function parseGaugeProfile(value: unknown): GaugeProfile {
  if (!isRecord(value)) throw new ProjectValidationError('Invalid gauge profile')
  if (
    !nonEmptyString(value.id) || typeof value.name !== 'string' || !nonEmptyString(value.symbolId) ||
    !positiveInteger(value.stitchCount, 10_000) || !positiveInteger(value.rowCount, 10_000) ||
    !finite(value.widthCm) || value.widthCm <= 0 || value.widthCm > 10_000 ||
    !finite(value.heightCm) || value.heightCm <= 0 || value.heightCm > 10_000
  ) throw new ProjectValidationError('Invalid gauge profile')
  return {
    id: value.id,
    name: value.name,
    symbolId: value.symbolId,
    stitchCount: value.stitchCount,
    rowCount: value.rowCount,
    widthCm: value.widthCm,
    heightCm: value.heightCm,
  }
}

function parseGauge(value: unknown): GaugeSettings {
  if (value === undefined) return { profiles: [] }
  if (!isRecord(value) || !Array.isArray(value.profiles) || value.profiles.length > MAX_GAUGE_PROFILES) {
    throw new ProjectValidationError('Invalid gauge settings')
  }
  if (!(value.activeProfileId === undefined || nonEmptyString(value.activeProfileId))) {
    throw new ProjectValidationError('Invalid active gauge profile')
  }
  return {
    profiles: value.profiles.map(parseGaugeProfile),
    activeProfileId: value.activeProfileId as string | undefined,
  }
}

function parseMeasurementRuler(value: unknown): MeasurementRuler {
  if (!isRecord(value) || !nonEmptyString(value.id) || !point(value.start) || !point(value.end)) {
    throw new ProjectValidationError('Invalid measurement ruler')
  }
  if (
    !(value.startElementId === undefined || nonEmptyString(value.startElementId)) ||
    !(value.endElementId === undefined || nonEmptyString(value.endElementId)) ||
    !(value.profileId === undefined || nonEmptyString(value.profileId)) ||
    !(value.manualStitchCount === undefined || positiveInteger(value.manualStitchCount, MAX_PROJECT_ELEMENTS))
  ) throw new ProjectValidationError('Invalid measurement ruler')
  return {
    id: value.id,
    start: value.start as unknown as { x: number; y: number },
    end: value.end as unknown as { x: number; y: number },
    startElementId: value.startElementId as string | undefined,
    endElementId: value.endElementId as string | undefined,
    profileId: value.profileId as string | undefined,
    manualStitchCount: value.manualStitchCount as number | undefined,
  }
}

function parseLegend(value: unknown) {""",
)
replace_once(
    "src/editor/projectSchema.ts",
    "  if (Array.isArray(raw.rowMarkers) && raw.rowMarkers.length > MAX_PROJECT_ROW_MARKERS) throw new ProjectValidationError('Project contains too many row markers')\n\n  const metadata",
    "  if (Array.isArray(raw.rowMarkers) && raw.rowMarkers.length > MAX_PROJECT_ROW_MARKERS) throw new ProjectValidationError('Project contains too many row markers')\n  if (raw.rulers !== undefined && !Array.isArray(raw.rulers)) throw new ProjectValidationError('Project measurement rulers are invalid')\n  if (Array.isArray(raw.rulers) && raw.rulers.length > MAX_PROJECT_RULERS) throw new ProjectValidationError('Project contains too many measurement rulers')\n\n  const metadata",
)
replace_once(
    "src/editor/projectSchema.ts",
    "  const rowMarkers = (raw.rowMarkers ?? []).map(parseRowMarker)\n  const backgroundImage = parseBackgroundImage(raw.backgroundImage)",
    "  const rowMarkers = (raw.rowMarkers ?? []).map(parseRowMarker)\n  const backgroundImage = parseBackgroundImage(raw.backgroundImage)\n  const gauge = parseGauge(raw.gauge)\n  const rulers = (raw.rulers ?? []).map(parseMeasurementRuler)",
)
replace_once(
    "src/editor/projectSchema.ts",
    "    rowMarkers,\n    backgroundImage,\n    settings: {",
    "    rowMarkers,\n    backgroundImage,\n    gauge,\n    rulers,\n    settings: {",
)

replace_once(
    "src/main.tsx",
    "import './documentOutput.css'",
    "import './documentOutput.css'\nimport './gauge.css'",
)

replace_once(
    "src/App.tsx",
    "import { TopologyEditorPanel } from './editor/TopologyEditorPanel'",
    "import { TopologyEditorPanel } from './editor/TopologyEditorPanel'\nimport { GaugeRulerPanel } from './editor/GaugeRulerPanel'\nimport { RulerLayer } from './editor/RulerLayer'",
)
replace_once(
    "src/App.tsx",
    "import { emptyHistory, pushHistory, redoHistory, undoHistory } from './editor/history'",
    "import { emptyHistory, pushHistory, redoHistory, undoHistory } from './editor/history'\nimport { emptyGaugeSettings, snapRulerPoint } from './editor/gauge'",
)
replace_once(
    "src/App.tsx",
    "  CrochetProject,\n  Guide,",
    "  CrochetProject,\n  GaugeProfile,\n  GaugeSettings,\n  Guide,",
)
replace_once(
    "src/App.tsx",
    "  GuideAttachmentOrientation,\n  OrientationMode,",
    "  GuideAttachmentOrientation,\n  MeasurementRuler,\n  OrientationMode,",
)
replace_once(
    "src/App.tsx",
    "type Tool = { type: 'select' } | { type: 'lasso' } | { type: 'place'; symbolId: string } | { type: 'row-marker' }",
    "type Tool = { type: 'select' } | { type: 'lasso' } | { type: 'ruler' } | { type: 'place'; symbolId: string } | { type: 'row-marker' }",
)
replace_once(
    "src/App.tsx",
    "  rowMarkers: RowMarker[]\n  backgroundImage: BackgroundImage | null",
    "  rowMarkers: RowMarker[]\n  gauge: GaugeSettings\n  rulers: MeasurementRuler[]\n  backgroundImage: BackgroundImage | null",
)
replace_once(
    "src/App.tsx",
    "type RotateState = {\n  pointerId: number\n  elementId: string\n  startRotation: number\n  startPointerAngle: number\n  startSnapshot: DocumentSnapshot\n}\ntype HistoryState",
    """type RotateState = {
  pointerId: number
  elementId: string
  startRotation: number
  startPointerAngle: number
  startSnapshot: DocumentSnapshot
}
type RulerDraftState = {
  start: Point
  current: Point
  startElementId?: string
  currentElementId?: string
}
type RulerDragState = {
  pointerId: number
  rulerId: string
  endpoint: 'start' | 'end'
  startSnapshot: DocumentSnapshot
}
type HistoryState""",
)
replace_once(
    "src/App.tsx",
    "  autosaveDelayMs: AutosaveDelayMs = DEFAULT_AUTOSAVE_DELAY_MS,\n  backgroundImage: BackgroundImage | null = null,\n): CrochetProject {",
    "  autosaveDelayMs: AutosaveDelayMs = DEFAULT_AUTOSAVE_DELAY_MS,\n  backgroundImage: BackgroundImage | null = null,\n  gauge: GaugeSettings = emptyGaugeSettings(),\n  rulers: MeasurementRuler[] = [],\n): CrochetProject {",
)
replace_once(
    "src/App.tsx",
    "    rowMarkers,\n    backgroundImage: backgroundImage ?? undefined,\n    settings: {",
    "    rowMarkers,\n    backgroundImage: backgroundImage ?? undefined,\n    gauge,\n    rulers,\n    settings: {",
)
replace_once(
    "src/App.tsx",
    "  const [rowMarkers, setRowMarkers] = useState<RowMarker[]>([])\n  const [backgroundImage, setBackgroundImage]",
    "  const [rowMarkers, setRowMarkers] = useState<RowMarker[]>([])\n  const [gauge, setGauge] = useState<GaugeSettings>(emptyGaugeSettings)\n  const [rulers, setRulers] = useState<MeasurementRuler[]>([])\n  const [backgroundImage, setBackgroundImage]",
)
replace_once(
    "src/App.tsx",
    "  const [selectedRowMarkerId, setSelectedRowMarkerId] = useState<string | null>(null)\n  const [selectedTopologyParentId",
    "  const [selectedRowMarkerId, setSelectedRowMarkerId] = useState<string | null>(null)\n  const [selectedRulerId, setSelectedRulerId] = useState<string | null>(null)\n  const [selectedTopologyParentId",
)
replace_once(
    "src/App.tsx",
    "  const [pan, setPan] = useState<PanState | null>(null)\n  const [mirrorAxis",
    "  const [pan, setPan] = useState<PanState | null>(null)\n  const [rulerDraft, setRulerDraft] = useState<RulerDraftState | null>(null)\n  const [rulerDrag, setRulerDrag] = useState<RulerDragState | null>(null)\n  const [mirrorAxis",
)
replace_once(
    "src/App.tsx",
    "          setRowMarkers(project.rowMarkers ?? [])\n          setBackgroundImage(project.backgroundImage ?? null)",
    "          setRowMarkers(project.rowMarkers ?? [])\n          setGauge(project.gauge ?? emptyGaugeSettings())\n          setRulers(project.rulers ?? [])\n          setBackgroundImage(project.backgroundImage ?? null)",
)

for old in [
    "buildProject(projectTitle, elements, guides, snapping, rowMarkers, legendVisible, autosaveDelayMs, backgroundImage)",
    "buildProject(projectTitle, elements, guides, snapping, rowMarkers, legendVisible, delayMs, backgroundImage)",
]:
    replacement = old[:-1] + ", gauge, rulers)"
    text = Path("src/App.tsx").read_text()
    if old in text:
        Path("src/App.tsx").write_text(text.replace(old, replacement))

replace_once(
    "src/App.tsx",
    "  }, [activeProjectId, autosaveDelayMs, backgroundImage, elements, guides, hydrated, legendVisible, projectTitle, rowMarkers, snapping])",
    "  }, [activeProjectId, autosaveDelayMs, backgroundImage, elements, gauge, guides, hydrated, legendVisible, projectTitle, rowMarkers, rulers, snapping])",
)
replace_once(
    "src/App.tsx",
    "  const selectedRowMarker = useMemo(\n    () => rowMarkers.find((marker) => marker.id === selectedRowMarkerId) ?? null,\n    [rowMarkers, selectedRowMarkerId],\n  )",
    """  const selectedRowMarker = useMemo(
    () => rowMarkers.find((marker) => marker.id === selectedRowMarkerId) ?? null,
    [rowMarkers, selectedRowMarkerId],
  )
  const selectedRuler = useMemo(
    () => rulers.find((ruler) => ruler.id === selectedRulerId) ?? null,
    [rulers, selectedRulerId],
  )""",
)
replace_once(
    "src/App.tsx",
    "    (): DocumentSnapshot => ({ elements, guides, rowMarkers, backgroundImage, legendVisible, snapping, projectTitle }),\n    [backgroundImage, elements, guides, legendVisible, projectTitle, rowMarkers, snapping],",
    "    (): DocumentSnapshot => ({ elements, guides, rowMarkers, gauge, rulers, backgroundImage, legendVisible, snapping, projectTitle }),\n    [backgroundImage, elements, gauge, guides, legendVisible, projectTitle, rowMarkers, rulers, snapping],",
)
replace_once(
    "src/App.tsx",
    "    setRowMarkers(snapshot.rowMarkers)\n    setBackgroundImage(snapshot.backgroundImage)",
    "    setRowMarkers(snapshot.rowMarkers)\n    setGauge(snapshot.gauge)\n    setRulers(snapshot.rulers)\n    setBackgroundImage(snapshot.backgroundImage)",
)
replace_once(
    "src/App.tsx",
    "  const commitBackgroundImage = useCallback((next: BackgroundImage | null) => {",
    """  const commitGauge = useCallback((next: GaugeSettings) => {
    recordSnapshot(currentSnapshot())
    setGauge(next)
  }, [currentSnapshot, recordSnapshot])
  const commitRulers = useCallback((next: MeasurementRuler[]) => {
    recordSnapshot(currentSnapshot())
    setRulers(next)
  }, [currentSnapshot, recordSnapshot])
  const commitBackgroundImage = useCallback((next: BackgroundImage | null) => {""",
)
replace_once(
    "src/App.tsx",
    "    setSelectedRowMarkerId(null)\n    setStatus(t.statusUndo)",
    "    setSelectedRowMarkerId(null)\n    setSelectedRulerId(null)\n    setStatus(t.statusUndo)",
)
replace_once(
    "src/App.tsx",
    "    setSelectedRowMarkerId(null)\n    setStatus(t.statusRedo)",
    "    setSelectedRowMarkerId(null)\n    setSelectedRulerId(null)\n    setStatus(t.statusRedo)",
)
replace_once(
    "src/App.tsx",
    "    if (selectedRowMarkerId) {",
    """    if (selectedRulerId) {
      commitRulers(rulers.filter((ruler) => ruler.id !== selectedRulerId))
      setSelectedRulerId(null)
      setStatus(locale === 'ru' ? 'Линейка удалена' : 'Ruler deleted')
      return
    }
    if (selectedRowMarkerId) {""",
)
replace_once(
    "src/App.tsx",
    "    commitRowMarkers,\n    elements,",
    "    commitRowMarkers,\n    commitRulers,\n    elements,",
)
replace_once(
    "src/App.tsx",
    "    rowMarkers,\n    selectedGuideId,",
    "    rowMarkers,\n    rulers,\n    selectedGuideId,",
)
replace_once(
    "src/App.tsx",
    "    selectedRowMarkerId,\n    selectedIds.length,",
    "    selectedRowMarkerId,\n    selectedRulerId,\n    selectedIds.length,",
)

replace_once(
    "src/App.tsx",
    "  const toggleSnapping = useCallback(() => {",
    r"""  const addGaugeProfile = useCallback(() => {
    const id = createId()
    const profile: GaugeProfile = {
      id,
      name: locale === 'ru' ? `Образец ${gauge.profiles.length + 1}` : `Swatch ${gauge.profiles.length + 1}`,
      symbolId: 'single',
      stitchCount: 20,
      rowCount: 20,
      widthCm: 10,
      heightCm: 10,
    }
    commitGauge({ profiles: [...gauge.profiles, profile], activeProfileId: id })
  }, [commitGauge, gauge.profiles, locale])

  const updateGaugeProfile = useCallback((id: string, patch: Partial<GaugeProfile>) => {
    commitGauge({
      ...gauge,
      profiles: gauge.profiles.map((profile) => profile.id === id ? { ...profile, ...patch } : profile),
    })
  }, [commitGauge, gauge])

  const setActiveGaugeProfile = useCallback((id: string) => {
    if (!gauge.profiles.some((profile) => profile.id === id)) return
    commitGauge({ ...gauge, activeProfileId: id })
  }, [commitGauge, gauge])

  const deleteGaugeProfile = useCallback((id: string) => {
    const nextProfiles = gauge.profiles.filter((profile) => profile.id !== id)
    const nextActive = gauge.activeProfileId === id ? nextProfiles[0]?.id : gauge.activeProfileId
    recordSnapshot(currentSnapshot())
    setGauge({ profiles: nextProfiles, activeProfileId: nextActive })
    setRulers(rulers.map((ruler) => ruler.profileId === id ? { ...ruler, profileId: undefined } : ruler))
  }, [currentSnapshot, gauge.activeProfileId, gauge.profiles, recordSnapshot, rulers])

  const updateRuler = useCallback((id: string, patch: Partial<MeasurementRuler>) => {
    commitRulers(rulers.map((ruler) => ruler.id === id ? { ...ruler, ...patch } : ruler))
  }, [commitRulers, rulers])

  const deleteRuler = useCallback((id: string) => {
    commitRulers(rulers.filter((ruler) => ruler.id !== id))
    if (selectedRulerId === id) setSelectedRulerId(null)
  }, [commitRulers, rulers, selectedRulerId])

  const selectRuler = useCallback((id: string) => {
    if (!rulers.some((ruler) => ruler.id === id)) return
    setSelectedRulerId(id)
    clearElementSelection()
    setSelectedGuideId(null)
    setSelectedRowMarkerId(null)
    setTool({ type: 'select' })
    setRulerDraft(null)
  }, [clearElementSelection, rulers])

  const toggleRulerTool = useCallback(() => {
    const active = tool.type === 'ruler'
    setTool(active ? { type: 'select' } : { type: 'ruler' })
    setRulerDraft(null)
    setRulerDrag(null)
    setPreview(null)
    setSnapTarget(null)
    if (!active) {
      clearElementSelection()
      setSelectedGuideId(null)
      setSelectedRowMarkerId(null)
      setSelectedRulerId(null)
      setStatus(locale === 'ru' ? 'Укажите начало линейки' : 'Pick ruler start')
    }
  }, [clearElementSelection, locale, tool.type])

  const handleRulerHandlePointerDown = useCallback((
    event: ReactPointerEvent<SVGCircleElement>,
    ruler: MeasurementRuler,
    endpoint: 'start' | 'end',
  ) => {
    if (event.button !== 0 || spacePressedRef.current) return
    event.preventDefault()
    event.stopPropagation()
    setSelectedRulerId(ruler.id)
    clearElementSelection()
    setSelectedGuideId(null)
    setSelectedRowMarkerId(null)
    setTool({ type: 'select' })
    setRulerDraft(null)
    setRulerDrag({
      pointerId: event.pointerId,
      rulerId: ruler.id,
      endpoint,
      startSnapshot: currentSnapshot(),
    })
    interactionMovedRef.current = false
    event.currentTarget.setPointerCapture(event.pointerId)
  }, [clearElementSelection, currentSnapshot])

  const toggleSnapping = useCallback(() => {""",
)
replace_once(
    "src/App.tsx",
    "        } else if (event.key.toLowerCase() === 'l') {",
    """        } else if (event.key.toLowerCase() === 'r') {
          event.preventDefault()
          toggleRulerTool()
        } else if (event.key.toLowerCase() === 'l') {""",
)
replace_once(
    "src/App.tsx",
    "        if (rotate) setElements(rotate.startSnapshot.elements)\n        setTool({ type: 'select' })",
    "        if (rotate) setElements(rotate.startSnapshot.elements)\n        if (rulerDrag) setRulers(rulerDrag.startSnapshot.rulers)\n        setTool({ type: 'select' })",
)
replace_once(
    "src/App.tsx",
    "        setLasso(null)\n        setMirrorAxis(null)",
    "        setLasso(null)\n        setRulerDraft(null)\n        setRulerDrag(null)\n        setMirrorAxis(null)",
)
replace_once(
    "src/App.tsx",
    "    rotate,\n    selectAll,",
    "    rotate,\n    rulerDrag,\n    selectAll,",
)
replace_once(
    "src/App.tsx",
    "    toggleSnapping,\n    undo,",
    "    toggleRulerTool,\n    toggleSnapping,\n    undo,",
)

replace_once(
    "src/App.tsx",
    "    const point = toDocumentPoint(localPoint(event.clientX, event.clientY))\n    if (tool.type === 'lasso') {",
    r"""    const point = toDocumentPoint(localPoint(event.clientX, event.clientY))
    if (tool.type === 'ruler') {
      const snapped = snapRulerPoint(point, visibleElements, viewport.zoom)
      if (!rulerDraft) {
        setRulerDraft({
          start: snapped.point,
          current: snapped.point,
          startElementId: snapped.elementId,
          currentElementId: snapped.elementId,
        })
        setStatus(locale === 'ru' ? 'Укажите конец линейки' : 'Pick ruler end')
        return
      }
      const ruler: MeasurementRuler = {
        id: createId(),
        start: rulerDraft.start,
        end: snapped.point,
        startElementId: rulerDraft.startElementId,
        endElementId: snapped.elementId,
      }
      commitRulers([...rulers, ruler])
      setSelectedRulerId(ruler.id)
      setRulerDraft(null)
      setTool({ type: 'select' })
      setStatus(locale === 'ru' ? 'Линейка добавлена' : 'Ruler added')
      return
    }
    if (tool.type === 'lasso') {""",
)
replace_once(
    "src/App.tsx",
    "    const documentPoint = toDocumentPoint(screen)\n    if (rotate?.pointerId === event.pointerId) {",
    r"""    const documentPoint = toDocumentPoint(screen)
    if (rulerDrag?.pointerId === event.pointerId) {
      const snapped = snapRulerPoint(documentPoint, visibleElements, viewport.zoom)
      const original = rulerDrag.startSnapshot.rulers.find((ruler) => ruler.id === rulerDrag.rulerId)
      const originalPoint = original?.[rulerDrag.endpoint]
      if (originalPoint) {
        interactionMovedRef.current = Math.hypot(snapped.point.x - originalPoint.x, snapped.point.y - originalPoint.y) > 0.5
      }
      setRulers((current) => current.map((ruler) => {
        if (ruler.id !== rulerDrag.rulerId) return ruler
        return rulerDrag.endpoint === 'start'
          ? { ...ruler, start: snapped.point, startElementId: snapped.elementId }
          : { ...ruler, end: snapped.point, endElementId: snapped.elementId }
      }))
      return
    }
    if (rotate?.pointerId === event.pointerId) {""",
)
replace_once(
    "src/App.tsx",
    "    if (marquee?.pointerId === event.pointerId) {\n      setMarquee({ ...marquee, current: documentPoint })\n      return\n    }\n\n    updatePreview(documentPoint)",
    r"""    if (marquee?.pointerId === event.pointerId) {
      setMarquee({ ...marquee, current: documentPoint })
      return
    }

    if (tool.type === 'ruler' && rulerDraft) {
      const snapped = snapRulerPoint(documentPoint, visibleElements, viewport.zoom)
      setRulerDraft({ ...rulerDraft, current: snapped.point, currentElementId: snapped.elementId })
      return
    }

    updatePreview(documentPoint)""",
)
replace_once(
    "src/App.tsx",
    "    if (lasso?.pointerId === event.pointerId) {",
    r"""    if (rulerDrag?.pointerId === event.pointerId) {
      if (cancelled) setRulers(rulerDrag.startSnapshot.rulers)
      else if (interactionMovedRef.current) {
        recordSnapshot(rulerDrag.startSnapshot)
        setStatus(locale === 'ru' ? 'Линейка изменена' : 'Ruler changed')
      }
      setRulerDrag(null)
      interactionMovedRef.current = false
      return
    }

    if (lasso?.pointerId === event.pointerId) {""",
)
replace_once(
    "src/App.tsx",
    "    event.stopPropagation()\n\n    if (tool.type === 'place') {",
    "    if (tool.type === 'ruler') return\n    event.stopPropagation()\n    setSelectedRulerId(null)\n\n    if (tool.type === 'place') {",
)
replace_once(
    "src/App.tsx",
    "    setSelectedRowMarkerId(null)\n    clearElementSelection()\n    setStatus(`${guideLabel(guide, locale)} ${t.selected}`)",
    "    setSelectedRowMarkerId(null)\n    setSelectedRulerId(null)\n    clearElementSelection()\n    setStatus(`${guideLabel(guide, locale)} ${t.selected}`)",
)
replace_once(
    "src/App.tsx",
    "    setSelectedRowMarkerId(id)\n    clearElementSelection()",
    "    setSelectedRowMarkerId(id)\n    setSelectedRulerId(null)\n    clearElementSelection()",
)

replace_once(
    "src/App.tsx",
    "    setRowMarkers(normalized.rowMarkers ?? [])\n    setBackgroundImage(normalized.backgroundImage ?? null)",
    "    setRowMarkers(normalized.rowMarkers ?? [])\n    setGauge(normalized.gauge ?? emptyGaugeSettings())\n    setRulers(normalized.rulers ?? [])\n    setBackgroundImage(normalized.backgroundImage ?? null)",
)
replace_once(
    "src/App.tsx",
    "    setSelectedRowMarkerId(null)\n    setTool({ type: 'select' })\n    setPreview(null)",
    "    setSelectedRowMarkerId(null)\n    setSelectedRulerId(null)\n    setRulerDraft(null)\n    setRulerDrag(null)\n    setTool({ type: 'select' })\n    setPreview(null)",
)
replace_once(
    "src/App.tsx",
    "      setRowMarkers(project.rowMarkers ?? [])\n      setBackgroundImage(project.backgroundImage ?? null)",
    "      setRowMarkers(project.rowMarkers ?? [])\n      setGauge(project.gauge ?? emptyGaugeSettings())\n      setRulers(project.rulers ?? [])\n      setBackgroundImage(project.backgroundImage ?? null)",
)
replace_once(
    "src/App.tsx",
    "      setSelectedRowMarkerId(null)\n      setTool({ type: 'select' })\n      setPreview(null)",
    "      setSelectedRowMarkerId(null)\n      setSelectedRulerId(null)\n      setRulerDraft(null)\n      setRulerDrag(null)\n      setTool({ type: 'select' })\n      setPreview(null)",
)

replace_once(
    "src/App.tsx",
    "          <small className=\"muted-text\">{locale === 'ru' ? 'Лассо: Shift добавить · Alt вычесть · Space + drag — ладонь' : 'Lasso: Shift add · Alt subtract · Space + drag — hand'}</small>",
    r"""          <button
            className={`tool-button ${tool.type === 'ruler' ? 'active' : ''}`}
            aria-label={locale === 'ru' ? 'Линейка' : 'Ruler'}
            aria-pressed={tool.type === 'ruler'}
            onClick={toggleRulerTool}
          >
            <span>↔</span>{locale === 'ru' ? 'Линейка' : 'Ruler'}<kbd>R</kbd>
          </button>
          <small className="muted-text">{locale === 'ru' ? 'Лассо: Shift добавить · Alt вычесть · Линейка: две точки · Space + drag — ладонь' : 'Lasso: Shift add · Alt subtract · Ruler: two points · Space + drag — hand'}</small>""",
)
replace_once(
    "src/App.tsx",
    "          <button\n            className={`snap-toggle ${snapping.enabled ? 'active' : ''}`}",
    r"""          <button
            className={`fit-button ${tool.type === 'ruler' ? 'active' : ''}`}
            aria-label={locale === 'ru' ? 'Линейка' : 'Ruler'}
            aria-pressed={tool.type === 'ruler'}
            title="R"
            onClick={toggleRulerTool}
          >{locale === 'ru' ? 'Линейка' : 'Ruler'}</button>
          <button
            className={`snap-toggle ${snapping.enabled ? 'active' : ''}`}""",
)
replace_once(
    "src/App.tsx",
    "          className={`editor-canvas ${pan ? 'panning' : ''} ${tool.type === 'place' ? 'placing' : tool.type === 'lasso' ? 'lassoing' : 'selecting'}`}",
    "          className={`editor-canvas ${pan ? 'panning' : ''} ${tool.type === 'place' ? 'placing' : tool.type === 'lasso' ? 'lassoing' : tool.type === 'ruler' ? 'measuring' : 'selecting'}`}",
)
replace_once(
    "src/App.tsx",
    "            <RowMarkerLayer\n              markers={rowMarkers}",
    r"""            <RulerLayer
              rulers={rulers}
              selectedId={selectedRulerId}
              draft={rulerDraft ? { start: rulerDraft.start, end: rulerDraft.current } : null}
              elements={elements}
              gauge={gauge}
              locale={locale}
              zoom={viewport.zoom}
              onSelect={selectRuler}
              onHandlePointerDown={handleRulerHandlePointerDown}
            />

            <RowMarkerLayer
              markers={rowMarkers}""",
)
replace_once(
    "src/App.tsx",
    "          <span>{elements.length} {t.stitchCount} · {guides.length} {t.guideCount} · {rowMarkers.length} {locale === 'ru' ? 'номеров рядов' : 'row numbers'}{selectedIds.length ? ` · ${selectedIds.length} ${t.selectedShort}` : ''}</span>",
    "          <span>{elements.length} {t.stitchCount} · {guides.length} {t.guideCount} · {rowMarkers.length} {locale === 'ru' ? 'номеров рядов' : 'row numbers'} · {rulers.length} {locale === 'ru' ? 'линеек' : 'rulers'}{selectedIds.length ? ` · ${selectedIds.length} ${t.selectedShort}` : ''}</span>",
)
replace_once(
    "src/App.tsx",
    "        <PrintPanel locale={locale} bounds={outputBounds} onPrint={openTiledPrint} />",
    r"""        <GaugeRulerPanel
          locale={locale}
          gauge={gauge}
          rulers={rulers}
          selectedRulerId={selectedRulerId}
          placingRuler={tool.type === 'ruler'}
          elements={elements}
          selectedRowId={selectedParametricRow?.id ?? null}
          selectedRowIsCircular={selectedParametricGuide?.type === 'arc' || selectedParametricGuide?.type === 'radial-grid'}
          onAddProfile={addGaugeProfile}
          onUpdateProfile={updateGaugeProfile}
          onDeleteProfile={deleteGaugeProfile}
          onActiveProfileChange={setActiveGaugeProfile}
          onToggleRulerTool={toggleRulerTool}
          onSelectRuler={selectRuler}
          onUpdateRuler={updateRuler}
          onDeleteRuler={deleteRuler}
        />

        <PrintPanel locale={locale} bounds={outputBounds} onPrint={openTiledPrint} />""",
)
replace_once(
    "src/App.tsx",
    "              setSelectedRowMarkerId(null)\n              setPreview(null)",
    "              setSelectedRowMarkerId(null)\n              setSelectedRulerId(null)\n              setRulerDraft(null)\n              setPreview(null)",
)

# Avoid a noUnusedLocals error: selectedRuler is useful only as a memoized existence check for stale selection.
replace_once(
    "src/App.tsx",
    "  const selectedRuler = useMemo(\n    () => rulers.find((ruler) => ruler.id === selectedRulerId) ?? null,\n    [rulers, selectedRulerId],\n  )",
    """  const selectedRuler = useMemo(
    () => rulers.find((ruler) => ruler.id === selectedRulerId) ?? null,
    [rulers, selectedRulerId],
  )
  useEffect(() => {
    if (selectedRulerId && !selectedRuler) setSelectedRulerId(null)
  }, [selectedRuler, selectedRulerId])""",
)

print('Gauge feature patch applied')

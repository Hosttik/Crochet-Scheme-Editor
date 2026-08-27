from pathlib import Path


def write(path: str, content: str):
    Path(path).write_text(content, encoding='utf-8')


def replace_once(path: str, old: str, new: str):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'missing pattern in {path}: {old[:120]!r}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')


gauge = r'''import { SYMBOL_BY_ID } from '../symbols'
import type { GaugeProfile, GaugeSettings, MeasurementRuler, Point, StitchElement } from '../types'
import { patternRows } from './parametricRows'
import { rowConstructionRowTotal } from './rowConstruction'

export const RULER_CORRIDOR_HALF_WIDTH = 8

export type RulerCorridorHit = {
  elementIds: string[]
  rowIds: string[]
}

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
  const row = elements.filter((element) => element.parametricRow?.id === rowId)
  if (!row.length) return null
  const count = rowConstructionRowTotal(row.length, row[0]?.parametricRow?.construction)
  return count * stitchWidthCm(profile)
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

export function reconcileRulerElementReferences(
  rulers: MeasurementRuler[],
  elements: StitchElement[],
) {
  const elementIds = new Set(elements.map((element) => element.id))
  let changed = false
  const next = rulers.map((ruler) => {
    const startElementId = ruler.startElementId && elementIds.has(ruler.startElementId)
      ? ruler.startElementId
      : undefined
    const endElementId = ruler.endElementId && elementIds.has(ruler.endElementId)
      ? ruler.endElementId
      : undefined
    if (startElementId === ruler.startElementId && endElementId === ruler.endElementId) return ruler
    changed = true
    return { ...ruler, startElementId, endElementId }
  })
  return changed ? next : rulers
}

function projectedHalfExtent(element: StitchElement, axis: Point) {
  const definition = SYMBOL_BY_ID.get(element.symbolId)
  const width = definition?.width ?? 30
  const height = definition?.height ?? 30
  const angle = element.rotation * Math.PI / 180
  const localX = { x: Math.cos(angle), y: Math.sin(angle) }
  const localY = { x: -Math.sin(angle), y: Math.cos(angle) }
  return Math.abs(axis.x * localX.x + axis.y * localX.y) * width / 2
    + Math.abs(axis.x * localY.x + axis.y * localY.y) * height / 2
}

export function rulerCorridorHits(
  ruler: MeasurementRuler,
  elements: StitchElement[],
  halfWidth = RULER_CORRIDOR_HALF_WIDTH,
): RulerCorridorHit {
  const dx = ruler.end.x - ruler.start.x
  const dy = ruler.end.y - ruler.start.y
  const length = Math.hypot(dx, dy)
  if (length < 1e-6) return { elementIds: [], rowIds: [] }
  const along = { x: dx / length, y: dy / length }
  const normal = { x: -along.y, y: along.x }
  const hits = elements.filter((element) => {
    if (element.visible === false) return false
    if (SYMBOL_BY_ID.get(element.symbolId)?.role === 'marker') return false
    const relative = { x: element.x - ruler.start.x, y: element.y - ruler.start.y }
    const t = relative.x * along.x + relative.y * along.y
    const cross = Math.abs(relative.x * normal.x + relative.y * normal.y)
    const alongRadius = projectedHalfExtent(element, along)
    const crossRadius = projectedHalfExtent(element, normal)
    return t >= -alongRadius && t <= length + alongRadius && cross <= halfWidth + crossRadius
  })
  const rowSet = new Set(hits.flatMap((element) => element.parametricRow?.id ? [element.parametricRow.id] : []))
  const orderedRows = patternRows(elements).map((row) => row.id).filter((id) => rowSet.has(id))
  return { elementIds: hits.map((element) => element.id), rowIds: orderedRows }
}

export function rulerCorridorPolygon(ruler: MeasurementRuler, halfWidth = RULER_CORRIDOR_HALF_WIDTH): Point[] {
  const dx = ruler.end.x - ruler.start.x
  const dy = ruler.end.y - ruler.start.y
  const length = Math.hypot(dx, dy)
  if (length < 1e-6) return []
  const nx = -dy / length * halfWidth
  const ny = dx / length * halfWidth
  return [
    { x: ruler.start.x + nx, y: ruler.start.y + ny },
    { x: ruler.end.x + nx, y: ruler.end.y + ny },
    { x: ruler.end.x - nx, y: ruler.end.y - ny },
    { x: ruler.start.x - nx, y: ruler.start.y - ny },
  ]
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
  const low = Math.min(startIndex, endIndex)
  const high = Math.max(startIndex, endIndex)
  return { count: high - low + 1, rowId, elementIds: row.slice(low, high + 1).map((element) => element.id) }
}

function automaticRulerRowCount(ruler: MeasurementRuler, elements: StitchElement[]) {
  if (!ruler.startElementId || !ruler.endElementId) return null
  const start = elements.find((element) => element.id === ruler.startElementId)
  const end = elements.find((element) => element.id === ruler.endElementId)
  const startRowId = start?.parametricRow?.id
  const endRowId = end?.parametricRow?.id
  if (!start || !end || !startRowId || !endRowId) return null
  const rows = patternRows(elements)
  const startIndex = rows.findIndex((row) => row.id === startRowId)
  const endIndex = rows.findIndex((row) => row.id === endRowId)
  if (startIndex < 0 || endIndex < 0) return null
  const low = Math.min(startIndex, endIndex)
  const high = Math.max(startIndex, endIndex)
  const rowIds = rows.slice(low, high + 1).map((row) => row.id)
  const rowSet = new Set(rowIds)
  return {
    count: high - low + 1,
    startRowId: rows[low]?.id,
    endRowId: rows[high]?.id,
    rowIds,
    elementIds: elements.filter((element) => element.parametricRow?.id && rowSet.has(element.parametricRow.id)).map((element) => element.id),
  }
}

export type RulerEstimate = {
  profile?: GaugeProfile
  stitchCount?: number
  rowCount?: number
  lengthCm?: number
  rowId?: string
  startRowId?: string
  endRowId?: string
  elementIds?: string[]
  rowIds?: string[]
  mode: 'stitches' | 'rows'
  source: 'automatic' | 'manual' | 'none'
  strategy?: 'semantic-endpoints' | 'corridor'
}

export function rulerEstimate(
  ruler: MeasurementRuler,
  elements: StitchElement[],
  gauge: GaugeSettings,
): RulerEstimate {
  const profile = gaugeProfileById(gauge, ruler.profileId)
  const mode = ruler.mode ?? 'stitches'
  const corridor = rulerCorridorHits(ruler, elements)

  if (mode === 'rows') {
    const endpointAutomatic = automaticRulerRowCount(ruler, elements)
    const corridorAutomatic = corridor.rowIds.length ? {
      count: corridor.rowIds.length,
      startRowId: corridor.rowIds[0],
      endRowId: corridor.rowIds[corridor.rowIds.length - 1],
      rowIds: corridor.rowIds,
      elementIds: corridor.elementIds,
    } : null
    const automatic = endpointAutomatic ?? corridorAutomatic
    const manual = ruler.manualRowCount && ruler.manualRowCount > 0 ? ruler.manualRowCount : null
    const rowCount = manual ?? automatic?.count ?? undefined
    const strategy = endpointAutomatic ? 'semantic-endpoints' : corridorAutomatic ? 'corridor' : undefined
    return {
      profile,
      mode,
      rowCount,
      startRowId: automatic?.startRowId,
      endRowId: automatic?.endRowId,
      rowIds: manual ? undefined : automatic?.rowIds,
      elementIds: manual ? undefined : automatic?.elementIds,
      strategy: manual ? undefined : strategy,
      source: manual ? 'manual' : automatic ? 'automatic' : 'none',
      lengthCm: profile && rowCount ? rowCount * rowHeightCm(profile) : undefined,
    }
  }

  const endpointAutomatic = automaticRulerStitchCount(ruler, elements)
  const corridorAutomatic = corridor.elementIds.length ? {
    count: corridor.elementIds.length,
    elementIds: corridor.elementIds,
    rowId: (() => {
      const ids = new Set(corridor.elementIds.map((id) => elements.find((element) => element.id === id)?.parametricRow?.id).filter(Boolean))
      return ids.size === 1 ? [...ids][0] as string : undefined
    })(),
  } : null
  const automatic = endpointAutomatic ?? corridorAutomatic
  const manual = ruler.manualStitchCount && ruler.manualStitchCount > 0 ? ruler.manualStitchCount : null
  const stitchCount = manual ?? automatic?.count ?? undefined
  const strategy = endpointAutomatic ? 'semantic-endpoints' : corridorAutomatic ? 'corridor' : undefined
  return {
    profile,
    mode,
    stitchCount,
    rowId: automatic?.rowId,
    elementIds: manual ? undefined : automatic?.elementIds,
    strategy: manual ? undefined : strategy,
    source: manual ? 'manual' : automatic ? 'automatic' : 'none',
    lengthCm: profile && stitchCount ? stitchCount * stitchWidthCm(profile) : undefined,
  }
}

function formattedNumber(value: number, locale: 'ru' | 'en') {
  return new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', { maximumFractionDigits: 1 }).format(value)
}

export function rulerDisplayLabel(
  ruler: MeasurementRuler,
  elements: StitchElement[],
  gauge: GaugeSettings,
  locale: 'ru' | 'en',
) {
  const estimate = rulerEstimate(ruler, elements, gauge)
  if (!estimate.profile) return locale === 'ru' ? 'Нет образца' : 'No gauge'
  if (estimate.mode === 'rows') {
    if (!estimate.rowCount || estimate.lengthCm == null) return locale === 'ru' ? 'Задайте число рядов' : 'Set row count'
    return locale === 'ru'
      ? `${estimate.rowCount} р. · ≈ ${formattedNumber(estimate.lengthCm, locale)} см`
      : `${estimate.rowCount} rows · ≈ ${formattedNumber(estimate.lengthCm, locale)} cm`
  }
  if (!estimate.stitchCount || estimate.lengthCm == null) return locale === 'ru' ? 'Задайте число петель' : 'Set stitch count'
  return locale === 'ru'
    ? `${estimate.stitchCount} п. · ≈ ${formattedNumber(estimate.lengthCm, locale)} см`
    : `${estimate.stitchCount} sts · ≈ ${formattedNumber(estimate.lengthCm, locale)} cm`
}
'''
write('src/editor/gauge.ts', gauge)

ruler_layer = r'''import type { PointerEvent as ReactPointerEvent } from 'react'
import { SYMBOL_BY_ID } from '../symbols'
import type { GaugeSettings, MeasurementRuler, Point, StitchElement } from '../types'
import { rulerCorridorPolygon, rulerDisplayLabel, rulerEstimate } from './gauge'

function midpoint(start: Point, end: Point) {
  return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }
}

export function RulerLayer({ rulers, selectedId, draft, elements, gauge, locale, zoom, onSelect, onHandlePointerDown }: {
  rulers: MeasurementRuler[]
  selectedId: string | null
  draft: { start: Point; end: Point } | null
  elements: StitchElement[]
  gauge: GaugeSettings
  locale: 'ru' | 'en'
  zoom: number
  onSelect: (id: string) => void
  onHandlePointerDown: (event: ReactPointerEvent<SVGCircleElement>, ruler: MeasurementRuler, endpoint: 'start' | 'end') => void
}) {
  const byId = new Map(elements.map((element) => [element.id, element]))
  return (
    <g className="measurement-rulers">
      {rulers.map((ruler) => {
        const selected = ruler.id === selectedId
        const center = midpoint(ruler.start, ruler.end)
        const label = rulerDisplayLabel(ruler, elements, gauge, locale)
        const estimate = rulerEstimate(ruler, elements, gauge)
        const corridor = selected ? rulerCorridorPolygon(ruler) : []
        const counted = selected && estimate.source === 'automatic' ? (estimate.elementIds ?? []) : []
        return (
          <g key={ruler.id} className={`measurement-ruler ${selected ? 'selected' : ''}`} data-ruler-id={ruler.id}>
            {corridor.length === 4 && (
              <polygon
                points={corridor.map((point) => `${point.x},${point.y}`).join(' ')}
                className="ruler-corridor"
                data-testid="ruler-corridor"
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
              />
            )}
            {counted.map((id) => {
              const element = byId.get(id)
              if (!element) return null
              const definition = SYMBOL_BY_ID.get(element.symbolId)
              const width = (definition?.width ?? 30) + 8 / zoom
              const height = (definition?.height ?? 30) + 8 / zoom
              return (
                <rect
                  key={`counted:${id}`}
                  x={-width / 2}
                  y={-height / 2}
                  width={width}
                  height={height}
                  rx={5 / zoom}
                  transform={`translate(${element.x} ${element.y}) rotate(${element.rotation})`}
                  className="ruler-counted-element"
                  data-counted-element-id={id}
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                />
              )
            })}
            <line x1={ruler.start.x} y1={ruler.start.y} x2={ruler.end.x} y2={ruler.end.y} className="ruler-hit-line" strokeWidth={16 / zoom} pointerEvents="none" />
            <line x1={ruler.start.x} y1={ruler.start.y} x2={ruler.end.x} y2={ruler.end.y} className="ruler-line" vectorEffect="non-scaling-stroke" pointerEvents="none" />
            <line x1={ruler.start.x} y1={ruler.start.y - 7 / zoom} x2={ruler.start.x} y2={ruler.start.y + 7 / zoom} className="ruler-tick" vectorEffect="non-scaling-stroke" pointerEvents="none" />
            <line x1={ruler.end.x} y1={ruler.end.y - 7 / zoom} x2={ruler.end.x} y2={ruler.end.y + 7 / zoom} className="ruler-tick" vectorEffect="non-scaling-stroke" pointerEvents="none" />
            <text
              x={center.x}
              y={center.y - 10 / zoom}
              className="ruler-label"
              fontSize={12 / zoom}
              strokeWidth={4 / zoom}
              textAnchor="middle"
              pointerEvents="auto"
              onPointerDown={(event) => {
                if (event.button !== 0) return
                event.stopPropagation()
                onSelect(ruler.id)
              }}
            >{label}</text>
            {selected && (
              <>
                <circle cx={ruler.start.x} cy={ruler.start.y} r={7 / zoom} className="ruler-handle" vectorEffect="non-scaling-stroke" onPointerDown={(event) => onHandlePointerDown(event, ruler, 'start')} />
                <circle cx={ruler.end.x} cy={ruler.end.y} r={7 / zoom} className="ruler-handle" vectorEffect="non-scaling-stroke" onPointerDown={(event) => onHandlePointerDown(event, ruler, 'end')} />
              </>
            )}
          </g>
        )
      })}
      {draft && (
        <g className="measurement-ruler draft" pointerEvents="none">
          <line x1={draft.start.x} y1={draft.start.y} x2={draft.end.x} y2={draft.end.y} className="ruler-line" vectorEffect="non-scaling-stroke" />
          <circle cx={draft.start.x} cy={draft.start.y} r={5 / zoom} className="ruler-draft-point" vectorEffect="non-scaling-stroke" />
          <circle cx={draft.end.x} cy={draft.end.y} r={5 / zoom} className="ruler-draft-point" vectorEffect="non-scaling-stroke" />
        </g>
      )}
    </g>
  )
}
'''
write('src/editor/RulerLayer.tsx', ruler_layer)

# Panel copy: explain corridor and report which auto strategy was used.
replace_once('src/editor/GaugeRulerPanel.tsx',
"? 'Две точки. В режиме петель считаются петли одного ряда; в режиме рядов — семантические ряды между точками.'\n            : 'Pick two points. Stitch mode counts one row; row mode counts semantic rows between endpoints.'",
"? 'Проведите линейку через схему: полупрозрачный коридор автоматически считает пересечённые элементы. Для привязанных точек одного ряда сохраняется точный семантический диапазон.'\n            : 'Draw through the chart: the translucent corridor automatically counts intersected elements. Endpoints snapped to one semantic row keep the exact row range.'")
replace_once('src/editor/GaugeRulerPanel.tsx', "Рядов вручную (0 = авто)", "Рядов вручную (переопределить авто)")
replace_once('src/editor/GaugeRulerPanel.tsx', "Manual rows (0 = auto)", "Manual rows (override auto)")
replace_once('src/editor/GaugeRulerPanel.tsx', "Петель вручную (0 = авто)", "Петель вручную (переопределить авто)")
replace_once('src/editor/GaugeRulerPanel.tsx', "Manual stitches (0 = auto)", "Manual stitches (override auto)")
replace_once('src/editor/GaugeRulerPanel.tsx',
"return <small>{ru ? `Автоматически между рядами: ${estimate.rowCount} р.` : `Automatic between rows: ${estimate.rowCount} rows`}</small>",
"return <small data-testid=\"ruler-auto-summary\">{estimate.strategy === 'corridor'\n                    ? (ru ? `Авто по коридору: ${estimate.rowCount} р. · подсвечено ${estimate.elementIds?.length ?? 0} элементов` : `Corridor auto-count: ${estimate.rowCount} rows · ${estimate.elementIds?.length ?? 0} highlighted elements`)\n                    : (ru ? `Автоматически между рядами: ${estimate.rowCount} р.` : `Automatic between rows: ${estimate.rowCount} rows`)}</small>")
replace_once('src/editor/GaugeRulerPanel.tsx',
"return <small>{ru ? `Автоматически по ряду: ${estimate.stitchCount} петель` : `Automatic from row: ${estimate.stitchCount} stitches`}</small>",
"return <small data-testid=\"ruler-auto-summary\">{estimate.strategy === 'corridor'\n                  ? (ru ? `Авто по коридору: ${estimate.stitchCount} петель` : `Corridor auto-count: ${estimate.stitchCount} stitches`)\n                  : (ru ? `Автоматически по ряду: ${estimate.stitchCount} петель` : `Automatic from row: ${estimate.stitchCount} stitches`)}</small>")
replace_once('src/editor/GaugeRulerPanel.tsx',
"return <small>{ru ? 'Привяжите точки к параметрическим рядам или укажите число рядов вручную.' : 'Snap endpoints to parametric rows or enter the row count manually.'}</small>",
"return <small>{ru ? 'Проведите коридор через параметрические ряды или укажите число рядов вручную.' : 'Draw the corridor through semantic rows or enter the row count manually.'}</small>")

# Visual corridor + counted-item highlight.
styles = Path('src/styles.css')
styles.write_text(styles.read_text(encoding='utf-8') + r'''

/* v1.22 Smart Ruler corridor */
.ruler-corridor {
  fill: rgba(48, 116, 86, .10);
  stroke: rgba(48, 116, 86, .38);
  stroke-width: 1;
  stroke-dasharray: 5 4;
}
.ruler-counted-element {
  fill: rgba(52, 132, 94, .08);
  stroke: #2f8a64;
  stroke-width: 1.5;
  stroke-dasharray: 3 2;
}
''', encoding='utf-8')

# Unit coverage: free stitches, semantic rows without endpoint refs, marker/hidden exclusion.
test_path = Path('src/editor/gauge.test.ts')
test_text = test_path.read_text(encoding='utf-8')
test_text = test_text.replace('  rulerEstimate,\n', '  rulerCorridorHits,\n  rulerEstimate,\n', 1)
insert = r'''
  it('counts free stitches geometrically through the finite ruler corridor', () => {
    const free: StitchElement[] = [0, 22, 44, 66].map((x, index) => ({
      id: `chain-${index}`,
      symbolId: 'chain',
      x,
      y: 0,
      rotation: 0,
    }))
    const ruler: MeasurementRuler = { id: 'corridor-free', start: { x: -10, y: 0 }, end: { x: 76, y: 0 } }
    const estimate = rulerEstimate(ruler, free, gauge)
    expect(estimate).toMatchObject({ stitchCount: 4, source: 'automatic', strategy: 'corridor' })
    expect(estimate.elementIds).toEqual(free.map((element) => element.id))
  })

  it('counts unique semantic rows crossed by a free corridor without endpoint attachments', () => {
    const ruler: MeasurementRuler = { id: 'corridor-rows', start: { x: 0, y: 28 }, end: { x: 0, y: 92 }, mode: 'rows' }
    expect(rulerEstimate(ruler, elements, gauge)).toMatchObject({
      rowCount: 2,
      source: 'automatic',
      strategy: 'corridor',
      rowIds: ['row-1', 'row-2'],
    })
  })

  it('ignores hidden stitches and marker symbols in corridor hit testing', () => {
    const sample: StitchElement[] = [
      { id: 'visible', symbolId: 'chain', x: 0, y: 0, rotation: 0 },
      { id: 'hidden', symbolId: 'chain', x: 22, y: 0, rotation: 0, visible: false },
      { id: 'marker', symbolId: 'start-marker', x: 44, y: 0, rotation: 0 },
    ]
    const hits = rulerCorridorHits({ id: 'filter', start: { x: -20, y: 0 }, end: { x: 60, y: 0 } }, sample)
    expect(hits.elementIds).toEqual(['visible'])
  })
'''
pos = test_text.rfind('\n})')
if pos < 0:
    raise SystemExit('gauge.test.ts closing describe not found')
test_path.write_text(test_text[:pos] + '\n' + insert + test_text[pos:], encoding='utf-8')

# Browser regression on v1.21 composite chains: no parametricRow exists, so corridor must be the auto source.
e2e_path = Path('e2e/gaugeRuler.e2e.ts')
e2e_text = e2e_path.read_text(encoding='utf-8')
e2e_text += r'''

test('corridor auto-counts a free 4-chain motif and highlights all counted stitches', async ({ page }) => {
  await page.goto('/Crochet-Scheme-Editor/')
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')

  const gauge = page.locator('.gauge-panel')
  await gauge.getByRole('button', { name: 'Добавить образец плотности' }).click()
  await gauge.getByLabel('Петель в образце').fill('20')
  await gauge.getByLabel('Петель в образце').press('Enter')
  await gauge.getByLabel('Ширина образца в сантиметрах').fill('10')
  await gauge.getByLabel('Ширина образца в сантиметрах').press('Enter')

  await page.getByRole('button', { name: /4 воздушные петли/ }).click()
  const canvas = page.locator('svg.editor-canvas')
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  await canvas.click({ position: { x: box!.width * 0.55, y: box!.height * 0.52 } })
  await expect(page.locator('.stitch-element')).toHaveCount(4)

  await gauge.getByRole('button', { name: 'Поставить линейку' }).click()
  await page.locator('.stitch-element').first().click()
  await page.locator('.stitch-element').last().click()

  const ruler = page.locator('.measurement-ruler').first()
  await expect(ruler.locator('.ruler-label')).toContainText('4 п.')
  await expect(gauge.getByTestId('ruler-auto-summary')).toContainText('Авто по коридору: 4 петель')
  await expect(ruler.getByTestId('ruler-corridor')).toBeVisible()
  await expect(ruler.locator('.ruler-counted-element')).toHaveCount(4)
})
'''
e2e_path.write_text(e2e_text, encoding='utf-8')

# Release metadata. Schema intentionally remains 21.
for path in ['src/i18n.ts']:
    p = Path(path)
    p.write_text(p.read_text(encoding='utf-8').replace('v1.21.0', 'v1.22.0'), encoding='utf-8')

readme = Path('README.md')
text = readme.read_text(encoding='utf-8')
anchor = 'Browser-based semantic editor for crochet charts and written patterns.\n'
section = '''\n## v1.22.0\n\nSmart Ruler corridor release: free measurement rulers now auto-count visible stitch geometry intersected by a finite translucent corridor, including manual/non-parametric motifs such as the 2/3/4-chain presets. Row mode counts unique semantic rows crossed by the corridor, selected rulers highlight the elements contributing to automatic counts, and explicit manual counts remain available as an override/fallback. Existing same-row endpoint snapping retains its exact semantic range behavior. Project schema remains v21.\n'''
if section.strip() not in text:
    text = text.replace(anchor, anchor + section, 1)
readme.write_text(text, encoding='utf-8')

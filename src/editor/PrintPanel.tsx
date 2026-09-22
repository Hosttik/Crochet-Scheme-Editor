import { useMemo, useState } from 'react'
import {
  DEFAULT_PRINT_SETTINGS,
  layoutPrintTiles,
  type PrintBounds,
  type PrintMode,
  type PrintOrientation,
  type PrintPaper,
  type PrintSettings,
  type PrintTile,
} from './printLayout'

type Props = {
  locale: 'ru' | 'en'
  bounds: PrintBounds
  legendBounds?: PrintBounds | null
  onPrint: (settings: PrintSettings) => void
}

type PreviewOverlap = {
  key: string
  x: number
  y: number
  width: number
  height: number
  axis: 'horizontal' | 'vertical'
  first: PrintTile
  second: PrintTile
}

function previewViewBox(bounds: PrintBounds, tiles: PrintTile[]) {
  const left = Math.min(bounds.left, ...tiles.map((tile) => tile.x))
  const top = Math.min(bounds.top, ...tiles.map((tile) => tile.y))
  const right = Math.max(bounds.left + bounds.width, ...tiles.map((tile) => tile.x + tile.width))
  const bottom = Math.max(bounds.top + bounds.height, ...tiles.map((tile) => tile.y + tile.height))
  const pad = Math.max(12, Math.max(right - left, bottom - top) * 0.03)
  return `${left - pad} ${top - pad} ${right - left + pad * 2} ${bottom - top + pad * 2}`
}

function intersect(first: PrintTile, second: PrintTile) {
  const left = Math.max(first.x, second.x)
  const top = Math.max(first.y, second.y)
  const right = Math.min(first.x + first.width, second.x + second.width)
  const bottom = Math.min(first.y + first.height, second.y + second.height)
  if (right <= left || bottom <= top) return null
  return { x: left, y: top, width: right - left, height: bottom - top }
}

function previewOverlaps(tiles: PrintTile[], columns: number, rows: number) {
  const tileAt = (row: number, column: number) => tiles.find((tile) => tile.row === row && tile.column === column)
  const overlaps: PreviewOverlap[] = []
  for (const tile of tiles) {
    if (tile.column < columns - 1) {
      const next = tileAt(tile.row, tile.column + 1)
      const overlap = next ? intersect(tile, next) : null
      if (next && overlap) overlaps.push({ key: `h-${tile.row}-${tile.column}`, ...overlap, axis: 'horizontal', first: tile, second: next })
    }
    if (tile.row < rows - 1) {
      const next = tileAt(tile.row + 1, tile.column)
      const overlap = next ? intersect(tile, next) : null
      if (next && overlap) overlaps.push({ key: `v-${tile.row}-${tile.column}`, ...overlap, axis: 'vertical', first: tile, second: next })
    }
  }
  return overlaps
}

function contains(tile: PrintTile, point: { x: number; y: number }) {
  return point.x >= tile.x && point.x <= tile.x + tile.width && point.y >= tile.y && point.y <= tile.y + tile.height
}

function scaleLabel(value: number) {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

export function PrintPanel({ locale, bounds, legendBounds, onPrint }: Props) {
  const [settings, setSettings] = useState<PrintSettings>(DEFAULT_PRINT_SETTINGS)
  const ru = locale === 'ru'
  const layout = useMemo(() => layoutPrintTiles(bounds, settings), [bounds, settings])
  const previewBox = useMemo(() => previewViewBox(bounds, layout.tiles), [bounds, layout.tiles])
  const overlaps = useMemo(
    () => previewOverlaps(layout.tiles, layout.columns, layout.rows),
    [layout.columns, layout.rows, layout.tiles],
  )
  const markerSize = Math.max(5, Math.min(layout.tiles[0]?.width ?? 100, layout.tiles[0]?.height ?? 100) * 0.025)
  const legendHostIndex = useMemo(() => {
    if (!legendBounds) return -1
    const center = { x: legendBounds.left + legendBounds.width / 2, y: legendBounds.top + legendBounds.height / 2 }
    let result = -1
    layout.tiles.forEach((tile, index) => {
      if (contains(tile, center)) result = index
    })
    return result < 0 ? layout.tiles.length - 1 : result
  }, [layout.tiles, legendBounds])

  const patch = (next: Partial<PrintSettings>) => setSettings((current) => ({ ...current, ...next }))
  const autoScale = settings.mode !== 'actual-size'
  const singlePage = layout.tiles.length === 1
  const orientationLabel = layout.resolvedOrientation === 'landscape'
    ? ru ? 'альбомная' : 'landscape'
    : ru ? 'книжная' : 'portrait'

  return (
    <section className="panel-section print-panel" data-testid="print-panel">
      <div className="section-title-row">
        <h2>{ru ? 'Печать' : 'Print'}</h2>
        <span className="badge" data-testid="print-page-count">{layout.tiles.length}</span>
      </div>

      <div className="print-settings-grid">
        <label className="print-mode-field">
          <span>{ru ? 'Режим' : 'Mode'}</span>
          <select
            data-testid="print-mode"
            value={settings.mode}
            onChange={(event) => patch({ mode: event.target.value as PrintMode })}
          >
            <option value="actual-size">{ru ? 'Заданный масштаб' : 'Fixed scale'}</option>
            <option value="fit-one">{ru ? 'Уместить на 1 лист' : 'Fit on one page'}</option>
            <option value="fixed-grid">{ru ? 'Задать число листов' : 'Choose page grid'}</option>
          </select>
        </label>

        <label>
          <span>{ru ? 'Бумага' : 'Paper'}</span>
          <select value={settings.paper} onChange={(event) => patch({ paper: event.target.value as PrintPaper })}>
            <option value="a4">A4</option>
            <option value="letter">Letter</option>
          </select>
        </label>

        <label>
          <span>{settings.mode === 'fit-one' ? (ru ? 'Ориентация · авто' : 'Orientation · auto') : (ru ? 'Ориентация' : 'Orientation')}</span>
          <select
            data-testid="print-orientation"
            disabled={settings.mode === 'fit-one'}
            value={settings.mode === 'fit-one' ? layout.resolvedOrientation : settings.orientation}
            onChange={(event) => patch({ orientation: event.target.value as PrintOrientation })}
          >
            <option value="portrait">{ru ? 'Книжная' : 'Portrait'}</option>
            <option value="landscape">{ru ? 'Альбомная' : 'Landscape'}</option>
          </select>
        </label>

        {settings.mode === 'fixed-grid' && (
          <>
            <label>
              <span>{ru ? 'Листов по горизонтали' : 'Pages horizontally'}</span>
              <input
                data-testid="print-page-columns"
                type="number"
                min="1"
                max="12"
                step="1"
                value={settings.pageColumns}
                onChange={(event) => patch({ pageColumns: Math.max(1, Math.min(12, Math.round(Number(event.target.value) || 1))) })}
              />
            </label>
            <label>
              <span>{ru ? 'Листов по вертикали' : 'Pages vertically'}</span>
              <input
                data-testid="print-page-rows"
                type="number"
                min="1"
                max="12"
                step="1"
                value={settings.pageRows}
                onChange={(event) => patch({ pageRows: Math.max(1, Math.min(12, Math.round(Number(event.target.value) || 1))) })}
              />
            </label>
          </>
        )}

        <label>
          <span>{autoScale ? (ru ? 'Масштаб · авто' : 'Scale · auto') : (ru ? 'Масштаб' : 'Scale')}</span>
          <input
            data-testid="print-scale"
            type="number"
            min="1"
            max="400"
            step="5"
            disabled={autoScale}
            value={autoScale ? scaleLabel(layout.resolvedScalePercent) : settings.scalePercent}
            onChange={(event) => patch({ scalePercent: Number(event.target.value) || 100 })}
          />
          <small>%</small>
        </label>

        <label>
          <span>{ru ? 'Перекрытие' : 'Overlap'}</span>
          <input
            data-testid="print-overlap"
            type="number"
            min="0"
            max="30"
            step="1"
            disabled={settings.mode === 'fit-one'}
            value={settings.overlapMm}
            onChange={(event) => patch({ overlapMm: Math.max(0, Number(event.target.value) || 0) })}
          />
          <small>mm</small>
        </label>
      </div>

      {settings.mode === 'fit-one' && (
        <small className="muted-text print-mode-hint">
          {ru
            ? `Редактор автоматически выбрал: ${orientationLabel}, масштаб ${scaleLabel(layout.resolvedScalePercent)}%.`
            : `Automatically selected: ${orientationLabel}, ${scaleLabel(layout.resolvedScalePercent)}% scale.`}
        </small>
      )}
      {settings.mode === 'fixed-grid' && (
        <small className="muted-text print-mode-hint">
          {ru
            ? `Схема будет автоматически масштабирована ровно на ${settings.pageColumns} × ${settings.pageRows} листов.`
            : `The chart will be scaled to exactly ${settings.pageColumns} × ${settings.pageRows} pages.`}
        </small>
      )}

      <label className="toggle-row compact-toggle">
        <span>{ru ? 'Печатать рамки страниц' : 'Print page frames'}</span>
        <input data-testid="print-page-frames" type="checkbox" checked={settings.pageFrames} onChange={(event) => patch({ pageFrames: event.target.checked })} />
      </label>
      <label className="toggle-row compact-toggle">
        <span>
          <strong>{ru ? 'Метки совмещения' : 'Alignment marks'}</strong>
          <small>{ru ? 'Кресты совпадают на соседних листах внутри зоны перекрытия.' : 'Crosses represent matching points inside adjacent overlap areas.'}</small>
        </span>
        <input
          data-testid="print-alignment-marks"
          type="checkbox"
          checked={settings.alignmentMarks}
          disabled={singlePage || settings.overlapMm <= 0}
          onChange={(event) => patch({ alignmentMarks: event.target.checked })}
        />
      </label>

      <div className="print-tile-preview" data-testid="print-tile-preview">
        <svg viewBox={previewBox} aria-label={ru ? 'Предпросмотр сборки страниц' : 'Page assembly preview'}>
          <defs>
            <marker id="printPreviewArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
              <path d="M 0 0 L 8 4 L 0 8 z" />
            </marker>
          </defs>
          <rect x={bounds.left} y={bounds.top} width={bounds.width} height={bounds.height} className="print-preview-content" />

          {overlaps.map((overlap) => (
            <rect
              key={`overlap-${overlap.key}`}
              data-testid="print-preview-overlap"
              x={overlap.x}
              y={overlap.y}
              width={overlap.width}
              height={overlap.height}
              className="print-preview-overlap"
            />
          ))}

          {layout.tiles.map((tile, index) => {
            const next = layout.tiles[index + 1]
            const center = { x: tile.x + tile.width / 2, y: tile.y + tile.height / 2 }
            const nextCenter = next ? { x: next.x + next.width / 2, y: next.y + next.height / 2 } : null
            const arrowStart = nextCenter ? {
              x: center.x + (nextCenter.x - center.x) * 0.13,
              y: center.y + (nextCenter.y - center.y) * 0.13,
            } : null
            const arrowEnd = nextCenter ? {
              x: center.x + (nextCenter.x - center.x) * 0.32,
              y: center.y + (nextCenter.y - center.y) * 0.32,
            } : null
            return (
              <g key={`${tile.row}-${tile.column}`}>
                <rect
                  data-testid="print-preview-frame"
                  x={tile.x}
                  y={tile.y}
                  width={tile.width}
                  height={tile.height}
                  className="print-preview-frame"
                  vectorEffect="non-scaling-stroke"
                />
                <text x={tile.x + 8} y={tile.y + 16} className="print-preview-label">{index + 1}</text>
                {arrowStart && arrowEnd && (
                  <line
                    data-testid="print-preview-assembly-arrow"
                    x1={arrowStart.x}
                    y1={arrowStart.y}
                    x2={arrowEnd.x}
                    y2={arrowEnd.y}
                    className="print-preview-assembly-arrow"
                    markerEnd="url(#printPreviewArrow)"
                    vectorEffect="non-scaling-stroke"
                  />
                )}
                {index === legendHostIndex && legendBounds && (
                  <g data-testid="print-preview-legend" className="print-preview-legend">
                    <rect
                      x={tile.x + tile.width * 0.68}
                      y={tile.y + tile.height * 0.06}
                      width={tile.width * 0.27}
                      height={tile.height * 0.16}
                      rx={3}
                      vectorEffect="non-scaling-stroke"
                    />
                    <text x={tile.x + tile.width * 0.815} y={tile.y + tile.height * 0.145} textAnchor="middle">
                      {ru ? 'Легенда' : 'Legend'}
                    </text>
                  </g>
                )}
              </g>
            )
          })}

          {settings.alignmentMarks && settings.overlapMm > 0 && overlaps.flatMap((overlap) => {
            const positions = overlap.axis === 'horizontal'
              ? [0.28, 0.72].map((ratio) => ({ x: overlap.x + overlap.width / 2, y: overlap.first.y + overlap.first.height * ratio }))
              : [0.28, 0.72].map((ratio) => ({ x: overlap.first.x + overlap.first.width * ratio, y: overlap.y + overlap.height / 2 }))
            return positions.map((point, index) => (
              <g key={`mark-${overlap.key}-${index}`} data-testid="print-preview-registration-mark" className="print-preview-registration-mark">
                <line x1={point.x - markerSize} y1={point.y} x2={point.x + markerSize} y2={point.y} vectorEffect="non-scaling-stroke" />
                <line x1={point.x} y1={point.y - markerSize} x2={point.x} y2={point.y + markerSize} vectorEffect="non-scaling-stroke" />
              </g>
            ))
          })}
        </svg>
      </div>

      <p className="print-summary">
        {ru
          ? `${layout.columns} × ${layout.rows} стр. · ${layout.tiles.length} всего · ${orientationLabel} · масштаб ${scaleLabel(layout.resolvedScalePercent)}%${!singlePage ? ` · перекрытие ${settings.overlapMm} мм` : ''}${legendHostIndex >= 0 ? ` · легенда: стр. ${legendHostIndex + 1}` : ''}`
          : `${layout.columns} × ${layout.rows} pages · ${layout.tiles.length} total · ${orientationLabel} · ${scaleLabel(layout.resolvedScalePercent)}% scale${!singlePage ? ` · ${settings.overlapMm} mm overlap` : ''}${legendHostIndex >= 0 ? ` · legend: page ${legendHostIndex + 1}` : ''}`}
      </p>
      <button className="primary-button print-button" onClick={() => onPrint(settings)}>
        {ru ? 'Открыть печать' : 'Open print view'}
      </button>
      <small className="muted-text">
        {ru
          ? 'Предпросмотр показывает реальное разбиение. В диалоге браузера оставьте масштаб 100% — редактор уже учитывает выбранный режим и число листов.'
          : 'The preview shows the actual page split. Keep the browser print dialog at 100% — the editor already accounts for the selected mode and page count.'}
      </small>
    </section>
  )
}

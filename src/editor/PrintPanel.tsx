import { useMemo, useState } from 'react'
import {
  DEFAULT_PRINT_SETTINGS,
  layoutPrintTiles,
  type PrintBounds,
  type PrintOrientation,
  type PrintPaper,
  type PrintSettings,
} from './printLayout'

type Props = {
  locale: 'ru' | 'en'
  bounds: PrintBounds
  onPrint: (settings: PrintSettings) => void
}

function previewViewBox(bounds: PrintBounds, tiles: { x: number; y: number; width: number; height: number }[]) {
  const left = Math.min(bounds.left, ...tiles.map((tile) => tile.x))
  const top = Math.min(bounds.top, ...tiles.map((tile) => tile.y))
  const right = Math.max(bounds.left + bounds.width, ...tiles.map((tile) => tile.x + tile.width))
  const bottom = Math.max(bounds.top + bounds.height, ...tiles.map((tile) => tile.y + tile.height))
  const pad = Math.max(12, Math.max(right - left, bottom - top) * 0.03)
  return `${left - pad} ${top - pad} ${right - left + pad * 2} ${bottom - top + pad * 2}`
}

export function PrintPanel({ locale, bounds, onPrint }: Props) {
  const [settings, setSettings] = useState<PrintSettings>(DEFAULT_PRINT_SETTINGS)
  const ru = locale === 'ru'
  const layout = useMemo(() => layoutPrintTiles(bounds, settings), [bounds, settings])
  const previewBox = useMemo(() => previewViewBox(bounds, layout.tiles), [bounds, layout.tiles])

  const patch = (next: Partial<PrintSettings>) => setSettings((current) => ({ ...current, ...next }))

  return (
    <section className="panel-section print-panel" data-testid="print-panel">
      <div className="section-title-row">
        <h2>{ru ? 'Печать по страницам' : 'Tiled print'}</h2>
        <span className="badge" data-testid="print-page-count">{layout.tiles.length}</span>
      </div>
      <div className="print-settings-grid">
        <label>
          <span>{ru ? 'Бумага' : 'Paper'}</span>
          <select value={settings.paper} onChange={(event) => patch({ paper: event.target.value as PrintPaper })}>
            <option value="a4">A4</option>
            <option value="letter">Letter</option>
          </select>
        </label>
        <label>
          <span>{ru ? 'Ориентация' : 'Orientation'}</span>
          <select value={settings.orientation} onChange={(event) => patch({ orientation: event.target.value as PrintOrientation })}>
            <option value="portrait">{ru ? 'Книжная' : 'Portrait'}</option>
            <option value="landscape">{ru ? 'Альбомная' : 'Landscape'}</option>
          </select>
        </label>
        <label>
          <span>{ru ? 'Масштаб' : 'Scale'}</span>
          <input data-testid="print-scale" type="number" min="10" max="400" step="5" value={settings.scalePercent} onChange={(event) => patch({ scalePercent: Number(event.target.value) || 100 })} />
          <small>%</small>
        </label>
        <label>
          <span>{ru ? 'Перекрытие' : 'Overlap'}</span>
          <input type="number" min="0" max="30" step="1" value={settings.overlapMm} onChange={(event) => patch({ overlapMm: Math.max(0, Number(event.target.value) || 0) })} />
          <small>mm</small>
        </label>
      </div>
      <label className="toggle-row compact-toggle">
        <span>{ru ? 'Печатать рамки страниц' : 'Print page frames'}</span>
        <input data-testid="print-page-frames" type="checkbox" checked={settings.pageFrames} onChange={(event) => patch({ pageFrames: event.target.checked })} />
      </label>
      <div className="print-tile-preview" data-testid="print-tile-preview">
        <svg viewBox={previewBox} aria-label={ru ? 'Предпросмотр рамок страниц' : 'Page-frame preview'}>
          <rect x={bounds.left} y={bounds.top} width={bounds.width} height={bounds.height} className="print-preview-content" />
          {layout.tiles.map((tile, index) => (
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
            </g>
          ))}
        </svg>
      </div>
      <p className="print-summary">
        {ru
          ? `${layout.columns} × ${layout.rows} стр. · ${layout.tiles.length} всего`
          : `${layout.columns} × ${layout.rows} pages · ${layout.tiles.length} total`}
      </p>
      <button className="primary-button print-button" onClick={() => onPrint(settings)}>
        {ru ? 'Открыть печать' : 'Open print view'}
      </button>
      <small className="muted-text">{ru ? 'Предпросмотр показывает реальные границы и перекрытие страниц. Для физически точного масштаба в диалоге браузера оставьте 100%.' : 'Preview shows the actual page boundaries and overlap. For physical scale fidelity, keep the browser print dialog at 100%.'}</small>
    </section>
  )
}

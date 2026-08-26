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

export function PrintPanel({ locale, bounds, onPrint }: Props) {
  const [settings, setSettings] = useState<PrintSettings>(DEFAULT_PRINT_SETTINGS)
  const ru = locale === 'ru'
  const layout = useMemo(() => layoutPrintTiles(bounds, settings), [bounds, settings])

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
        <span>{ru ? 'Метки обрезки' : 'Crop marks'}</span>
        <input type="checkbox" checked={settings.cropMarks} onChange={(event) => patch({ cropMarks: event.target.checked })} />
      </label>
      <p className="print-summary">
        {ru
          ? `${layout.columns} × ${layout.rows} стр. · ${layout.tiles.length} всего`
          : `${layout.columns} × ${layout.rows} pages · ${layout.tiles.length} total`}
      </p>
      <button className="primary-button print-button" onClick={() => onPrint(settings)}>
        {ru ? 'Открыть печать' : 'Open print view'}
      </button>
      <small className="muted-text">{ru ? 'Для физически точного масштаба в диалоге браузера оставьте 100%.' : 'For physical scale fidelity, keep the browser print dialog at 100%.'}</small>
    </section>
  )
}

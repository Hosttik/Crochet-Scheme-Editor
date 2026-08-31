import type { ComponentProps, RefObject } from 'react'
import { BackgroundImagePanel } from '../editor/BackgroundImagePanel'
import { GaugeRulerPanel } from '../editor/GaugeRulerPanel'
import { LegendPanel } from '../editor/LegendPanel'
import { PatternRowsPanel } from '../editor/PatternRowsPanel'
import { PrintPanel } from '../editor/PrintPanel'
import { RowMarkersPanel } from '../editor/RowMarkersPanel'
import { UI, type Locale } from '../i18n'
import type { AnchorName, OrientationMode, SnappingSettings } from '../types'

type PanelRef = RefObject<HTMLDetailsElement | null>
type BackgroundPanelProps = Omit<ComponentProps<typeof BackgroundImagePanel>, 'locale'>
type GaugePanelProps = Omit<ComponentProps<typeof GaugeRulerPanel>, 'locale'>
type PrintPanelProps = Omit<ComponentProps<typeof PrintPanel>, 'locale'>
type PatternRowsPanelProps = Omit<ComponentProps<typeof PatternRowsPanel>, 'locale'>
type RowMarkersPanelProps = Omit<ComponentProps<typeof RowMarkersPanel>, 'locale'>
type LegendPanelProps = Omit<ComponentProps<typeof LegendPanel>, 'locale'>

export type RightOptionsPanelsProps = {
  locale: Locale
  gaugePanelRef: PanelRef
  printPanelRef: PanelRef
  snappingPanelRef: PanelRef
  patternRowsPanelRef: PanelRef
  rowMarkersPanelRef: PanelRef
  legendPanelRef: PanelRef
  helpPanelRef: PanelRef
  backgroundPanelProps: BackgroundPanelProps
  gaugePanelProps: GaugePanelProps
  printPanelProps: PrintPanelProps
  patternRowsPanelProps: PatternRowsPanelProps
  rowMarkersPanelProps: RowMarkersPanelProps
  legendPanelProps: LegendPanelProps
  snapping: SnappingSettings
  onSnappingEnabledChange: (enabled: boolean) => void
  onSourceAnchorChange: (sourceAnchor: AnchorName) => void
  onOrientationChange: (orientationMode: OrientationMode) => void
  onSnapToVerticesChange: (snapToVertices: boolean) => void
  onToleranceChange: (tolerancePx: number) => void
}

export function RightOptionsPanels({
  locale,
  gaugePanelRef,
  printPanelRef,
  snappingPanelRef,
  patternRowsPanelRef,
  rowMarkersPanelRef,
  legendPanelRef,
  helpPanelRef,
  backgroundPanelProps,
  gaugePanelProps,
  printPanelProps,
  patternRowsPanelProps,
  rowMarkersPanelProps,
  legendPanelProps,
  snapping,
  onSnappingEnabledChange,
  onSourceAnchorChange,
  onOrientationChange,
  onSnapToVerticesChange,
  onToleranceChange,
}: RightOptionsPanelsProps) {
  const t = UI[locale]
  const anchorLabels: Record<AnchorName, string> = {
    top: t.top,
    center: t.center,
    bottom: t.bottom,
  }
  const groupLabels = locale === 'ru'
    ? { construction: 'Построение схемы', document: 'Документ и вывод' }
    : { construction: 'Chart construction', document: 'Document & output' }

  return (
    <>
      <div className="right-options-group-label">{groupLabels.construction}</div>

      <details ref={snappingPanelRef} className="right-panel-collapsible" data-testid="snapping-global-panel">
        <summary>{t.snapping}</summary>
        <section className="panel-section">
          <label className="toggle-row">
            <span><strong>{t.allowSnapping}</strong><small>{t.snappingHint}</small></span>
            <input
              type="checkbox"
              checked={snapping.enabled}
              onChange={(event) => onSnappingEnabledChange(event.target.checked)}
            />
          </label>

          <fieldset disabled={!snapping.enabled}>
            <legend>{t.snapPoint}</legend>
            <div className="segmented-control">
              {(['top', 'center', 'bottom'] as AnchorName[]).map((anchor) => (
                <button key={anchor} className={snapping.sourceAnchor === anchor ? 'active' : ''} onClick={() => onSourceAnchorChange(anchor)}>
                  {anchorLabels[anchor]}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset disabled={!snapping.enabled}>
            <legend>{t.orientation}</legend>
            <select value={snapping.orientationMode} onChange={(event) => onOrientationChange(event.target.value as OrientationMode)}>
              <option value="none">{t.keepCurrent}</option>
              <option value="along">{t.alongTarget}</option>
              <option value="perpendicular">{t.perpendicular}</option>
            </select>
          </fieldset>

          <label className="toggle-row compact-toggle">
            <span>{t.snapToVertices}</span>
            <input
              type="checkbox"
              checked={snapping.snapToVertices}
              disabled={!snapping.enabled}
              onChange={(event) => onSnapToVerticesChange(event.target.checked)}
            />
          </label>
          <label className="range-row">
            <span>{t.snapRadius} <strong>{snapping.tolerancePx}px</strong></span>
            <input
              type="range"
              min="6"
              max="32"
              step="2"
              value={snapping.tolerancePx}
              disabled={!snapping.enabled}
              onChange={(event) => onToleranceChange(Number(event.target.value))}
            />
          </label>
          <small className="snapping-corridor-note">
            {locale === 'ru'
              ? 'Направляющие имеют расширенную магнитную зону — их не нужно ловить пиксель в пиксель.'
              : 'Guides use a wider magnetic corridor, so you do not need pixel-perfect aiming.'}
          </small>
        </section>
      </details>

      <details ref={gaugePanelRef} className="right-panel-collapsible" data-testid="gauge-global-panel">
        <summary>{locale === 'ru' ? 'Плотность и размер' : 'Gauge & size'}</summary>
        <GaugeRulerPanel locale={locale} {...gaugePanelProps} />
      </details>

      <details ref={patternRowsPanelRef} className="right-panel-collapsible" data-testid="pattern-rows-global-panel">
        <summary>{locale === 'ru' ? 'Ряды узора' : 'Pattern rows'}</summary>
        <section className="panel-section">
          <PatternRowsPanel locale={locale} {...patternRowsPanelProps} />
        </section>
      </details>

      <details ref={rowMarkersPanelRef} className="right-panel-collapsible" data-testid="row-markers-global-panel">
        <summary>{locale === 'ru' ? 'Номера рядов' : 'Row numbers'}</summary>
        <section className="panel-section">
          <RowMarkersPanel locale={locale} {...rowMarkersPanelProps} />
        </section>
      </details>

      <div className="right-options-group-label">{groupLabels.document}</div>

      <details className="right-panel-collapsible" data-testid="background-global-panel">
        <summary>{locale === 'ru' ? 'Фоновое изображение' : 'Background image'}</summary>
        <BackgroundImagePanel locale={locale} {...backgroundPanelProps} />
      </details>

      <details ref={legendPanelRef} className="right-panel-collapsible" data-testid="legend-global-panel">
        <summary>{locale === 'ru' ? 'Легенда и холст' : 'Legend & canvas'}</summary>
        <LegendPanel locale={locale} {...legendPanelProps} />
      </details>

      <details ref={printPanelRef} className="right-panel-collapsible" data-testid="print-global-panel">
        <summary>{locale === 'ru' ? 'Печать по страницам' : 'Tiled print'}</summary>
        <PrintPanel locale={locale} {...printPanelProps} />
      </details>

      <details ref={helpPanelRef} className="right-panel-collapsible help-section" data-testid="help-global-panel">
        <summary>{t.controls}</summary>
        <section className="panel-section">
          <ul>
            <li>{t.help1}</li>
            <li>{t.help2}</li>
            <li>{t.help3}</li>
            <li>{t.help4}</li>
            <li>{t.help5}</li>
            <li>{t.help6}</li>
          </ul>
        </section>
      </details>
    </>
  )
}

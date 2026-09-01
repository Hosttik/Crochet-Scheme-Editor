import { createRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { emptyGaugeSettings } from '../editor/gauge'
import { RightOptionsPanels, type RightOptionsPanelsProps } from './RightOptionsPanels'

const noop = () => undefined

function createProps(locale: 'ru' | 'en' = 'en'): RightOptionsPanelsProps {
  return {
    locale,
    gaugePanelRef: createRef<HTMLDetailsElement>(),
    printPanelRef: createRef<HTMLDetailsElement>(),
    snappingPanelRef: createRef<HTMLDetailsElement>(),
    patternRowsPanelRef: createRef<HTMLDetailsElement>(),
    rowMarkersPanelRef: createRef<HTMLDetailsElement>(),
    legendPanelRef: createRef<HTMLDetailsElement>(),
    helpPanelRef: createRef<HTMLDetailsElement>(),
    backgroundPanelProps: {
      background: null,
      onUpload: noop,
      onChange: noop,
      onRemove: noop,
    },
    gaugePanelProps: {
      gauge: emptyGaugeSettings(),
      rulers: [],
      selectedRulerId: null,
      placingRuler: false,
      elements: [],
      selectedRowId: null,
      selectedRowIsCircular: false,
      onAddProfile: noop,
      onUpdateProfile: noop,
      onDeleteProfile: noop,
      onActiveProfileChange: noop,
      onToggleRulerTool: noop,
      onSelectRuler: noop,
      onUpdateRuler: noop,
      onDeleteRuler: noop,
    },
    printPanelProps: {
      bounds: { left: 0, top: 0, width: 100, height: 100 },
      legendBounds: null,
      onPrint: noop,
    },
    patternRowsPanelProps: {
      elements: [],
      selectedRowId: null,
      onSelect: noop,
      onCreateNext: noop,
      onCreateSequence: noop,
    },
    rowMarkersPanelProps: {
      markers: [],
      selectedId: null,
      nextNumber: 1,
      placing: false,
      onStartPlacement: noop,
      onSelect: noop,
      onChange: noop,
      onDelete: noop,
    },
    legendPanelProps: {
      elements: [],
      visible: true,
      onVisibleChange: noop,
    },
    snapping: {
      enabled: true,
      sourceAnchor: 'bottom',
      orientationMode: 'along',
      snapToVertices: true,
      tolerancePx: 12,
    },
    onSnappingEnabledChange: noop,
    onSourceAnchorChange: noop,
    onOrientationChange: noop,
    onSnapToVerticesChange: noop,
    onToleranceChange: noop,
  }
}

describe('right options panels', () => {
  it('keeps authoring properties separate from document settings while preserving panel contracts', () => {
    const markup = renderToStaticMarkup(<RightOptionsPanels {...createProps()} />)

    for (const testId of [
      'background-global-panel',
      'gauge-global-panel',
      'print-global-panel',
      'snapping-global-panel',
      'pattern-rows-global-panel',
      'row-markers-global-panel',
      'legend-global-panel',
      'help-global-panel',
    ]) {
      expect(markup).toContain(`data-testid="${testId}"`)
    }

    expect(markup).toContain('data-testid="right-properties-global"')
    expect(markup).toContain('data-testid="right-document-global"')
    expect(markup).toContain('Authoring')
    expect(markup).toContain('Construction')
    expect(markup).toContain('Appearance')
    expect(markup).toContain('Output')
    expect(markup).toContain('<summary>Background image</summary>')
    expect(markup).toContain('<summary>Gauge &amp; size</summary>')
    expect(markup).toContain('<summary>Tiled print</summary>')
    expect(markup).toContain('<summary>Pattern rows</summary>')
    expect(markup).toContain('<summary>Row numbers</summary>')
    expect(markup).toContain('<summary>Legend &amp; canvas</summary>')
    expect(markup).toContain('12px')

    expect(markup.indexOf('data-testid="snapping-global-panel"')).toBeLessThan(markup.indexOf('data-testid="gauge-global-panel"'))
    expect(markup.indexOf('data-testid="gauge-global-panel"')).toBeLessThan(markup.indexOf('data-testid="background-global-panel"'))
    expect(markup.indexOf('data-testid="background-global-panel"')).toBeLessThan(markup.indexOf('data-testid="print-global-panel"'))
  })

  it('localizes the new workspace groups in Russian', () => {
    const markup = renderToStaticMarkup(<RightOptionsPanels {...createProps('ru')} />)

    expect(markup).toContain('Рабочие настройки')
    expect(markup).toContain('Построение')
    expect(markup).toContain('Оформление')
    expect(markup).toContain('Вывод')
    expect(markup).toContain('<summary>Фоновое изображение</summary>')
    expect(markup).toContain('<summary>Плотность и размер</summary>')
    expect(markup).toContain('<summary>Печать по страницам</summary>')
    expect(markup).toContain('<summary>Ряды узора</summary>')
    expect(markup).toContain('<summary>Номера рядов</summary>')
    expect(markup).toContain('<summary>Легенда и холст</summary>')
  })
})

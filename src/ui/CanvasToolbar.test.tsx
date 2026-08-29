import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CanvasToolbar } from './CanvasToolbar'

const noop = () => undefined

describe('canvas toolbar', () => {
  it('preserves compact editor controls and their accessible names', () => {
    const markup = renderToStaticMarkup(
      <CanvasToolbar
        locale="ru"
        zoom={1.25}
        tool={{ type: 'pan' }}
        snappingEnabled
        orientationMode="along"
        zoomHint="Колесо — масштаб"
        canFitAll
        canFitSelection={false}
        onZoomOut={noop}
        onZoom100={noop}
        onZoomIn={noop}
        onFitAll={noop}
        onFitSelection={noop}
        onTogglePan={noop}
        onToggleLasso={noop}
        onToggleRuler={noop}
        onToggleSnapping={noop}
        onOrientationChange={noop}
      />,
    )

    expect(markup).toContain('class="canvas-toolbar"')
    expect(markup).toContain('aria-label="Уменьшить масштаб"')
    expect(markup).toContain('aria-label="Вместить всю схему"')
    expect(markup).toContain('aria-label="Ладонь / перемещение поля" aria-pressed="true"')
    expect(markup).toContain('aria-label="Ориентация при привязке"')
    expect(markup).toContain('>125%</button>')
    expect(markup).toContain('disabled=""')
  })
})
